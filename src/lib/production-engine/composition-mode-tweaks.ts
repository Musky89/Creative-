import type { CompositionPlanDocument } from "./composition-plan-schema";
import type { SocialContentFamily } from "./mode-ooh-social";
import { oohComposeHints } from "./mode-ooh-social";
import type { PackagingVariantSpec } from "./mode-packaging-retail";
import type { RetailPosVariantKey } from "./mode-packaging-retail";
import type { FashionOutputFamily } from "./mode-identity-fashion-export";

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

/** 3-up route board + strategy strip; hero/secondary rects align to route A/B for composer. */
export function applyIdentityCompositionTweaks(
  doc: CompositionPlanDocument,
): CompositionPlanDocument {
  const m = doc.safeMargins;
  const W = doc.canvasWidth;
  const H = doc.canvasHeight;
  const innerW = W - m.left - m.right;
  const titleH = 52;
  const subH = 36;
  const stratH = 48;
  const gap = 18;
  const labelH = 34;
  const tileTop = m.top + titleH + subH + stratH + gap * 2;
  const availH = H - tileTop - m.bottom - labelH - gap;
  const cellW = Math.floor((innerW - gap * 2) / 3);
  const cellH = Math.min(Math.max(200, cellW), availH);

  const routeA = {
    x: m.left,
    y: tileTop,
    width: cellW,
    height: cellH,
    anchor: "nw" as const,
  };
  const routeB = {
    x: m.left + cellW + gap,
    y: tileTop,
    width: cellW,
    height: cellH,
    anchor: "nw" as const,
  };
  const routeC = {
    x: m.left + 2 * (cellW + gap),
    y: tileTop,
    width: cellW,
    height: cellH,
    anchor: "nw" as const,
  };

  return {
    ...doc,
    visualDominance: "balanced",
    headlinePlacement: {
      x: m.left,
      y: m.top,
      width: innerW,
      height: titleH,
      anchor: "nw",
    },
    ctaPlacement: {
      x: m.left,
      y: m.top + titleH + 6,
      width: Math.floor(innerW * 0.88),
      height: subH,
      anchor: "nw",
    },
    heroPlacement: routeA,
    secondaryPlacement: routeB,
    identityLayout: {
      strategyStrip: {
        x: m.left,
        y: m.top + titleH + subH + 12,
        width: innerW,
        height: stratH,
        anchor: "nw",
      },
      routeA,
      routeB,
      routeC,
      routeLabelA: {
        x: m.left,
        y: tileTop + cellH + 6,
        width: cellW,
        height: labelH,
        anchor: "nw",
      },
      routeLabelB: {
        x: m.left + cellW + gap,
        y: tileTop + cellH + 6,
        width: cellW,
        height: labelH,
        anchor: "nw",
      },
      routeLabelC: {
        x: m.left + 2 * (cellW + gap),
        y: tileTop + cellH + 6,
        width: cellW,
        height: labelH,
        anchor: "nw",
      },
    },
    textHierarchy: [
      "IDENTITY: board title + exploration subtitle",
      "IDENTITY: strategy strip (vector)",
      "IDENTITY: three FAL mark-study tiles + route captions",
    ],
    exportDpiNote:
      "IDENTITY: PNG/PDF board export; FAL tiles are exploration-only — final lockups are vector.",
    modeSpecificConstraints: {
      ...doc.modeSpecificConstraints,
      identityBoard: "3-up route comparison",
    },
  };
}

export function applyEcommerceFashionCompositionTweaks(
  doc: CompositionPlanDocument,
  family: FashionOutputFamily,
): CompositionPlanDocument {
  const hp = doc.heroPlacement;
  const detailW = Math.floor(hp.width * 0.3);
  const detailH = Math.floor(hp.height * 0.3);
  const detailCrop =
    family === "CLEAN_ECOM"
      ? {
          x: hp.x + hp.width - detailW - 10,
          y: hp.y + hp.height - detailH - 10,
          width: detailW,
          height: detailH,
          anchor: "se" as const,
        }
      : undefined;

  const finishing =
    family === "EDITORIAL_LOOKBOOK"
      ? [
          ...doc.finishingLayers,
          {
            id: "fashion-editorial-vignette",
            kind: "VIGNETTE" as const,
            description: "Subtle vignette for editorial lookbook frame.",
            opacity: 0.2,
          },
        ]
      : doc.finishingLayers;

  return {
    ...doc,
    visualDominance:
      family === "PRODUCT_SOCIAL" || family === "CLEAN_ECOM" ? "hero" : doc.visualDominance,
    textHierarchy: [
      `ECOMMERCE_FASHION: ${family.replace(/_/g, " ")}`,
      "Headline + CTA composed; FAL supplies model / scene raster.",
      family === "CLEAN_ECOM"
        ? "Optional detail inset for weave / hardware truth."
        : "Full-frame garment read; crop-safe for PDP or social.",
    ],
    finishingLayers: finishing,
    fashionLayout: {
      modelShot: { ...hp },
      detailCrop,
    },
    modeSpecificConstraints: {
      ...doc.modeSpecificConstraints,
      fashionOutputFamily: family,
    },
  };
}

export function applyExportPresentationCompositionTweaks(
  doc: CompositionPlanDocument,
): CompositionPlanDocument {
  const m = doc.safeMargins;
  const W = doc.canvasWidth;
  const H = doc.canvasHeight;
  const innerW = W - m.left - m.right;
  const footerH = 44;
  const bodyY = doc.ctaPlacement.y + doc.ctaPlacement.height + 20;
  const bodyH = Math.max(140, H - m.bottom - footerH - bodyY - 12);

  return {
    ...doc,
    visualDominance: "type_forward",
    textHierarchy: [
      "EXPORT: slide title",
      "EXPORT: optional hero visual (FAL mood) + rationale column",
      "EXPORT: body copy + footer strip",
    ],
    exportLayout: {
      bodyCopy: {
        x: doc.ctaPlacement.x,
        y: bodyY,
        width: doc.ctaPlacement.width,
        height: bodyH,
        anchor: "nw",
      },
      footerStrip: {
        x: m.left,
        y: H - m.bottom - footerH,
        width: innerW,
        height: footerH,
        anchor: "sw",
      },
    },
    exportDpiNote:
      "EXPORT: 16:9 slide master — PDF sequence or PNG deck; typography is platform-owned.",
    modeSpecificConstraints: {
      ...doc.modeSpecificConstraints,
      exportSlideMaster: "title | hero | body | footer",
    },
  };
}
