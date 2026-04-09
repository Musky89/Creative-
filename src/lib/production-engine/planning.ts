import type { ProductionEngineInput, ProductionPlan, ProductionPlanStep } from "./types";
import { getModeConfig } from "./mode-registry";
import {
  buildProductionPlanDocument,
  type ProductionPlanPlannerOptions,
} from "./production-plan-planner";
import {
  productionPlanDocumentSchema,
  type ProductionPlanDocument,
} from "./production-plan-schema";

export type { ProductionPlanDocument };
export { productionPlanDocumentSchema, buildProductionPlanDocument };

/**
 * Validates planner output (deterministic today; catches schema drift).
 */
export function planAndValidate(
  input: ProductionEngineInput,
  options?: ProductionPlanPlannerOptions,
): ProductionPlanDocument {
  const raw = buildProductionPlanDocument(input, options);
  return productionPlanDocumentSchema.parse(raw);
}

/**
 * Operational checklist plan derived from mode config + validated document (execution layer).
 */
export function buildOperationalPlan(
  input: ProductionEngineInput,
  document: ProductionPlanDocument,
): ProductionPlan {
  const cfg = getModeConfig(input.mode);
  const steps: ProductionPlanStep[] = [
    {
      id: "normalize",
      title: "Validate inputs",
      description:
        "Confirm headline, CTA, visual direction, and brand rules align with production plan.",
    },
    {
      id: "plan-lock",
      title: "Lock Production Plan",
      description: `Mode ${document.productionMode}: ${cfg.objective.slice(0, 120)}…`,
      dependsOn: ["normalize"],
    },
    {
      id: "route",
      title: "Select generation stack",
      description: `Primary fal route: ${cfg.defaultFalEndpointId}`,
      dependsOn: ["plan-lock"],
    },
    {
      id: "generate",
      title: "Run generation / edit jobs",
      description: `Honor hero intent and ${document.compositionIntent.slice(0, 100)}…`,
      dependsOn: ["route"],
    },
    {
      id: "compose",
      title: "Deterministic compose",
      description:
        "Layer brand assets, type, and raster per composition plan and mode constraints.",
      dependsOn: ["generate"],
    },
    {
      id: "review",
      title: "Quality review",
      description: document.reviewFocus.slice(0, 3).join("; ") || "Mode review checklist",
      dependsOn: ["compose"],
    },
    {
      id: "handoff",
      title: "Package exports",
      description: `Targets: ${document.exportTargets.join(", ")}`,
      dependsOn: ["review"],
    },
  ];

  return {
    mode: input.mode,
    objective: cfg.objective,
    steps,
    deliverableHints: [
      ...cfg.exportExpectations,
      ...cfg.layoutExpectations.slice(0, 2),
      `Plan headline: ${document.selectedHeadline.slice(0, 60)}${document.selectedHeadline.length > 60 ? "…" : ""}`,
    ],
  };
}

/**
 * Full planning: schema-valid Production Plan document + operational steps.
 */
export function buildProductionPlan(
  input: ProductionEngineInput,
  options?: ProductionPlanPlannerOptions,
): { document: ProductionPlanDocument; operational: ProductionPlan } {
  const document = planAndValidate(input, options);
  const operational = buildOperationalPlan(input, document);
  return { document, operational };
}
