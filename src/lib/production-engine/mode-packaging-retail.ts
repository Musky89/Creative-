/**
 * PACKAGING + RETAIL_POS — structured production (not ad-image modes).
 * Final FOP/POS layout is platform composer; FAL supplies support rasters only.
 */

export const PACKAGING_VARIANT_KEYS = [
  "ORIGINAL",
  "VARIANT_A",
  "VARIANT_B",
  "LOW_SUGAR",
  "LIMITED",
] as const;

export type PackagingVariantKey = (typeof PACKAGING_VARIANT_KEYS)[number];

export type PackagingVariantSpec = {
  key: PackagingVariantKey;
  label: string;
  /** Accent for variant band / stripe (composer). */
  bandColorHex: string;
  /** Short ribbon text (e.g. NEW, -30% SUGAR). */
  ribbonText: string;
};

const VARIANT_TABLE: Record<PackagingVariantKey, Omit<PackagingVariantSpec, "key">> = {
  ORIGINAL: { label: "Master SKU / original", bandColorHex: "#3f3f46", ribbonText: "" },
  VARIANT_A: { label: "Variant A — alternate flavor", bandColorHex: "#7c3aed", ribbonText: "VARIANT A" },
  VARIANT_B: { label: "Variant B — alternate size", bandColorHex: "#0d9488", ribbonText: "VARIANT B" },
  LOW_SUGAR: { label: "Low sugar line", bandColorHex: "#16a34a", ribbonText: "LOW SUGAR" },
  LIMITED: { label: "Limited edition", bandColorHex: "#ca8a04", ribbonText: "LIMITED" },
};

export function getPackagingVariantSpec(key: PackagingVariantKey): PackagingVariantSpec {
  const v = VARIANT_TABLE[key];
  return { key, ...v };
}

export function packagingComposerCopy(input: {
  selectedHeadline: string;
  selectedCta: string;
  supportingCopy?: string;
  selectedConceptName: string;
}): {
  brandLine: string;
  primaryClaim: string;
  secondaryClaim: string;
} {
  const brandLine =
    input.selectedConceptName.length > 42
      ? `${input.selectedConceptName.slice(0, 40)}…`
      : input.selectedConceptName;
  const primaryClaim = input.selectedCta.trim().slice(0, 72) || input.selectedHeadline.slice(0, 72);
  const sc = (input.supportingCopy ?? "").trim();
  const secondaryClaim =
    sc.length > 0
      ? sc.split(/[.;\n]/)[0]!.trim().slice(0, 88)
      : input.selectedHeadline.trim().slice(0, 88);
  return { brandLine, primaryClaim, secondaryClaim };
}

export const RETAIL_POS_VARIANT_KEYS = ["STANDARD", "PRICE_FORWARD", "URGENCY"] as const;
export type RetailPosVariantKey = (typeof RETAIL_POS_VARIANT_KEYS)[number];

export function retailPosComposerCopy(input: {
  selectedHeadline: string;
  selectedCta: string;
  supportingCopy?: string;
}): {
  promoHeadline: string;
  offerLine: string;
  urgencyLine: string;
} {
  const promoHeadline = input.selectedHeadline.trim().slice(0, 64);
  const offerLine = input.selectedCta.trim().slice(0, 48);
  const u = (input.supportingCopy ?? "").trim();
  const urgencyLine =
    u.length > 0
      ? u.split(/[.;\n]/)[0]!.trim().slice(0, 56)
      : "Limited time — see store for details";
  return { promoHeadline, offerLine, urgencyLine };
}
