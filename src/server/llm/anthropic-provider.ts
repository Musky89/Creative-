import { logProviderCall } from "@/server/observability/provider-observability";
import type { ChatMessage, LlmProvider } from "./types";

type AnthropicResponse = {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
};

/**
 * Maps mixed-role messages to Anthropic system + user blocks.
 */
function toAnthropicMessages(messages: ChatMessage[]): {
  system: string | undefined;
  userBlocks: string;
} {
  const systemParts: string[] = [];
  const conversation: string[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
    } else {
      conversation.push(`${m.role.toUpperCase()}:\n${m.content}`);
    }
  }
  return {
    system: systemParts.length ? systemParts.join("\n\n") : undefined,
    userBlocks: conversation.join("\n\n---\n\n"),
  };
}

export function createAnthropicProvider(
  apiKey: string,
  model: string,
): LlmProvider {
  return {
    id: "anthropic",
    model,
    async complete(messages, options) {
      const { system, userBlocks } = toAnthropicMessages(messages);
      const body: Record<string, unknown> = {
        model,
        max_tokens: options?.maxTokens ?? 4096,
        messages: [{ role: "user", content: userBlocks }],
      };
      if (system) {
        body.system = system;
      }

      const t0 = Date.now();
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as AnthropicResponse;
      if (!res.ok) {
        const err = data.error?.message ?? `Anthropic HTTP ${res.status}`;
        logProviderCall({
          kind: "anthropic_messages",
          providerId: "anthropic",
          model,
          durationMs: Date.now() - t0,
          ok: false,
          error: err,
        });
        throw new Error(err);
      }
      const text =
        data.content?.map((c) => (c.type === "text" ? c.text ?? "" : "")).join(
          "",
        ) ?? "";
      if (!text.trim()) {
        const err = "Anthropic returned empty content.";
        logProviderCall({
          kind: "anthropic_messages",
          providerId: "anthropic",
          model,
          durationMs: Date.now() - t0,
          ok: false,
          error: err,
        });
        throw new Error(err);
      }
      logProviderCall({
        kind: "anthropic_messages",
        providerId: "anthropic",
        model,
        durationMs: Date.now() - t0,
        ok: true,
      });
      return { text, providerId: "anthropic", model };
    },
  };
}
