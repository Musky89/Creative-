/**
 * Bad output blacklist — deterministic cliché / AI-slop patterns (verbal, visual, identity).
 * Wired into pre-persist quality, regeneration prompts, and Brand Guardian instructions.
 */

/** Same stages as quality loop (avoid importing quality-loop → circular deps). */
export type BlacklistQualityStage =
  | "STRATEGY"
  | "IDENTITY_STRATEGY"
  | "IDENTITY_ROUTING"
  | "CONCEPTING"
  | "VISUAL_DIRECTION"
  | "COPY_DEVELOPMENT";

/** Verbal / copy clichés (substring match, case-insensitive after norm). */
export const BAD_OUTPUT_VERBAL_PHRASES = [
  // Original anti-generic baseline (kept single source)
  "high quality",
  "highest quality",
  "premium feel",
  "best in class",
  "best-in-class",
  "world class",
  "world-class",
  "innovative solution",
  "cutting edge",
  "cutting-edge",
  "unlock the power",
  "game-changer",
  "game changer",
  "seamless experience",
  "next level",
  "take your business to the next level",
  "leverage synerg",
  "in today's world",
  "leading provider",
  "customer-centric",
  "state of the art",
  "state-of-the-art",
  "think outside the box",
  "synergy",
  "holistic approach",
  "robust solution",
  "empower your",
  "revolutionize",
  // Extended verbal blacklist
  "elevate your",
  "unlock your",
  "transform your brand",
  "transform your business",
  "reimagine your",
  "best practices",
  "industry standard",
  "industry-leading",
  "world renowned",
  "world-renowned",
  "next-generation",
  "next generation solution",
  "innovative approach",
  "cutting-edge technology",
  "premium experience",
  "luxury experience",
  "unparalleled quality",
  "second to none",
] as const;

/** Vague visual / trend clichés (substring; use on VISUAL_SPEC and visual-heavy fields). */
export const BAD_OUTPUT_VISUAL_PHRASES = [
  "cinematic",
  "luxury aesthetic",
  "luxury look",
  "high-end aesthetic",
  "premium aesthetic",
  "generic bokeh",
  "stock photo",
  "stock image",
  "corporate stock",
  "neon gradient",
  "tech gradient",
  "futuristic circles",
  "interconnected nodes",
  "abstract network",
  "meaningless nodes",
  "ai-generated look",
  "ai generated look",
  "glassmorphism",
  "random geometric",
  "random geometry",
  "floating orbs",
  "swoosh logo",
  "generic minimalist",
] as const;

/** Identity / mark slop (substring). */
export const BAD_OUTPUT_IDENTITY_PHRASES = [
  "meaningless geometry",
  "meaningless shapes",
  "generic monogram",
  "interlocking rings",
  "random circles",
  "random lines",
  "generic swoosh",
  "modern and timeless",
  "timeless and modern",
  "sleek and modern",
  "clean and simple logo",
  "simple yet powerful",
  "minimal logo",
  "timeless design",
  "universal symbol",
  "abstract lines with no",
] as const;

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function findSubstrHits(text: string, phrases: readonly string[]): string[] {
  const t = norm(text);
  const hits: string[] = [];
  for (const p of phrases) {
    if (t.includes(p)) hits.push(p);
  }
  return [...new Set(hits)];
}

export function findBadOutputVerbalHits(text: string): string[] {
  return findSubstrHits(text, BAD_OUTPUT_VERBAL_PHRASES);
}

export function findBadOutputVisualHits(text: string): string[] {
  return findSubstrHits(text, BAD_OUTPUT_VISUAL_PHRASES);
}

export function findBadOutputIdentityHits(text: string): string[] {
  return findSubstrHits(text, BAD_OUTPUT_IDENTITY_PHRASES);
}

const WHY_VISUAL =
  "Vague or trend-driven visual cliché — add concrete light, material, lens/set logic, and brand-specific cues (not vibes-only).";
const WHY_IDENTITY =
  "Empty geometry / trend identity slop — tie form to strategy proof, ownable symbolic logic, and named risks.";

/**
 * Extra deterministic checks beyond verbal `findGenericMarketingHits` (visual + identity only).
 * Verbal blacklist is applied via anti-generic.ts → findGenericMarketingHits.
 */
export function mergeBadOutputBlacklistIssues(
  stage: BlacklistQualityStage,
  content: Record<string, unknown>,
): { issues: string[]; recommendRegeneration: boolean } {
  const issues: string[] = [];
  let hv: string[] = [];
  let hi: string[] = [];

  if (stage === "VISUAL_DIRECTION") {
    const vis = collectVisualBlob(content);
    hv = findBadOutputVisualHits(vis);
    if (hv.length) {
      issues.push(
        `Bad-output blacklist (visual): ${hv.slice(0, 8).join(", ")} — ${WHY_VISUAL}`,
      );
    }
  }

  if (stage === "IDENTITY_STRATEGY" || stage === "IDENTITY_ROUTING") {
    const id = collectIdentityBlob(content);
    hi = findBadOutputIdentityHits(id);
    if (hi.length) {
      issues.push(
        `Bad-output blacklist (identity): ${hi.slice(0, 8).join(", ")} — ${WHY_IDENTITY}`,
      );
    }
  }

  const visualRegen = stage === "VISUAL_DIRECTION" && hv.length >= 1;
  const idRegen =
    (stage === "IDENTITY_STRATEGY" || stage === "IDENTITY_ROUTING") &&
    hi.length >= 1;

  return {
    issues,
    recommendRegeneration: visualRegen || idRegen,
  };
}

function collectVisualBlob(content: Record<string, unknown>): string {
  const keys = [
    "visualObjective",
    "mood",
    "emotionalTone",
    "composition",
    "colorDirection",
    "textureDirection",
    "lightingDirection",
    "typographyDirection",
    "imageStyle",
    "referenceLogic",
    "distinctivenessNotes",
    "whyItWorksForBrand",
    "optionalPromptSeed",
  ] as const;
  return keys.map((k) => String(content[k] ?? "")).join("\n");
}

function collectIdentityBlob(content: Record<string, unknown>): string {
  return JSON.stringify(content);
}

/** For LLM system prompts (quality pass, guardian) and regeneration mustPreserve. */
export function formatBadOutputBlacklistForPrompt(): string {
  const verbalSample = BAD_OUTPUT_VERBAL_PHRASES.slice(0, 24).join(", ");
  const visualSample = BAD_OUTPUT_VISUAL_PHRASES.join(", ");
  const idSample = BAD_OUTPUT_IDENTITY_PHRASES.join(", ");
  return [
    "### Bad-output blacklist (hard reject / regen)",
    "Do not use verbal clichés including (non-exhaustive):",
    verbalSample,
    "…",
    "Do not lean on vague visual clichés:",
    visualSample,
    "Do not use empty identity/mark language:",
    idSample,
    "If present, flag regeneration and name the matched pattern in critique.",
  ].join("\n");
}
