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
      id: `${base}-handoff-bundle`,
      format: "markdown",
      description:
        "Handoff package index — structured layer manifest, source visuals, brand/copy metadata (see pipeline.handoff)",
      placeholderUri: `production-engine://handoff/${input.mode}/${base}/README.md`,
    },
  ];
}
