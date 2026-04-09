import type { ComposedArtifact, ProductionEngineInput } from "./types";
import type {
  CompositionPlanDocument,
  CompositionLayerManifestEntry,
} from "./composition-plan-schema";

/**
 * Client-safe composed artifact metadata (no Sharp). PNG bytes come from API route.
 */
export function buildComposedArtifactStubs(
  input: ProductionEngineInput,
  plan: CompositionPlanDocument,
  manifest: CompositionLayerManifestEntry[],
): ComposedArtifact[] {
  const base = input.selectedConcept.conceptName.replace(/\s+/g, "-").toLowerCase();
  return [
    {
      id: `${base}-composed`,
      format: "png",
      description: `Layer stack (${manifest.length} layers) · ${plan.layoutArchetype} · ${plan.canvasWidth}×${plan.canvasHeight}`,
      placeholderUri: `production-engine://compose/${input.mode}/preview.png`,
    },
    {
      id: `${base}-manifest`,
      format: "markdown",
      description: "Layer manifest JSON for handoff",
      placeholderUri: `production-engine://compose/${input.mode}/manifest.json`,
    },
  ];
}
