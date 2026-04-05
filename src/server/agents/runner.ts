import type { WorkflowStage } from "@/generated/prisma/client";
import { z } from "zod";
import { buildCreativeCanonUserSection } from "@/server/canon/prompt-section";
import { selectFrameworksForTask } from "@/server/canon/select-frameworks";
import { extractJsonObject } from "@/server/llm/extract-json";
import { getLlmProvider } from "@/server/llm/get-provider";
import { formatContextForPrompt, loadTaskAgentContext } from "./context";
import { getAgentForStage, getArtifactShapeHint } from "./registry";
import {
  assessPrePersistQuality,
  buildRegenerationUserPrompt,
  mergeDeterministicIssues,
  shouldRegenerate,
  stageUsesQualityLoop,
  type QualityLoopStage,
} from "./quality-loop";
import {
  repairJsonWithProvider,
  summarizeZodError,
} from "./repair-json";
import type { AgentExecutionResult, AgentPromptOptions } from "./types";

function stripInternalKeys(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const k of Object.keys(out)) {
    if (k.startsWith("_")) delete out[k];
  }
  return out;
}

function parseAndValidate(
  rawText: string,
  schema: z.ZodTypeAny,
):
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: z.ZodError } {
  const slice = extractJsonObject(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch (e) {
    return {
      ok: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
        },
      ]),
    };
  }
  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, error: validated.error };
  }
  return { ok: true, data: validated.data as Record<string, unknown> };
}

async function runGenerationWithRepair(
  provider: NonNullable<ReturnType<typeof getLlmProvider>>,
  agent: NonNullable<ReturnType<typeof getAgentForStage>>,
  system: string,
  user: string,
  shapeHint: string,
  promptOptions: AgentPromptOptions,
  useJsonMode: boolean,
): Promise<AgentExecutionResult> {
  const first = await provider.complete(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { maxTokens: 4096, jsonMode: useJsonMode },
  );
  const primaryRaw = first.text;
  const firstVal = parseAndValidate(primaryRaw, agent.outputSchema);

  if (firstVal.ok) {
    return {
      ok: true,
      content: {
        ...firstVal.data,
        _creativeCanonFrameworkIds: [...promptOptions.selectedFrameworkIds],
      },
      providerId: first.providerId,
      model: first.model,
      rawText: primaryRaw,
      generationPath: "primary",
      repaired: false,
    };
  }

  const repairResult = await repairJsonWithProvider(
    provider,
    primaryRaw,
    shapeHint,
    summarizeZodError(firstVal.error),
  );
  const secondVal = parseAndValidate(repairResult.text, agent.outputSchema);
  if (secondVal.ok) {
    return {
      ok: true,
      content: {
        ...secondVal.data,
        _creativeCanonFrameworkIds: [...promptOptions.selectedFrameworkIds],
      },
      providerId: provider.id,
      model: provider.model,
      rawText: repairResult.text,
      generationPath: "repair",
      repaired: true,
    };
  }

  return {
    ok: false,
    error: `Repair validation failed: ${summarizeZodError(secondVal.error)}`,
    partialMeta: {
      primaryParseFailed: true,
      repairAttempted: true,
      providerId: provider.id,
      model: provider.model,
      creativeCanonFrameworkIds: promptOptions.selectedFrameworkIds,
    },
  };
}

/**
 * Runs the v1 agent: primary → JSON repair if needed → optional quality loop (strategy/concept/copy) → one regeneration max.
 */
export async function executeAgentForTask(
  taskId: string,
  stage: WorkflowStage,
): Promise<AgentExecutionResult> {
  const provider = getLlmProvider();
  if (!provider) {
    return {
      ok: false,
      error: "No LLM provider configured (set OPENAI_API_KEY or ANTHROPIC_API_KEY).",
    };
  }

  const agent = getAgentForStage(stage);
  if (!agent) {
    return { ok: false, error: `No agent registered for stage ${stage}.` };
  }

  const { context } = await loadTaskAgentContext(taskId);
  const contextBlock = formatContextForPrompt(context);
  const frameworks = await selectFrameworksForTask(stage, context);
  const canonUserSection = buildCreativeCanonUserSection(frameworks);
  const promptOptions: AgentPromptOptions = {
    canonUserSection,
    selectedFrameworkIds: frameworks.map((f) => f.id),
  };

  const system = agent.buildSystemPrompt(promptOptions);
  const user = agent.buildUserPrompt(contextBlock, promptOptions);
  const shapeHint = getArtifactShapeHint(stage);
  const useJsonMode = provider.id === "openai";

  try {
    const gen = await runGenerationWithRepair(
      provider,
      agent,
      system,
      user,
      shapeHint,
      promptOptions,
      useJsonMode,
    );

    if (!gen.ok) {
      return gen;
    }

    if (!stageUsesQualityLoop(stage)) {
      return gen;
    }

    const qStage = stage as QualityLoopStage;
    const stripped = stripInternalKeys(gen.content);
    const brandBanned =
      context.brand?.operatingSystem.bannedPhrases ?? [];
    const det = mergeDeterministicIssues(qStage, stripped, brandBanned);
    const llmQ = await assessPrePersistQuality(
      provider,
      qStage,
      stripped,
      contextBlock,
      canonUserSection,
    );
    const wantRegen = shouldRegenerate(llmQ, det.recommend);

    const qualityBase = {
      prePersistQuality: llmQ,
      deterministicIssues: det.issues,
      regenerationAttempted: wantRegen,
      regenerationTriggered: false,
      jsonRepairPath: gen.generationPath,
      qualityVerdictSummary: llmQ.qualityVerdict,
    };

    if (!wantRegen) {
      return {
        ...gen,
        content: {
          ...gen.content,
          _agenticforceQuality: qualityBase,
        },
      };
    }

    const critique = [...det.issues, ...llmQ.regenerationReasons].join("\n");
    const mustPreserve =
      "Output MUST match the same JSON schema as this stage. Honor Brand Bible, Brand Operating System (banned phrases, vocabulary/sentence style, emotional boundaries), brief, and upstream artifacts. Apply Creative Canon visibly — no generic marketing filler. For CONCEPTING: concepts must use different frameworkIds, include whyItWorksForBrand per route, and be clearly distinct.";

    const regenUser = buildRegenerationUserPrompt({
      stage: qStage,
      formattedContext: contextBlock,
      canonSection: canonUserSection,
      previousArtifact: stripped,
      critique,
      mustPreserve,
    });

    const regen = await runGenerationWithRepair(
      provider,
      agent,
      system,
      regenUser,
      shapeHint,
      promptOptions,
      useJsonMode,
    );

    if (!regen.ok) {
      return {
        ...gen,
        content: {
          ...gen.content,
          _agenticforceQuality: {
            ...qualityBase,
            regenerationTriggered: false,
            regenerationError: regen.error,
            note: "Regeneration failed; founder sees first passing draft.",
          },
        },
      };
    }

    const stripped2 = stripInternalKeys(regen.content);
    const det2 = mergeDeterministicIssues(qStage, stripped2, brandBanned);
    const llmQ2 = await assessPrePersistQuality(
      provider,
      qStage,
      stripped2,
      contextBlock,
      canonUserSection,
    );
    const stillWeak =
      shouldRegenerate(llmQ2, det2.recommend) || llmQ2.qualityVerdict === "WEAK";

    return {
      ...regen,
      content: {
        ...regen.content,
        _agenticforceQuality: {
          ...qualityBase,
          regenerationTriggered: true,
          postRegenQuality: llmQ2,
          postRegenDeterministicIssues: det2.issues,
          stillWeakAfterRegen: stillWeak,
          note: stillWeak
            ? "Second pass still flagged weak; best available output retained with transparency."
            : "Regeneration pass accepted.",
        },
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg,
      partialMeta: {
        providerId: provider.id,
        model: provider.model,
        creativeCanonFrameworkIds: promptOptions.selectedFrameworkIds,
      },
    };
  }
}
