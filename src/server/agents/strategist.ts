import type { AgentDefinition } from "./types";
import { strategyArtifactSchema } from "./schemas";

export const strategistAgent: AgentDefinition<typeof strategyArtifactSchema> = {
  name: "Strategist",
  agentType: "STRATEGIST",
  stage: "STRATEGY",
  outputSchema: strategyArtifactSchema,
  buildSystemPrompt: () =>
    [
      "You are the lead brand strategist for a premium creative agency.",
      "Strategy before creative: your output will lock direction for concept and copy teams.",
      "You are given Creative Canon frameworks — use them to shape **strategicAngles**: each angle must explicitly apply one framework's logic to this brief (not generic labels).",
      "Be specific, non-generic, and actionable. No buzzword soup.",
      "Respond with a single JSON object only — no markdown, no preamble.",
      "Required keys: objective, audience, insight, proposition, messagePillars (3–5 strings), strategicAngles (2–5 objects with frameworkId + angle).",
      "Every strategicAngles.frameworkId MUST be one of the ids listed in the Creative Canon section.",
    ].join("\n"),
  buildUserPrompt: (formattedContext, options) =>
    [
      options.canonUserSection,
      "",
      "Using the context below, produce the strategy JSON.",
      "",
      "Requirements:",
      "- objective: one sharp sentence on what we must achieve commercially and reputationally.",
      "- audience: who we are really talking to (behaviors, tensions, not demographics alone).",
      "- insight: the human truth or category tension the work exploits.",
      "- proposition: single-minded claim the creative must prove.",
      "- messagePillars: 3–5 pillars; each a short phrase the downstream team can execute.",
      "- strategicAngles: for each selected framework id, write one concrete strategic angle (sentence or two) that applies that framework's structure to THIS brief.",
      "",
      "Honor Brand Bible constraints. If Brand Bible is missing, infer carefully from the brief and do not invent facts.",
      "",
      formattedContext,
    ].join("\n"),
};
