import type { ProductionEngineInput, ProductionEngineRunResult } from "./types";
import { buildProductionPlan } from "./planning";
import { routeFalForProduction } from "./fal-routing";
import { buildVisualExecutionBundle } from "./visual-execution";
import { buildProductionJobs } from "./jobs";
import { buildCompositionPlan } from "./composition-plan";
import { runDeterministicComposer } from "./composer";
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
  const compositionPlan = buildCompositionPlan(input);
  const composed = runDeterministicComposer(input, compositionPlan);
  const review = evaluateProductionOutput(input, productionPlan);
  const handoff = buildHandoffPackage(input, productionPlan);
  return {
    input,
    productionPlan,
    operationalPlan,
    falRouting,
    visualExecution,
    jobs,
    compositionPlan,
    composed,
    review,
    handoff,
  };
}
