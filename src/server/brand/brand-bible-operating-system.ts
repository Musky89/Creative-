import type { BrandBible } from "@/generated/prisma/client";
import type { BrandOperatingSystemContext } from "@/server/brand/brand-os-prompt";

function asStringArray(json: unknown, maxItems: number): string[] {
  if (!Array.isArray(json)) return [];
  return json
    .slice(0, maxItems)
    .map((x) => String(x).trim())
    .filter(Boolean);
}

/** Single source for Brand OS fields when assembling prompts outside TaskAgentContext. */
export function brandBibleToOperatingSystem(bb: BrandBible): BrandOperatingSystemContext {
  return {
    vocabularyStyle: bb.vocabularyStyle,
    sentenceStyle: bb.sentenceStyle,
    bannedPhrases: asStringArray(bb.bannedPhrases, 40),
    preferredPhrases: asStringArray(bb.preferredPhrases, 40),
    signaturePatterns: asStringArray(bb.signaturePatterns, 24),
    primaryEmotion: bb.primaryEmotion,
    emotionalToneDescription: bb.emotionalToneDescription,
    emotionalBoundaries: asStringArray(bb.emotionalBoundaries, 24),
    hookStyles: asStringArray(bb.hookStyles, 16),
    narrativeStyles: asStringArray(bb.narrativeStyles, 16),
    persuasionStyle: bb.persuasionStyle,
    visualStyle: bb.visualStyle,
    colorPhilosophy: bb.colorPhilosophy,
    compositionStyle: bb.compositionStyle,
    textureFocus: bb.textureFocus,
    lightingStyle: bb.lightingStyle,
  };
}
