/**
 * Stable facade for host apps and migration targets.
 * Import this instead of deep paths when integrating from orchestration later.
 */

import { productionEngineInputSchema } from "./schemas";
import { runProductionEngineStub } from "./pipeline";
import { buildProductionPlan } from "./planning";
import type { ProductionEngineInput, ProductionEngineRunResult } from "./types";

export const CreativeProductionEngine = {
  /** Zod schema for normalized creative input */
  schema: productionEngineInputSchema,

  /** Full in-memory pipeline (plan, FAL bundle, composition, review, handoff) */
  run(input: ProductionEngineInput): ProductionEngineRunResult {
    return runProductionEngineStub(input);
  },

  /** Planning only — production plan document + operational checklist */
  buildProductionPlan(input: ProductionEngineInput) {
    return buildProductionPlan(input);
  },

  /** Alias for `run` — explicit name for orchestration call sites */
  runPipeline(input: ProductionEngineInput): ProductionEngineRunResult {
    return runProductionEngineStub(input);
  },
} as const;

export type { ProductionEngineInput, ProductionEngineRunResult };
