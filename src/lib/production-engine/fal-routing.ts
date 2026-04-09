import type { ProductionEngineInput, FalRouteDecision } from "./types";
import { getModeConfig } from "./mode-registry";

/**
 * Stub fal routing — returns logical endpoint ids only (no network).
 */
export function routeFalForProduction(input: ProductionEngineInput): FalRouteDecision {
  const cfg = getModeConfig(input.mode);
  if (input.mode === "EXPORT_PRESENTATION") {
    return {
      mode: input.mode,
      primaryEndpointId: "composition-only",
      reason:
        "Presentation mode is composition/export-first; image gen optional in future pass.",
    };
  }
  return {
    mode: input.mode,
    primaryEndpointId: cfg.defaultFalEndpointId,
    fallbackEndpointId: `${cfg.defaultFalEndpointId}#fallback`,
    reason: `Default stack for ${cfg.label}; modelRef=${input.modelRef ?? "unset"}.`,
  };
}
