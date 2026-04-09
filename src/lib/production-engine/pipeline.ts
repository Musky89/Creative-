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
  const layerManifest = buildLayerManifest(compositionPlanDocument, input);
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
  return {
    input,
    productionPlan,
    operationalPlan,
    falRouting,
    visualExecution,
    jobs,
    compositionPlanDocument,
    layerManifest,
    assemblyExplanation,
    composed,
    review,
    handoff,
  };
}
