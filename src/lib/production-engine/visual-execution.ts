import type { ProductionEngineInput, FalRouteDecision, VisualExecutionBundle } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import { deriveGenerationTargets } from "./derive-generation-targets";
import { routeBatch, type FalRouterInput } from "./fal-router";

const DEFAULT_TIER = "standard" as const;

/** Optional Creative Testing Lab / advanced callers — does not affect default pipeline. */
export type VisualExecutionBundleOptions = {
  /** Appended to every target’s reference list (e.g. uploaded ref boards). */
  extraReferenceUrls?: string[];
  /** When true and hero/secondary URL exists, bias router toward image-to-image where applicable. */
  preferEditOverGenerate?: boolean;
  /** Include hero/secondary/tertiary raster URLs as FAL references (strong ref mode). */
  strongReferenceImages?: boolean;
};

export function buildVisualExecutionBundle(
  input: ProductionEngineInput,
  plan: ProductionPlanDocument,
  bundleOptions?: VisualExecutionBundleOptions,
): VisualExecutionBundle {
  const rawTier = input.visualQualityTier ?? DEFAULT_TIER;
  const qualityTier =
    rawTier === "premium" ? "high" : rawTier;
  const targets = deriveGenerationTargets(input, plan, qualityTier);

  const routerInputs: FalRouterInput[] = targets.map((target) => {
    const logoBase =
      !!input.brandAssets?.logoUrl &&
      target.targetType !== "HERO_PHOTO" &&
      target.targetType !== "LIFESTYLE_SCENE" &&
      target.targetType !== "BACKGROUND_PLATE" &&
      target.targetType !== "RETAIL_PROMO_VISUAL" &&
      target.productionMode !== "SOCIAL" &&
      target.productionMode !== "OOH" &&
      target.productionMode !== "PACKAGING" &&
      target.productionMode !== "RETAIL_POS" &&
      target.productionMode !== "IDENTITY" &&
      target.productionMode !== "ECOMMERCE_FASHION";

    const rasterBase =
      bundleOptions?.preferEditOverGenerate === true &&
      !!(
        input.heroImageUrl?.trim() ||
        input.secondaryImageUrl?.trim() ||
        input.tertiaryImageUrl?.trim()
      ) &&
      target.targetType !== "BACKGROUND_PLATE";

    const hasBase = logoBase || rasterBase;

    const refs: string[] = [...(bundleOptions?.extraReferenceUrls ?? [])];
    if (input.brandAssets?.logoUrl?.trim()) {
      refs.push(input.brandAssets.logoUrl.trim());
    }
    if (bundleOptions?.strongReferenceImages) {
      if (input.heroImageUrl?.trim()) refs.push(input.heroImageUrl.trim());
      if (input.secondaryImageUrl?.trim()) refs.push(input.secondaryImageUrl.trim());
      if (input.tertiaryImageUrl?.trim()) refs.push(input.tertiaryImageUrl.trim());
    }

    return {
      target,
      qualityTier,
      hasBaseImageForEdit: hasBase,
      referenceImageUrls: refs,
    };
  });

  const routedExecutions = routeBatch(routerInputs);

  return {
    qualityTier,
    targets,
    routedExecutions,
  };
}

export function summarizeFalRouting(
  input: ProductionEngineInput,
  bundle: VisualExecutionBundle,
): FalRouteDecision {
  const first = bundle.routedExecutions[0];
  const second = bundle.routedExecutions[1];
  return {
    mode: input.mode,
    primaryEndpointId: first?.route.pathId ?? "internal/composition-only",
    fallbackEndpointId: second?.route.pathId,
    reason: bundle.routedExecutions
      .map((r) => `${r.target.id}→${r.route.pathId}: ${r.route.reasons.join("; ")}`)
      .join(" | "),
  };
}
