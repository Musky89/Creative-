import {
  BRAND_OS_COPYWRITER_EXTRA,
  BRAND_OS_MANDATORY_RULES,
} from "./brand-os-instructions";
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
      BRAND_OS_MANDATORY_RULES,
      BRAND_OS_COPYWRITER_EXTRA,
      "Return a single JSON object only.",
      "Keys: frameworkUsed (preferred: the primary frameworkId from the chosen concept route you are executing — string), headlineOptions (3–5), bodyCopyOptions (2–4), ctaOptions (2–4).",
      "If multiple routes appear, execute **only** the winner: `isSelected: true` or `_agenticforceSelection.winnerConceptId` — ignore `isRejected` routes.",
      "Every string must be usable as real client-facing copy (no lorem ipsum, no bracket placeholders).",
    ].join("\n"),
  buildUserPrompt: (formattedContext, options) =>
    [
      options.canonUserSection,
      "",
      "Use upstream STRATEGY and CONCEPT as law. Execute the **selected** concept route only (winner) consistently across all copy fields.",
      "Let the Canon framework for that route shape rhythm and emphasis (e.g. Problem Agitation → lead with tension; Authority → lead with proof).",
      "All copy must reflect Brand OS **vocabularyStyle**, **sentenceStyle**, **preferredPhrases** / **signaturePatterns** where natural, and must never use **bannedPhrases**.",
      "headlineOptions: distinct angles, not minor word swaps.",
      "bodyCopyOptions: include at least one short and one longer variant where appropriate.",
      "ctaOptions: action-led, specific to the offer/ask implied by the brief.",
      "",
      formattedContext,
    ].join("\n"),
};
