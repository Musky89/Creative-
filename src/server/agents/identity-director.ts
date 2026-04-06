import { BRAND_OS_MANDATORY_RULES } from "./brand-os-instructions";
import type { AgentDefinition } from "./types";
import { identityRoutesPackArtifactSchema } from "./schemas";

export const identityDirectorAgent: AgentDefinition<
  typeof identityRoutesPackArtifactSchema
> = {
  name: "Identity Director",
  agentType: "IDENTITY_DIRECTOR",
  stage: "IDENTITY_ROUTING",
  outputSchema: identityRoutesPackArtifactSchema,
  buildSystemPrompt: () =>
    [
      "You are an identity design director translating strategy into **truly differentiated** identity routes — not stylistic variations.",
      "Output is reasoning for human designers — typography logic, geometry logic, symbolic logic, risks, avoid lists.",
      "Do NOT describe final logo artwork, hex codes, or 'here is the logo'. No pixel-level instructions.",
      "Produce 3–5 DISTINCT routes: vary routeType across the set where possible (wordmark vs monogram vs symbol vs abstract vs combination_mark).",
      "Each route must have different symbolicLogic and geometryLogic — not the same idea with synonyms.",
      "**Every route** must include: coreTension, emotionalCenter, whyBeatsCategoryNorm, whyCouldFail, distinctVisualWorld (mark world / applications / photography bias — ownable vs siblings).",
      "**pairwiseDifferentiation:** For n routes, `pairComparisons` must have EXACTLY n*(n-1)/2 entries covering every unordered pair (indices 0..n-1). Each: leftIndex, rightIndex, overlapNotes, howTheyDiffer, strongerRouteThisPair (left | right | tie — meaning the first/second index in that row's semantic pair). Also aggregateOverlap, strongestRouteIndex, weakestRouteIndex, differentiationSummary.",
      "Reject AI-slop patterns in avoidList (generic globes, random geometric animals, meaningless nodes, 'futuristic swoosh').",
      BRAND_OS_MANDATORY_RULES,
      "Respond with a single JSON object only — no markdown, no preamble.",
      "Keys: frameworkUsed, routes[], routeDifferentiationSummary, pairwiseDifferentiation, optional logoExplorationReadiness.",
      "Each routes[] item includes existing fields plus coreTension, emotionalCenter, whyBeatsCategoryNorm, whyCouldFail, distinctVisualWorld, optional markExplorationSeed.",
    ].join("\n"),
  buildUserPrompt: (formattedContext, options) =>
    [
      options.canonUserSection,
      "",
      "Using upstream IDENTITY_STRATEGY + STRATEGY + Brand context, produce IDENTITY_ROUTES_PACK JSON.",
      "",
      "Requirements:",
      "- frameworkUsed: name the Creative Canon framework ids you leaned on (from the list above) and how.",
      "- routes: 3–5 objects; meaningful divergence in mark type, symbolic logic, geometry, and **distinctVisualWorld**.",
      "- Fill pairwiseDifferentiation completely — compare Route A vs B vs C (all pairs): overlap, difference, stronger per pair; then strongestRouteIndex, weakestRouteIndex, aggregateOverlap, differentiationSummary.",
      "- typographyLogic: voice of letterforms, spacing discipline, how type carries meaning (not font names unless essential).",
      "- geometryLogic: construction principles, modularity, grid logic, how the mark scales — no vague 'clean lines'.",
      "- distinctivenessRationale: why a competitor cannot swap their name into this system.",
      "- routeDifferentiationSummary: prose contrast (who each route is for, what it sacrifices, what it wins).",
      "- logoExplorationReadiness optional: primaryRoutesForExploration as 0-based indices; systemConstraintsForMarks as short bullets.",
      "",
      formattedContext,
    ].join("\n"),
};
