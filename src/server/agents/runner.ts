import type { WorkflowStage } from "@/generated/prisma/client";
import { extractJsonObject } from "@/server/llm/extract-json";
import { getLlmProvider } from "@/server/llm/get-provider";
import { formatContextForPrompt, loadTaskAgentContext } from "./context";
import { getAgentForStage } from "./registry";
import type { AgentExecutionResult } from "./types";

/**
 * Runs the v1 agent for a workflow stage: LLM → JSON extract → Zod validate.
 * Returns failure when no provider, LLM error, or invalid JSON/shape.
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

  let rawText: string;
  try {
    const useJsonMode = provider.id === "openai";
    const result = await provider.complete(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { maxTokens: 4096, jsonMode: useJsonMode },
    );
    rawText = result.text;
    const slice = extractJsonObject(rawText);
    const parsed: unknown = JSON.parse(slice);
    const validated = agent.outputSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: `Schema validation failed: ${validated.error.message}`,
      };
    }
    const content = validated.data as Record<string, unknown>;
    return {
      ok: true,
      content,
      providerId: result.providerId,
      model: result.model,
      rawText,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
