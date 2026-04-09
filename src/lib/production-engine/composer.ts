import type {
  CompositionPlan,
  ComposedArtifact,
  ProductionEngineInput,
} from "./types";

/**
 * Deterministic composer stub — describes outputs without rendering.
 */
export function runDeterministicComposer(
  input: ProductionEngineInput,
  plan: CompositionPlan,
): ComposedArtifact[] {
  const base = input.selectedConcept.conceptName.replace(/\s+/g, "-").toLowerCase();
  return [
    {
      id: `${base}-hero`,
      format: "png",
      description: `Hero composite (${plan.canvasAspect}) — layers: ${plan.layers.map((l) => l.id).join(", ")}`,
      placeholderUri: `production-engine://stub/${input.mode}/hero.png`,
    },
    {
      id: `${base}-spec`,
      format: "markdown",
      description: "Build recipe + layer manifest for integrators",
      placeholderUri: `production-engine://stub/${input.mode}/manifest.md`,
    },
  ];
}
