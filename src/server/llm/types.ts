export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type LlmCompletionOptions = {
  /** Max tokens for the assistant reply (provider-specific caps apply). */
  maxTokens?: number;
  /** When true, OpenAI uses JSON mode; Anthropic relies on prompt discipline. */
  jsonMode?: boolean;
};

export type LlmCompletionResult = {
  text: string;
  providerId: string;
  model: string;
};

export type LlmProvider = {
  readonly id: "openai" | "anthropic";
  readonly model: string;
  complete(
    messages: ChatMessage[],
    options?: LlmCompletionOptions,
  ): Promise<LlmCompletionResult>;
};
