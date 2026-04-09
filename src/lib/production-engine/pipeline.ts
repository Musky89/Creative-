import type { ProductionEngineInput, ProductionEngineRunResult } from "./types";
import { buildProductionPlan } from "./planning";
import { routeFalForProduction } from "./fal-routing";
import { buildVisualExecutionBundle } from "./visual-execution";
import { buildProductionJobs } from "./jobs";
import { buildCompositionPlanDocument } from "./composition-plan";
import {
  buildLayerManifest,
  buildAssemblyExplanation,
} from "./composition-manifest";
import { buildComposedArtifactStubs } from "./composer";
import { evaluateProductionOutput } from "./review";
import { buildHandoffPackage } from "./handoff";
import { buildAllSocialVariants } from "./mode-ooh-social";
import { getPackagingVariantSpec } from "./mode-packaging-retail";

/**
 * End-to-end stub pipeline for the standalone engine (no I/O).
 */
export function runProductionEngineStub(
  input: ProductionEngineInput,
): ProductionEngineRunResult {
  const { document: productionPlan, operational: operationalPlan } =
    buildProductionPlan(input);
  const visualExecution = buildVisualExecutionBundle(input, productionPlan);
  const falRouting = routeFalForProduction(input, productionPlan);
  const jobs = buildProductionJobs(input, visualExecution);
  const compositionPlanDocument = buildCompositionPlanDocument(
    input,
    productionPlan,
    input.layoutArchetype,
  );
  const socialVariants =
    input.mode === "SOCIAL" ? buildAllSocialVariants(input) : undefined;
  const socialIdx = socialVariants?.length
    ? Math.min(
        Math.max(0, input.socialVariantIndex ?? 0),
        socialVariants.length - 1,
      )
    : 0;
  const socialSlot = socialVariants?.[socialIdx];
  const layerManifest = buildLayerManifest(
    compositionPlanDocument,
    input,
    socialSlot
      ? { headline: socialSlot.headline, cta: socialSlot.cta }
      : undefined,
  );
  const assemblyExplanation = buildAssemblyExplanation(
    compositionPlanDocument,
    input,
    layerManifest,
  );
  const composed = buildComposedArtifactStubs(
    input,
    compositionPlanDocument,
    layerManifest,
  );
  const review = evaluateProductionOutput(input, productionPlan);
  const handoff = buildHandoffPackage(input, productionPlan);
  const packagingVariantSpec =
    input.mode === "PACKAGING"
      ? getPackagingVariantSpec(input.packagingVariant ?? "ORIGINAL")
      : undefined;
  return {
    input,
    productionPlan,
    operationalPlan,
    falRouting,
    visualExecution,
    socialVariants,
    packagingVariantSpec,
    jobs,
    compositionPlanDocument,
    layerManifest,
    assemblyExplanation,
    composed,
    review,
    handoff,
  };
}
