import type { LlmProvider } from "./types";

type OpenAiResponse = {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
};

export function createOpenAiProvider(apiKey: string, model: string): LlmProvider {
  return {
    id: "openai",
    model,
    async complete(messages, options) {
      const body: Record<string, unknown> = {
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.4,
      };
      if (options?.maxTokens != null) {
        body.max_tokens = options.maxTokens;
      }
      if (options?.jsonMode) {
        body.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as OpenAiResponse;
      if (!res.ok) {
        throw new Error(
          data.error?.message ?? `OpenAI HTTP ${res.status}`,
        );
      }
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text) {
        throw new Error("OpenAI returned empty content.");
      }
      return { text, providerId: "openai", model };
    },
  };
}
