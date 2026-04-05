import type { WorkflowStage } from "@/generated/prisma/client";
import { z } from "zod";
import { extractJsonObject } from "@/server/llm/extract-json";
import { getLlmProvider } from "@/server/llm/get-provider";
import { formatContextForPrompt, loadTaskAgentContext } from "./context";
import { getAgentForStage, getArtifactShapeHint } from "./registry";
import {
  repairJsonWithProvider,
  summarizeZodError,
} from "./repair-json";
import type { AgentExecutionResult } from "./types";

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

/**
 * Runs the v1 agent: primary LLM → validate → optional single repair pass → validate.
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

  const system = agent.buildSystemPrompt();
  const user = agent.buildUserPrompt(contextBlock);
  const shapeHint = getArtifactShapeHint(stage);

  const useJsonMode = provider.id === "openai";

  try {
    const first = await provider.complete(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { maxTokens: 4096, jsonMode: useJsonMode },
    );
    const primaryRaw = first.text;

    const firstVal = parseAndValidate(primaryRaw, agent.outputSchema);
    if (firstVal.ok) {
      return {
        ok: true,
        content: firstVal.data,
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
        content: secondVal.data,
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
      },
    };
  }
}
