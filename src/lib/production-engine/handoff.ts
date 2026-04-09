import type { ProductionEngineInput, HandoffPackage } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import { getModeConfig } from "./mode-registry";

export function buildHandoffPackage(
  input: ProductionEngineInput,
  plan?: ProductionPlanDocument,
): HandoffPackage {
  const cfg = getModeConfig(input.mode);
  const slug = input.mode.toLowerCase();
  const targets = plan?.exportTargets ?? cfg.exportFormats;
  return {
    mode: input.mode,
    bundleName: `${slug}-production-bundle`,
    items: [
      { path: `exports/${slug}/hero.png`, description: "Composed hero" },
      {
        path: `exports/${slug}/production-plan.json`,
        description: "Validated Production Plan document",
      },
      { path: `exports/${slug}/manifest.md`, description: "Layer + prompt manifest" },
      { path: `exports/${slug}/brand.json`, description: "Brand asset refs + colors" },
    ],
    readme: `Creative Production Engine (stub) — ${cfg.label}. Export targets: ${targets.join(", ")}.`,
  };
}
