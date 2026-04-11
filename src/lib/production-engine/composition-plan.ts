import type { ProductionEngineInput } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import { defaultArchetypeForMode } from "./layout-archetypes";
import {
  buildRectsForArchetype,
  defaultCanvasForMode,
} from "./composition-geometry";
import {
  compositionPlanDocumentSchema,
  type CompositionPlanDocument,
} from "./composition-plan-schema";
import { buildAllSocialVariants } from "./mode-ooh-social";
import {
  applyOohCompositionTweaks,
  applySocialCompositionTweaks,
  applyPackagingCompositionTweaks,
  applyRetailPosCompositionTweaks,
  applyIdentityCompositionTweaks,
  applyEcommerceFashionCompositionTweaks,
  applyExportPresentationCompositionTweaks,
} from "./composition-mode-tweaks";
import { getPackagingVariantSpec } from "./mode-packaging-retail";
import { applyPackagingDielineToPlan } from "./packaging-dieline";
import { buildAllFashionVariants } from "./mode-identity-fashion-export";

/**
 * Builds validated COMPOSITION_PLAN from mode, optional override, and production plan hints.
 */
export function buildCompositionPlanDocument(
  input: ProductionEngineInput,
  productionPlan: ProductionPlanDocument,
  layoutArchetypeOverride?: CompositionPlanDocument["layoutArchetype"],
): CompositionPlanDocument {
  const archetype = layoutArchetypeOverride ?? defaultArchetypeForMode(input.mode);
  const { width, height } = defaultCanvasForMode(input.mode, input);

  const fromRects = buildRectsForArchetype({
    mode: input.mode,
    archetype,
    width,
    height,
  });

  let raw: CompositionPlanDocument = {
    productionMode: input.mode,
    layoutArchetype: archetype,
    canvasWidth: fromRects.canvasWidth,
    canvasHeight: fromRects.canvasHeight,
    heroPlacement: fromRects.heroPlacement,
    secondaryPlacement: fromRects.secondaryPlacement,
    headlinePlacement: fromRects.headlinePlacement,
    ctaPlacement: fromRects.ctaPlacement,
    logoPlacement: fromRects.logoPlacement,
    safeMargins: fromRects.safeMargins,
    visualDominance: fromRects.visualDominance,
    textHierarchy: fromRects.textHierarchy,
    finishingLayers: fromRects.finishingLayers,
    exportFormat: fromRects.exportFormat,
    exportDpiNote: fromRects.exportDpiNote,
    modeSpecificConstraints: {
      ...fromRects.modeSpecificConstraints,
      productionPlanRealism: productionPlan.realismBias,
      compositionIntentEcho: productionPlan.compositionIntent.slice(0, 200),
    },
  };

  raw = compositionPlanDocumentSchema.parse(raw);

  if (input.mode === "OOH") {
    raw = compositionPlanDocumentSchema.parse(applyOohCompositionTweaks(raw));
  }

  if (input.mode === "SOCIAL") {
    const variants = buildAllSocialVariants(input);
    const idx = Math.min(
      Math.max(0, input.socialVariantIndex ?? 0),
      variants.length - 1,
    );
    const family = variants[idx]!.family;
    raw = compositionPlanDocumentSchema.parse(
      applySocialCompositionTweaks(raw, family),
    );
  }

  if (input.mode === "PACKAGING") {
    const pv = getPackagingVariantSpec(input.packagingVariant ?? "ORIGINAL");
    raw = compositionPlanDocumentSchema.parse(
      applyPackagingCompositionTweaks(raw, pv),
    );
    const m = raw.safeMargins;
    const W = raw.canvasWidth;
    const H = raw.canvasHeight;
    const innerW = W - m.left - m.right;
    const bandH = 52;
    const brandY = m.top + bandH + 10;
    const headlineH = 52;
    const claimH = 42;
    const secH = 48;
    const legalH = 44;
    raw = compositionPlanDocumentSchema.parse({
      ...raw,
      packagingLayout: {
        variantBand: {
          x: m.left,
          y: m.top,
          width: innerW,
          height: bandH,
          anchor: "nw",
        },
        secondaryClaim: {
          x: m.left,
          y: brandY + headlineH + claimH + 14,
          width: Math.floor(innerW * 0.92),
          height: secH,
          anchor: "nw",
        },
        legalStrip: {
          x: m.left,
          y: H - m.bottom - legalH,
          width: innerW,
          height: legalH,
          anchor: "sw",
        },
      },
      headlinePlacement: {
        x: m.left,
        y: brandY,
        width: Math.floor(innerW * 0.88),
        height: headlineH,
        anchor: "nw",
      },
      ctaPlacement: {
        x: m.left,
        y: brandY + headlineH + 8,
        width: Math.floor(innerW * 0.94),
        height: claimH,
        anchor: "nw",
      },
      heroPlacement: {
        x: m.left + Math.floor(innerW * 0.38),
        y: m.top + bandH + headlineH + claimH + secH + 24,
        width: Math.floor(innerW * 0.58),
        height: Math.floor(
          H - m.bottom - legalH - (m.top + bandH + headlineH + claimH + secH + 36),
        ),
        anchor: "nw",
      },
      secondaryPlacement: {
        x: m.left,
        y: m.top + bandH + headlineH + claimH + secH + 32,
        width: Math.floor(innerW * 0.34),
        height: Math.floor(innerW * 0.36),
        anchor: "nw",
      },
      logoPlacement: {
        x: W - m.right - Math.floor(innerW * 0.22),
        y: brandY,
        width: Math.floor(innerW * 0.2),
        height: 64,
        anchor: "ne",
      },
    });
    if (input.packagingDieline) {
      raw = compositionPlanDocumentSchema.parse(
        applyPackagingDielineToPlan(raw, input.packagingDieline),
      );
    }
  }

  if (input.mode === "RETAIL_POS") {
    const rv = input.retailPosVariant ?? "STANDARD";
    raw = compositionPlanDocumentSchema.parse(
      applyRetailPosCompositionTweaks(raw, rv),
    );
    const m = raw.safeMargins;
    const W = raw.canvasWidth;
    const H = raw.canvasHeight;
    const innerW = W - m.left - m.right;
    const promoH = rv === "PRICE_FORWARD" ? 72 : 56;
    const offerH = rv === "PRICE_FORWARD" ? 64 : 48;
    const urgH = 40;
    const productTop = m.top + promoH + offerH + 20;
    const productH = H - productTop - m.bottom - urgH - 16;
    raw = compositionPlanDocumentSchema.parse({
      ...raw,
      retailLayout: {
        offerBand: {
          x: m.left,
          y: m.top + promoH,
          width: innerW,
          height: offerH,
          anchor: "nw",
        },
        urgencyStrip: {
          x: m.left,
          y: H - m.bottom - urgH,
          width: innerW,
          height: urgH,
          anchor: "sw",
        },
      },
      headlinePlacement: {
        x: m.left,
        y: m.top,
        width: Math.floor(innerW * 0.95),
        height: promoH,
        anchor: "nw",
      },
      ctaPlacement: {
        x: m.left,
        y: m.top + promoH + 4,
        width: Math.floor(innerW * 0.78),
        height: Math.max(offerH - 4, 40),
        anchor: "nw",
      },
      heroPlacement: {
        x: m.left,
        y: productTop,
        width: Math.floor(innerW * 0.55),
        height: productH,
        anchor: "nw",
      },
      secondaryPlacement:
        rv === "URGENCY"
          ? undefined
          : {
              x: m.left + Math.floor(innerW * 0.58),
              y: productTop,
              width: Math.floor(innerW * 0.4),
              height: Math.floor(productH * 0.55),
              anchor: "nw",
            },
      logoPlacement: {
        x: W - m.right - 120,
        y: m.top + 8,
        width: 100,
        height: 56,
        anchor: "ne",
      },
    });
  }

  if (input.mode === "IDENTITY") {
    raw = compositionPlanDocumentSchema.parse(applyIdentityCompositionTweaks(raw));
  }

  if (input.mode === "ECOMMERCE_FASHION") {
    const variants = buildAllFashionVariants({
      selectedHeadline: input.selectedHeadline,
      selectedCta: input.selectedCta,
      selectedConceptName: input.selectedConcept.conceptName,
      visualSpecNotes: input.visualSpecNotes,
      fashionBatchPreset: input.fashionBatchPreset,
      fashionOutputFamilies: input.fashionOutputFamilies,
    });
    const idx = variants.length
      ? Math.min(
          Math.max(0, input.fashionVariantIndex ?? 0),
          variants.length - 1,
        )
      : 0;
    const fam = variants[idx]?.family ?? "CLEAN_ECOM";
    raw = compositionPlanDocumentSchema.parse(
      applyEcommerceFashionCompositionTweaks(raw, fam),
    );
  }

  if (input.mode === "EXPORT_PRESENTATION") {
    raw = compositionPlanDocumentSchema.parse(
      applyExportPresentationCompositionTweaks(raw),
    );
  }

  return raw;
}
