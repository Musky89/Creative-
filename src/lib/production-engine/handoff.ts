import type { ProductionEngineInput, HandoffPackage } from "./types";
import { getModeConfig } from "./mode-registry";

export function buildHandoffPackage(input: ProductionEngineInput): HandoffPackage {
  const cfg = getModeConfig(input.mode);
  const slug = input.mode.toLowerCase();
  return {
    mode: input.mode,
    bundleName: `${slug}-production-bundle`,
    items: [
      { path: `exports/${slug}/hero.png`, description: "Composed hero" },
      { path: `exports/${slug}/manifest.md`, description: "Layer + prompt manifest" },
      { path: `exports/${slug}/brand.json`, description: "Brand asset refs + colors" },
    ],
    readme: `Creative Production Engine (stub) — ${cfg.label}. Formats: ${cfg.exportFormats.join(", ")}.`,
  };
}
