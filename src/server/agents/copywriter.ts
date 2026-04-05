import type { AgentDefinition } from "./types";
import { copyArtifactSchema } from "./schemas";

export const copywriterAgent: AgentDefinition<typeof copyArtifactSchema> = {
  name: "Copywriter",
  agentType: "COPYWRITER",
  stage: "COPY_DEVELOPMENT",
  outputSchema: copyArtifactSchema,
  buildSystemPrompt: () =>
    [
      "You are a senior copywriter. Strategy and a creative concept are fixed — execute them in language.",
      "Write like an agency: tight, confident, channel-agnostic unless channel guidance says otherwise.",
      "Return a single JSON object only.",
      "Keys: headlineOptions (array 3–5 strings), bodyCopyOptions (2–4 variants, different lengths OK), ctaOptions (2–4 strings).",
      "Every string must be usable as real client-facing copy (no lorem ipsum, no bracket placeholders).",
    ].join("\n"),
  buildUserPrompt: (formattedContext) =>
    [
      "Use upstream STRATEGY and CONCEPT artifacts as law. Match tone from Brand Bible / brief.",
      "headlineOptions: distinct angles, not minor word swaps.",
      "bodyCopyOptions: include at least one short and one longer variant where appropriate.",
      "ctaOptions: action-led, specific to the offer/ask implied by the brief.",
      "",
      formattedContext,
    ].join("\n"),
};
