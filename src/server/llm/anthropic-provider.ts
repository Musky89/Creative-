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
        throw new Error(
          data.error?.message ?? `Anthropic HTTP ${res.status}`,
        );
      }
      const text =
        data.content?.map((c) => (c.type === "text" ? c.text ?? "" : "")).join(
          "",
        ) ?? "";
      if (!text.trim()) {
        throw new Error("Anthropic returned empty content.");
      }
      return { text, providerId: "anthropic", model };
    },
  };
}
