import {
  BRAND_OS_MANDATORY_RULES,
  BRAND_OS_STRATEGIST_EXTRA,
} from "./brand-os-instructions";
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
      BRAND_OS_MANDATORY_RULES,
      BRAND_OS_STRATEGIST_EXTRA,
      "**Brand memory:** If context includes BRAND MEMORY — LEARNED PREFERENCES, lean strategicAngles toward frameworks that historically worked for this client, while still including at least one fresh angle.",
      "Be specific, non-generic, and actionable. No buzzword soup.",
      "Respond with a single JSON object only — no markdown, no preamble.",
      "Required keys: objective, audience, insight, proposition, messagePillars (3–5 strings), **campaignCore** (singleLineIdea, emotionalTension, visualNarrative — substantive, interconnected, same story as proposition), strategicAngles **exactly 3** objects (frameworkId + angle) — one per listed Canon framework id.",
      "Every strategicAngles.frameworkId MUST be one of the ids listed in the Creative Canon section (use each listed id exactly once).",
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
      "- proposition: single-minded claim the creative must prove — align with Brand OS vocabulary and emotional profile.",
      "- messagePillars: 3–5 pillars; each a short phrase the downstream team can execute.",
      "- campaignCore: **one campaign spine** for the whole job —",
      "  • singleLineIdea: one sharp line — the creative idea every concept, headline, and frame will prove (not a tagline fluff; concrete).",
      "  • emotionalTension: the productive feeling conflict (e.g. craving vs restraint) that copy and visuals must carry.",
      "  • visualNarrative: how the story moves in pictures (setting, arc, hero moment) — must match the idea and tension.",
      "- strategicAngles: **exactly three** entries — one per framework id in the Canon section — each a concrete angle (sentence or two) applying that framework to THIS brief; all three must still orbit **campaignCore**.",
      "",
      "Honor Brand Bible and **Brand Creative DNA** (voice, rhythm, tension). If Brand Bible is missing, infer carefully from the brief and do not invent facts.",
      "**Do not produce generic advertising language** in strategy — angles must be ownable for this client.",
      "",
      formattedContext,
    ].join("\n"),
};
