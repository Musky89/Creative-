import type { ProductionEngineInput, CompositionPlan } from "./types";
import { getModeConfig } from "./mode-registry";

export function buildCompositionPlan(input: ProductionEngineInput): CompositionPlan {
  const cfg = getModeConfig(input.mode);
  const layers = [
    {
      id: "bg",
      role: "Background / scene",
      zIndex: 0,
      source: "GENERATED" as const,
      notes: `Ground in: ${input.visualDirection.slice(0, 120)}`,
    },
    {
      id: "brand",
      role: "Logo / mark",
      zIndex: 10,
      source: input.brandAssets?.logoUrl ? ("BRAND_ASSET" as const) : ("TEXT" as const),
      notes: input.brandAssets?.logoUrl ? "Use provided logoUrl" : "Type-based mark placeholder",
    },
    {
      id: "type",
      role: "Headline + CTA",
      zIndex: 20,
      source: "TEXT" as const,
      notes: `${input.selectedHeadline} / ${input.selectedCta}`,
    },
  ];
  return {
    canvasAspect: cfg.typicalAspectRatios[0] ?? "1:1",
    safeAreaNotes: `${cfg.notes} — respect brandRulesSummary.`,
    layers,
  };
}
