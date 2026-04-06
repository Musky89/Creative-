import type { BrandCreativeDnaInput } from "@/lib/brand/brand-os-taste";

export type BriefLikeForBrandOs = {
  title: string;
  keyMessage: string;
  targetAudience: string;
  businessObjective: string;
  communicationObjective: string;
  tone: string;
};

/**
 * Heuristic starter Creative DNA for AI-assisted Brand Bible filling.
 * Does not call an LLM — safe defaults founders can edit.
 */
export function generateBrandOsFromBrief(
  brief: BriefLikeForBrandOs,
  industry: string,
): BrandCreativeDnaInput {
  const ind = industry.trim() || "this category";
  const aud = brief.targetAudience.trim().slice(0, 120) || "the core audience";

  return {
    voicePrinciples: [
      `Speak to ${aud} with the brief's tone: ${brief.tone.trim() || "clear and specific"} — never generic category filler.`,
      "Prefer proof, behavior, and scene over abstract claims.",
      "Invite participation; avoid lecturing or corporate throat-clearing.",
    ],
    rhythmRules: [
      "Contrast short punchy lines with one longer explanatory beat where needed.",
      "Use fragments deliberately for emphasis — not every line must be a full sentence.",
      "Vary cadence between headline, subthought, and CTA.",
    ],
    signatureDevices: [
      "One concrete cultural or behavioral snapshot per message.",
      "Juxtaposition: tension between what people expect and what the brand delivers.",
      "Single-minded repetition of one ownable phrase (used sparingly, not stuffed).",
    ],
    culturalCodes: [
      `Ground ideas in how people actually behave in ${ind}.`,
      "Shared moments and real environments — not stock-ad abstraction.",
    ],
    emotionalRange: `From grounded confidence to sharp delight — stay within the brief's "${brief.tone || "stated"}" register; avoid whiplash into unrelated tones.`,
    metaphorStyle:
      "Concrete and sensory first — objects, places, textures, actions; use abstract metaphor only when it earns a specific payoff.",
    visualPhilosophy:
      "Human-first framing and real-world physics; avoid hyper-polished CGI sheen and generic luxury moodboards unless the brand explicitly demands them.",
    brandTension: `Deliver on "${brief.keyMessage.trim().slice(0, 80) || "the key message"}" while staying honest about category norms in ${ind} — never smooth the tension into bland reassurance.`,
  };
}
