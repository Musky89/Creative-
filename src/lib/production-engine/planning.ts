import type { ProductionEngineInput, ProductionPlan } from "./types";
import { getModeConfig } from "./mode-registry";

/**
 * Deterministic stub planner — replace with real planning (LLM or rules) at integration.
 */
export function buildProductionPlan(input: ProductionEngineInput): ProductionPlan {
  const cfg = getModeConfig(input.mode);
  return {
    mode: input.mode,
    objective: `Produce ${cfg.label} deliverables from locked creative inputs for: ${input.selectedConcept.conceptName}`,
    steps: [
      {
        id: "normalize",
        title: "Validate inputs",
        description: "Confirm headline, CTA, visual direction, and brand rules are present.",
      },
      {
        id: "route",
        title: "Select generation stack",
        description: `Primary fal route: ${cfg.defaultFalEndpointId}`,
        dependsOn: ["normalize"],
      },
      {
        id: "generate",
        title: "Run generation / edit jobs",
        description: "Execute planned jobs (stub until wired).",
        dependsOn: ["route"],
      },
      {
        id: "compose",
        title: "Deterministic compose",
        description: "Layer brand assets, type, and generated raster per composition plan.",
        dependsOn: ["generate"],
      },
      {
        id: "review",
        title: "Quality review",
        description: "Checklist vs brand rules and mode constraints.",
        dependsOn: ["compose"],
      },
      {
        id: "handoff",
        title: "Package exports",
        description: `Emit ${cfg.exportFormats.join(", ")} bundle.`,
        dependsOn: ["review"],
      },
    ],
    deliverableHints: [
      ...cfg.typicalAspectRatios.map((a) => `Consider aspect: ${a}`),
      `Headline: ${input.selectedHeadline.slice(0, 80)}${input.selectedHeadline.length > 80 ? "…" : ""}`,
    ],
  };
}
