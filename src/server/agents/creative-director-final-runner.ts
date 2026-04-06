import { z } from "zod";
import { extractJsonObject } from "@/server/llm/extract-json";
import { getLlmProvider } from "@/server/llm/get-provider";
import {
  creativeDirectorFinalOutputSchema,
  type CreativeDirectorDecisionPersisted,
} from "@/lib/artifacts/creative-director-final-schema";
import {
  repairJsonWithProvider,
  summarizeZodError,
} from "@/server/agents/repair-json";
import { creativeDirectorFinalAgent } from "./creative-director-final";
import { loadExportFinalContext } from "./export-final-context";
import type { AgentPromptOptions } from "./types";

function emptyCanonOptions(): AgentPromptOptions {
  return {
    canonUserSection:
      "## Creative Canon\nNot used for final CD — judgment is holistic from the packet.",
    selectedFrameworkIds: [],
  };
}

export async function runCreativeDirectorFinalForExportTask(
  taskId: string,
): Promise<
  | {
      ok: true;
      output: z.infer<typeof creativeDirectorFinalOutputSchema>;
      providerId: string;
      model: string;
    }
  | { ok: false; error: string }
> {
  const provider = getLlmProvider();
  if (!provider) {
    return { ok: false, error: "No LLM provider configured." };
  }

  const { packetJson } = await loadExportFinalContext(taskId);
  const promptOptions = emptyCanonOptions();
  const system = creativeDirectorFinalAgent.buildSystemPrompt(promptOptions);
  const user = creativeDirectorFinalAgent.buildUserPrompt(
    "```json\n" + packetJson + "\n```",
    promptOptions,
  );

  const shapeHint = `{
  "finalVerdict": "APPROVE" | "REWORK",
  "selectedVisualAssetId": string | null,
  "selectedCopyVariant": string,
  "rationale": string (min 80 chars),
  "improvementDirectives": string[] (min 1)
}`;

  const useJsonMode = provider.id === "openai";
  const first = await provider.complete(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { maxTokens: 2500, jsonMode: useJsonMode },
  );

  const parse = (text: string) => {
    try {
      return creativeDirectorFinalOutputSchema.safeParse(
        JSON.parse(extractJsonObject(text)),
      );
    } catch {
      return creativeDirectorFinalOutputSchema.safeParse(null);
    }
  };

  let v = parse(first.text);
  if (!v.success) {
    const repair = await repairJsonWithProvider(
      provider,
      first.text,
      shapeHint,
      summarizeZodError(v.error),
      2500,
    );
    v = parse(repair.text);
  }

  if (!v.success) {
    return {
      ok: false,
      error: `Creative Director final JSON invalid: ${summarizeZodError(v.error)}`,
    };
  }

  return {
    ok: true,
    output: v.data,
    providerId: provider.id,
    model: provider.model,
  };
}

export function buildCreativeDirectorDecisionPersisted(
  output: z.infer<typeof creativeDirectorFinalOutputSchema>,
  opts?: { finalPass?: boolean },
): CreativeDirectorDecisionPersisted {
  return {
    verdict: output.finalVerdict,
    rationale: output.rationale,
    selectedAssets: {
      visualAssetId: output.selectedVisualAssetId,
      copyVariant: output.selectedCopyVariant,
    },
    improvementDirectives: output.improvementDirectives,
    finalPass: opts?.finalPass,
  };
}
