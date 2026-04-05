import type { AgentDefinition } from "./types";
import { conceptArtifactSchema } from "./schemas";

export const creativeDirectorAgent: AgentDefinition<typeof conceptArtifactSchema> =
  {
    name: "Creative Director",
    agentType: "CREATIVE_DIRECTOR",
    stage: "CONCEPTING",
    outputSchema: conceptArtifactSchema,
    buildSystemPrompt: () =>
      [
        "You are the Creative Director. Strategy is already approved; you translate it into a campaign-level creative direction.",
        "Premium agency standard: one cohesive concept, not a brainstorm list.",
        "Output must be a single JSON object only — no markdown fences, no commentary.",
        "Keys: conceptName, hook, rationale, visualDirection (all strings).",
      ].join("\n"),
    buildUserPrompt: (formattedContext) =>
      [
        "Read the brief, Brand Bible, and the STRATEGY artifact in upstream work.",
        "Propose one named concept that the copy team can execute.",
        "",
        "- conceptName: memorable internal name.",
        "- hook: the core idea in one or two sentences.",
        "- rationale: why this wins for the audience and fits the proposition (3–5 sentences max).",
        "- visualDirection: practical art-direction notes (mood, references, what to avoid) aligned with Brand Bible visual notes.",
        "",
        formattedContext,
      ].join("\n"),
  };
