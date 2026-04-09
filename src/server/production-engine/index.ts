/**
 * Creative Production Engine — server facade.
 * Standalone from orchestrator; safe to import only from isolated routes/actions.
 */

export {
  runProductionEngineStub,
  productionEngineInputSchema,
  listProductionModes,
  PRODUCTION_MODE_REGISTRY,
  type ProductionEngineInput,
  type ProductionEngineRunResult,
} from "@/lib/production-engine";
