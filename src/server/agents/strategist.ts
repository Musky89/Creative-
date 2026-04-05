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
      "Be specific, non-generic, and actionable. No buzzword soup.",
      "You must respond with a single JSON object only — no markdown, no preamble.",
      "The JSON must match exactly these keys: objective, audience, insight, proposition, messagePillars (array of strings, 3–5 strong pillars).",
    ].join("\n"),
  buildUserPrompt: (formattedContext) =>
    [
      "Using the context below, produce the strategy JSON.",
      "",
      "Requirements:",
      "- objective: one sharp sentence on what we must achieve commercially and reputationally.",
      "- audience: who we are really talking to (behaviors, tensions, not demographics alone).",
      "- insight: the human truth or category tension the work exploits.",
      "- proposition: single-minded claim the creative must prove.",
      "- messagePillars: 3–5 pillars; each a short phrase the downstream team can execute.",
      "",
      "Honor Brand Bible constraints. If Brand Bible is missing, infer carefully from the brief and flag no invented facts.",
      "",
      formattedContext,
    ].join("\n"),
};
