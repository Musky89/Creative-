import type { CompositionPlanDocument } from "./composition-plan-schema";
import type { SocialContentFamily } from "./mode-ooh-social";
import { oohComposeHints } from "./mode-ooh-social";
import type { PackagingVariantSpec } from "./mode-packaging-retail";
import type { RetailPosVariantKey } from "./mode-packaging-retail";

/** Enlarge type islands + OOH-specific finishing; canvas already wide from geometry. */
export function applyOohCompositionTweaks(
  doc: CompositionPlanDocument,
): CompositionPlanDocument {
  const scaleHeadline = 1.4;
  const scaleCta = 1.25;
  const h = doc.headlinePlacement;
  const c = doc.ctaPlacement;
  return {
    ...doc,
    headlinePlacement: {
      ...h,
      width: Math.floor(h.width * scaleHeadline),
      height: Math.floor(h.height * scaleHeadline),
    },
    ctaPlacement: {
      ...c,
      width: Math.floor(c.width * scaleCta),
      height: Math.floor(c.height * scaleCta),
      y: Math.floor(h.y + h.height * scaleHeadline + 24),
    },
    visualDominance: "hero",
    textHierarchy: [
      "OOH: H1 dominates — max 8 words in compose",
      "OOH: CTA subordinate — short line only",
      "OOH: Logo tertiary — corner, does not compete with focal",
    ],
    finishingLayers: [
      ...doc.finishingLayers.filter((f) => f.id !== "scrim-readability"),
      {
        id: "ooh-readability-scrim",
        kind: "SCRIM",
        description: "Side or bottom scrim for headline island — billboard, not social full-bleed type.",
        opacity: 0.26,
      },
    ],
    exportFormat: "png",
    exportDpiNote:
      "OOH: target 300 DPI at final print width; master raster for proof — upscale optional.",
    modeSpecificConstraints: {
      ...doc.modeSpecificConstraints,
      oohHints: oohComposeHints().join(" | "),
    },
  };
}

/** FOP grid emphasis — not ad layout. */
export function applyPackagingCompositionTweaks(
  doc: CompositionPlanDocument,
  variant: PackagingVariantSpec,
): CompositionPlanDocument {
  return {
    ...doc,
    visualDominance: "type_forward",
    textHierarchy: [
      `PACKAGING: brand — ${variant.label}`,
      "PACKAGING: primary claim (headline field)",
      "PACKAGING: secondary line (CTA field)",
      "PACKAGING: variant ribbon + band color in compose",
      "PACKAGING: legal placeholder strip (non-printing guide)",
    ],
    finishingLayers: [
      ...doc.finishingLayers,
      {
        id: "pack-variant-band",
        kind: "BORDER",
        description: `Variant system: ${variant.key} band ${variant.bandColorHex}`,
        opacity: 1,
      },
    ],
    exportDpiNote:
      "PACKAGING: 300 DPI at trim; include bleed per dieline; FAL assets are support-only.",
    modeSpecificConstraints: {
      ...doc.modeSpecificConstraints,
      packagingVariantKey: variant.key,
      packagingBandHex: variant.bandColorHex,
      packagingRibbon: variant.ribbonText,
    },
  };
}

export function applyRetailPosCompositionTweaks(
  doc: CompositionPlanDocument,
  variant: RetailPosVariantKey,
): CompositionPlanDocument {
  let visualDominance = doc.visualDominance;
  if (variant === "PRICE_FORWARD") visualDominance = "balanced";
  if (variant === "URGENCY") visualDominance = "type_forward";

  return {
    ...doc,
    visualDominance,
    textHierarchy: [
      "RETAIL_POS: promo headline (top band)",
      variant === "PRICE_FORWARD"
        ? "RETAIL_POS: price/offer line dominant"
        : "RETAIL_POS: offer line secondary to headline",
      "RETAIL_POS: urgency footer",
      "RETAIL_POS: product window (FAL raster)",
    ],
    finishingLayers: [
      ...doc.finishingLayers,
      {
        id: "retail-offer-band",
        kind: "SCRIM",
        description: "High-contrast strip behind offer numerals (compose).",
        opacity: variant === "PRICE_FORWARD" ? 0.5 : 0.35,
      },
    ],
    modeSpecificConstraints: {
      ...doc.modeSpecificConstraints,
      retailPosVariant: variant,
    },
  };
}

export function applySocialCompositionTweaks(
  doc: CompositionPlanDocument,
  family: SocialContentFamily,
): CompositionPlanDocument {
  const h = { ...doc.headlinePlacement };
  const hero = { ...doc.heroPlacement };

  if (family === "TEXT_LED" || family === "STATEMENT") {
    hero.height = Math.floor(hero.height * 0.72);
    h.height = Math.floor(h.height * 1.35);
    h.width = Math.min(
      doc.canvasWidth - doc.safeMargins.left - doc.safeMargins.right,
      Math.floor(h.width * 1.12),
    );
  }

  if (family === "OFFER_CTA") {
    h.y = Math.max(
      doc.safeMargins.top,
      doc.canvasHeight - doc.safeMargins.bottom - 240,
    );
  }

  if (family === "PRODUCT_HERO") {
    hero.height = Math.floor(hero.height * 1.06);
  }

  const finishing =
    family === "STATEMENT"
      ? [
          ...doc.finishingLayers,
          {
            id: "social-statement-scrim",
            kind: "SCRIM" as const,
            description: "Light vignette for statement focus.",
            opacity: 0.22,
          },
        ]
      : doc.finishingLayers;

  return {
    ...doc,
    heroPlacement: hero,
    headlinePlacement: h,
    visualDominance:
      family === "TEXT_LED" ? "type_forward" : doc.visualDominance,
    finishingLayers: finishing,
    modeSpecificConstraints: {
      ...doc.modeSpecificConstraints,
      socialFamily: family,
    },
  };
}
