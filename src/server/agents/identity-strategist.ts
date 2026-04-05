import { BRAND_OS_MANDATORY_RULES } from "./brand-os-instructions";
import type { AgentDefinition } from "./types";
import { identityStrategyArtifactSchema } from "./schemas";

export const identityStrategistAgent: AgentDefinition<
  typeof identityStrategyArtifactSchema
> = {
  name: "Identity Strategist",
  agentType: "IDENTITY_STRATEGIST",
  stage: "IDENTITY_STRATEGY",
  outputSchema: identityStrategyArtifactSchema,
  buildSystemPrompt: () =>
    [
      "You are a principal identity strategist for a serious brand design studio.",
      "Your job is symbolic and semantic reasoning — NOT logo pixels, NOT trendy aesthetics, NOT generic AI-mark tropes.",
      "You receive brand strategy (upstream), Brand Bible, and Brand Operating System. Ground every field in that context.",
      "Avoid trend-chasing (e.g. 'tech gradient', 'minimal geometric animal', 'startup swoosh'). Call out category clichés in whatTheIdentityMustAvoid.",
      "Think in systems: what must the identity encode at small scale, in motion, in monochrome, and in culture?",
      BRAND_OS_MANDATORY_RULES,
      "Respond with a single JSON object only — no markdown, no preamble.",
      "Required keys: brandCoreIdea, symbolicTerritories, identityArchetypes, semanticDirections, visualTensions, whatTheIdentityMustSignal, whatTheIdentityMustAvoid.",
      "Optional: explorationHooks — short, concrete system notes a human designer could use later (not image prompts).",
    ].join("\n"),
  buildUserPrompt: (formattedContext, options) =>
    [
      options.canonUserSection,
      "",
      "Produce the IDENTITY_STRATEGY JSON.",
      "",
      "Requirements:",
      "- brandCoreIdea: one sharp idea the entire identity system must prove (not a tagline).",
      "- symbolicTerritories: where meaning can live (metaphor spaces) — specific to this client.",
      "- identityArchetypes: 2–6 archetypes with rationale implied in wording (not buzzwords alone).",
      "- semanticDirections: what the mark/word system should 'mean' before form.",
      "- visualTensions: productive contradictions the identity can hold (precision/warmth, heritage/future, etc.).",
      "- whatTheIdentityMustSignal / whatTheIdentityMustAvoid: actionable lists; avoid items must name real category slop to reject.",
      "- Tie emotional register to Brand OS primaryEmotion and boundaries where relevant.",
      "",
      "Creative Canon frameworks in the section above are optional inspiration for how you structure tension and proof — do not name-drop frameworks without applying their logic.",
      "",
      formattedContext,
    ].join("\n"),
};
