import type { ProductionEngineInput, FalRouteDecision, VisualExecutionBundle } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import { deriveGenerationTargets } from "./derive-generation-targets";
import { routeBatch, type FalRouterInput } from "./fal-router";

const DEFAULT_TIER = "standard" as const;

export function buildVisualExecutionBundle(
  input: ProductionEngineInput,
  plan: ProductionPlanDocument,
): VisualExecutionBundle {
  const qualityTier = input.visualQualityTier ?? DEFAULT_TIER;
  const targets = deriveGenerationTargets(input, plan, qualityTier);

  const routerInputs: FalRouterInput[] = targets.map((target) => {
    const hasBase =
      !!input.brandAssets?.logoUrl &&
      target.targetType !== "HERO_PHOTO" &&
      target.targetType !== "LIFESTYLE_SCENE" &&
      target.targetType !== "BACKGROUND_PLATE" &&
      target.targetType !== "RETAIL_PROMO_VISUAL" &&
      target.productionMode !== "SOCIAL" &&
      target.productionMode !== "OOH";

    const refs: string[] = [];
    if (input.brandAssets?.logoUrl?.trim()) {
      refs.push(input.brandAssets.logoUrl.trim());
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
