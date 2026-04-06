import type { z } from "zod";
import type { LlmProvider } from "@/server/llm/types";

const REPAIR_SYSTEM = `You are a strict JSON repair assistant for a production workflow.
You receive invalid or partial JSON and a Zod validation error summary.
Output ONE valid JSON object that satisfies the schema described in the user message.
Rules:
- Output ONLY the JSON object, no markdown fences, no commentary.
- Preserve the author's intent where possible; fix structure and types only.
- Use the exact property names requested.
- Arrays must be non-empty where the schema requires min length.`;

/**
 * Single repair pass: ask model to emit schema-conformant JSON.
 */
export async function repairJsonWithProvider(
  provider: LlmProvider,
  invalidRaw: string,
  schemaDescription: string,
  zodErrorSummary: string,
): Promise<{ text: string }> {
  const user = [
    "## Required JSON shape",
    schemaDescription,
    "",
    "## Validation errors",
    zodErrorSummary,
    "",
    "## Model output to repair (may be truncated)",
    invalidRaw.slice(0, 24_000),
  ].join("\n");

  const useJsonMode = provider.id === "openai";
  return provider.complete(
    [
      { role: "system", content: REPAIR_SYSTEM },
      { role: "user", content: user },
    ],
    { maxTokens: 4096, jsonMode: useJsonMode },
  );
}

export function summarizeZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 12)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}
