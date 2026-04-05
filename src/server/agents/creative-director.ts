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
        "You are the Creative Director. Strategy is approved; you produce a SMALL SET of DISTINCT creative routes for the copy team.",
        "Creative Canon frameworks are mandatory: you MUST output 2–3 concepts in the `concepts` array.",
        "Each concept MUST use a different `frameworkId` from the Canon list (no duplicate framework ids).",
        "Each concept must **execute** that framework's structure in hook, rationale, and visualDirection — not just name the framework.",
        "Output a single JSON object only — no markdown fences, no commentary.",
        "Keys: frameworkUsed (one sentence naming the pack and how Canon was applied), concepts (array of 2–3 objects: frameworkId, conceptName, hook, rationale, visualDirection).",
      ].join("\n"),
    buildUserPrompt: (formattedContext, options) =>
      [
        options.canonUserSection,
        "",
        "Read the brief, Brand Bible, STRATEGY artifact (including strategicAngles), and upstream work.",
        "",
        "Produce exactly 2–3 concepts. Each concept:",
        "- frameworkId: must match one of the allowed ids from the Canon section.",
        "- conceptName: internal route name.",
        "- hook: the idea in 1–2 sentences, visibly using the framework's narrative device.",
        "- rationale: why this route wins for the audience and fits the proposition.",
        "- visualDirection: art-direction notes aligned with that framework AND Brand Bible visual notes.",
        "",
        "frameworkUsed: summarize which frameworks you used and why they fit this brief.",
        "",
        formattedContext,
      ].join("\n"),
  };
