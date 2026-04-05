import { createAnthropicProvider } from "./anthropic-provider";
import { createOpenAiProvider } from "./openai-provider";
import type { LlmProvider } from "./types";

/**
 * Resolves the active LLM provider from environment.
 *
 * - `LLM_PROVIDER` = `openai` | `anthropic` | `auto` (default auto)
 * - `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
 * - `OPENAI_MODEL` (default gpt-4o-mini), `ANTHROPIC_MODEL` (default Claude 3.5 Haiku)
 *
 * Returns null when no usable provider is configured → orchestrator uses placeholder artifacts.
 */
export function getLlmProvider(): LlmProvider | null {
  const mode = (process.env.LLM_PROVIDER ?? "auto").toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openaiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const anthropicModel =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022";

  const pickOpenai = () =>
    openaiKey ? createOpenAiProvider(openaiKey, openaiModel) : null;
  const pickAnthropic = () =>
    anthropicKey ? createAnthropicProvider(anthropicKey, anthropicModel) : null;

  if (mode === "openai") {
    return pickOpenai();
  }
  if (mode === "anthropic") {
    return pickAnthropic();
  }

  const o = pickOpenai();
  if (o) return o;
  return pickAnthropic();
}
