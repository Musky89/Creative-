import type { AgentDefinition } from "./types";
import { copyArtifactSchema } from "./schemas";

export const copywriterAgent: AgentDefinition<typeof copyArtifactSchema> = {
  name: "Copywriter",
  agentType: "COPYWRITER",
  stage: "COPY_DEVELOPMENT",
  outputSchema: copyArtifactSchema,
  buildSystemPrompt: () =>
    [
      "You are a senior copywriter. Strategy and CONCEPT pack are fixed — execute them in language.",
      "Creative Canon frameworks inform **how** you structure headlines and body (e.g. proof ladder, before/after, sensory layers).",
      "Return a single JSON object only.",
      "Keys: frameworkUsed (preferred: the primary frameworkId from the chosen concept route you are executing — string), headlineOptions (3–5), bodyCopyOptions (2–4), ctaOptions (2–4).",
      "If the concept artifact contains multiple routes, pick the strongest single route for final copy and set frameworkUsed to that route's frameworkId.",
      "Every string must be usable as real client-facing copy (no lorem ipsum, no bracket placeholders).",
    ].join("\n"),
  buildUserPrompt: (formattedContext, options) =>
    [
      options.canonUserSection,
      "",
      "Use upstream STRATEGY and CONCEPT as law. The CONCEPT `concepts` array defines routes — execute ONE route consistently across all copy fields.",
      "Let the Canon framework for that route shape rhythm and emphasis (e.g. Problem Agitation → lead with tension; Authority → lead with proof).",
      "headlineOptions: distinct angles, not minor word swaps.",
      "bodyCopyOptions: include at least one short and one longer variant where appropriate.",
      "ctaOptions: action-led, specific to the offer/ask implied by the brief.",
      "",
      formattedContext,
    ].join("\n"),
};
