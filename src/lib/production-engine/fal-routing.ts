import type { ProductionEngineInput, FalRouteDecision } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import {
  buildVisualExecutionBundle,
  summarizeFalRouting,
} from "./visual-execution";

/**
 * Legacy summary of FAL routes from the visual execution bundle.
 */
export function routeFalForProduction(
  input: ProductionEngineInput,
  plan: ProductionPlanDocument,
): FalRouteDecision {
  const bundle = buildVisualExecutionBundle(input, plan);
  return summarizeFalRouting(input, bundle);
}
