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

/**
 * Builds validated COMPOSITION_PLAN from mode, optional override, and production plan hints.
 */
export function buildCompositionPlanDocument(
  input: ProductionEngineInput,
  productionPlan: ProductionPlanDocument,
  layoutArchetypeOverride?: CompositionPlanDocument["layoutArchetype"],
): CompositionPlanDocument {
  const archetype = layoutArchetypeOverride ?? defaultArchetypeForMode(input.mode);
  const { width, height } = defaultCanvasForMode(input.mode);

  const fromRects = buildRectsForArchetype({
    mode: input.mode,
    archetype,
    width,
    height,
  });

  const raw: CompositionPlanDocument = {
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

  return compositionPlanDocumentSchema.parse(raw);
}
