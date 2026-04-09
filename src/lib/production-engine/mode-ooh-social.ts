/**
 * OOH + SOCIAL specific copy, batch, and variant logic (deterministic).
 */

import type { ProductionEngineInput } from "./types";

export const SOCIAL_CONTENT_FAMILIES = [
  "PRODUCT_HERO",
  "LIFESTYLE",
  "STATEMENT",
  "OFFER_CTA",
  "TEXT_LED",
] as const;

export type SocialContentFamily = (typeof SOCIAL_CONTENT_FAMILIES)[number];

export type SocialBatchPreset = "1" | "7" | "15" | "30";

export function socialBatchCount(preset?: SocialBatchPreset): number {
  const p = preset ?? "1";
  if (p === "7") return 7;
  if (p === "15") return 15;
  if (p === "30") return 30;
  return 1;
}

/** Cycle families for batch; honor explicit subset when provided. */
export function socialFamiliesForBatch(
  batchCount: number,
  explicit?: SocialContentFamily[],
): SocialContentFamily[] {
  const pool =
    explicit && explicit.length > 0
      ? explicit
      : [...SOCIAL_CONTENT_FAMILIES];
  const out: SocialContentFamily[] = [];
  for (let i = 0; i < batchCount; i++) {
    out.push(pool[i % pool.length]!);
  }
  return out;
}

export type SocialVariantCopy = {
  family: SocialContentFamily;
  index: number;
  headline: string;
  cta: string;
  visualVariationHint: string;
};

export function buildSocialVariantCopy(
  input: ProductionEngineInput,
  family: SocialContentFamily,
  index: number,
): SocialVariantCopy {
  const h = input.selectedHeadline.trim();
  const c = input.selectedCta.trim();
  const concept = input.selectedConcept.conceptName;
  const motif =
    input.referenceSummaries[0]?.slice(0, 80) || "campaign motif";

  switch (family) {
    case "PRODUCT_HERO":
      return {
        family,
        index,
        headline: h,
        cta: c,
        visualVariationHint:
          `Product-forward hero; single subject; ${motif} as subtle background read.`,
      };
    case "LIFESTYLE":
      return {
        family,
        index,
        headline:
          index % 2 === 0
            ? `${concept} — in context`
            : `Live with ${concept.toLowerCase()}`,
        cta: c,
        visualVariationHint:
          "Environmental lifestyle; human scale; natural light bias; not pack-shot.",
      };
    case "STATEMENT":
      return {
        family,
        index,
        headline:
          h.length > 48 ? `${h.slice(0, 46)}…` : `“${h}”`,
        cta: "Learn more",
        visualVariationHint:
          "Bold typographic weight in safe zone; minimal visual noise; manifesto energy.",
      };
    case "OFFER_CTA":
      return {
        family,
        index,
        headline: h,
        cta: c.toUpperCase().length < 40 ? c.toUpperCase() : c,
        visualVariationHint:
          "Offer-forward; price or promo band readable; urgency without clutter.",
      };
    case "TEXT_LED":
      return {
        family,
        index,
        headline: h,
        cta: c,
        visualVariationHint:
          "Text-led: 60%+ safe negative space; hero visual subordinate or soft plate.",
      };
    default: {
      const _e: never = family;
      return _e;
    }
  }
}

export function buildAllSocialVariants(
  input: ProductionEngineInput,
): SocialVariantCopy[] {
  const n = socialBatchCount(input.socialBatchPreset);
  const families = socialFamiliesForBatch(n, input.socialContentFamilies);
  return families.map((family, i) => buildSocialVariantCopy(input, family, i));
}

/** OOH canvas — wide billboard aspect, print-friendly pixel count. */
export function oohCanvasDimensions(): { width: number; height: number } {
  return { width: 3000, height: 1000 };
}

export function oohTypographyScale(): number {
  return 1.55;
}

export function oohComposeHints(): string[] {
  return [
    "One dominant message — headline is the hero line; CTA is subordinate.",
    "Type scaled for distance; avoid long subheads on the board itself.",
    "Negative space is intentional — not empty by accident.",
    "Export at 300 DPI equivalent for intended print width (see exportDpiNote).",
  ];
}
