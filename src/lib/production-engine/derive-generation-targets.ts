/**
 * Derives GenerationTarget[] from normalized input + production plan document.
 */

import type { ProductionEngineInput } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import type { GenerationTarget, RealismBias } from "./generation-targets";
import type { QualityTier } from "./fal-contracts";

function realismFromPlan(plan: ProductionPlanDocument): RealismBias {
  return plan.realismBias;
}

function negRules(input: ProductionEngineInput): string[] {
  const base = [
    "generic stock photo",
    "watermark",
    "low resolution",
    "distorted text in image",
  ];
  if (input.brandRulesSummary) {
    base.push(`Violate brand rules: ${input.brandRulesSummary.slice(0, 200)}`);
  }
  return base;
}

function refSummary(input: ProductionEngineInput): string {
  return input.referenceSummaries.join(" | ").slice(0, 800) || "(no references)";
}

let targetSeq = 0;
function tid(prefix: string): string {
  targetSeq += 1;
  return `gt-${prefix}-${targetSeq}`;
}

export function deriveGenerationTargets(
  input: ProductionEngineInput,
  plan: ProductionPlanDocument,
  qualityTier: QualityTier,
): GenerationTarget[] {
  const mode = input.mode;
  const realism = realismFromPlan(plan);
  const brandVc = [
    input.brandRulesSummary.slice(0, 300),
    input.brandOperatingSystemSummary?.slice(0, 200),
  ]
    .filter(Boolean)
    .join(" · ");

  const batch =
    qualityTier === "high" ? 2 : qualityTier === "standard" ? 2 : 1;

  const baseHero: Omit<
    GenerationTarget,
    "targetType" | "id" | "roleInOutput" | "productionMode"
  > = {
    subjectIntent: plan.heroAssetIntent,
    backgroundIntent: plan.negativeSpaceIntent,
    compositionIntent: plan.compositionIntent,
    lightingIntent: "Follow visual direction and reference mood; motivated key where applicable.",
    realismBias: realism,
    brandVisualConstraints: brandVc || "Apply brand OS and banned-list discipline.",
    referenceSummary: refSummary(input),
    negativeRules: negRules(input),
    styleModelRef: input.visualStyleRef,
    loraRef: input.modelRef?.includes("lora") ? input.modelRef : undefined,
    desiredBatchSize: batch,
    evaluationFocus: [...plan.reviewFocus],
  };

  const targets: GenerationTarget[] = [];

  if (mode === "EXPORT_PRESENTATION") {
    targets.push({
      id: tid("export"),
      targetType: "IDENTITY_BOARD_VISUAL",
      productionMode: mode,
      roleInOutput: "Optional deck hero — often skipped for composition-only.",
      ...baseHero,
      subjectIntent: "Presentation cover or chapter divider visual (minimal).",
      desiredBatchSize: 1,
    });
    return targets;
  }

  if (mode === "OOH") {
    targets.push({
      id: tid("ooh-hero"),
      targetType: "HERO_PHOTO",
      productionMode: mode,
      roleInOutput: "Primary billboard / large-format hero visual.",
      ...baseHero,
      evaluationFocus: [...baseHero.evaluationFocus, "distance legibility", "focal clarity"],
    });
    targets.push({
      id: tid("ooh-bg"),
      targetType: "BACKGROUND_PLATE",
      productionMode: mode,
      roleInOutput: "Simplified plate for type lockup tests.",
      subjectIntent: "Minimal environment plate; negative space for headline.",
      backgroundIntent: "Clean gradient or environmental soft read.",
      compositionIntent: "Upper third clear for type.",
      lightingIntent: baseHero.lightingIntent,
      realismBias: realism,
      brandVisualConstraints: brandVc,
      referenceSummary: refSummary(input),
      negativeRules: negRules(input),
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["negative space", "contrast for type"],
    });
    return targets;
  }

  if (mode === "SOCIAL") {
    targets.push({
      id: tid("social-hero"),
      targetType: "LIFESTYLE_SCENE",
      productionMode: mode,
      roleInOutput: "Feed / story hero for campaign family.",
      ...baseHero,
      desiredBatchSize: Math.max(batch, 2),
    });
    targets.push({
      id: tid("social-variant"),
      targetType: "DETAIL_CROP",
      productionMode: mode,
      roleInOutput: "Crop-safe detail for carousel or alt aspect.",
      subjectIntent: "Macro or product detail matching hero world.",
      backgroundIntent: baseHero.backgroundIntent,
      compositionIntent: "Center-weighted; safe for 1:1 and 4:5.",
      lightingIntent: baseHero.lightingIntent,
      realismBias: realism,
      brandVisualConstraints: brandVc,
      referenceSummary: refSummary(input),
      negativeRules: negRules(input),
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["crop safety", "family consistency"],
    });
    return targets;
  }

  if (mode === "PACKAGING") {
    targets.push({
      id: tid("pack-mood"),
      targetType: "PACKAGING_MOOD_IMAGE",
      productionMode: mode,
      roleInOutput: "FOP mood / ingredient / product hero for panel.",
      ...baseHero,
    });
    targets.push({
      id: tid("pack-texture"),
      targetType: "SUPPORTING_TEXTURE",
      productionMode: mode,
      roleInOutput: "Subtle texture or pattern layer under grid.",
      subjectIntent: "Brand-true texture; low contrast for type overlay.",
      backgroundIntent: "Flat or shallow depth.",
      compositionIntent: "Tile-friendly or panel crop.",
      lightingIntent: "Even, packaging-print safe.",
      realismBias: realism,
      brandVisualConstraints: brandVc,
      referenceSummary: refSummary(input),
      negativeRules: negRules(input),
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["print safety", "grid alignment hint"],
    });
    return targets;
  }

  if (mode === "RETAIL_POS") {
    targets.push({
      id: tid("retail"),
      targetType: "RETAIL_PROMO_VISUAL",
      productionMode: mode,
      roleInOutput: "POS hero with promo readability.",
      ...baseHero,
      evaluationFocus: [...baseHero.evaluationFocus, "offer visibility"],
    });
    return targets;
  }

  if (mode === "IDENTITY") {
    targets.push({
      id: tid("id-board"),
      targetType: "IDENTITY_BOARD_VISUAL",
      productionMode: mode,
      roleInOutput: "Neutral board backdrop or mark context exploration.",
      ...baseHero,
      subjectIntent: "Clean board visual supporting route comparison.",
      realismBias: "illustrative",
    });
    return targets;
  }

  if (mode === "ECOMMERCE_FASHION") {
    targets.push({
      id: tid("model"),
      targetType: "MODEL_SHOT",
      productionMode: mode,
      roleInOutput: "Primary on-model or ghost mannequin hero.",
      ...baseHero,
      subjectIntent: plan.heroAssetIntent + " — garment silhouette truth.",
      evaluationFocus: [...baseHero.evaluationFocus, "fabric truth", "SKU consistency"],
    });
    targets.push({
      id: tid("detail"),
      targetType: "DETAIL_CROP",
      productionMode: mode,
      roleInOutput: "Construction / texture detail.",
      subjectIntent: "Stitch, weave, or hardware detail.",
      backgroundIntent: "Neutral; no competing product.",
      compositionIntent: "Macro framing.",
      lightingIntent: "Soft product light.",
      realismBias: "photoreal",
      brandVisualConstraints: brandVc,
      referenceSummary: refSummary(input),
      negativeRules: negRules(input),
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["detail clarity"],
    });
    return targets;
  }

  // Fallback: ingredient / product split for generic
  targets.push({
    id: tid("hero"),
    targetType: "HERO_PHOTO",
    productionMode: mode,
    roleInOutput: "Primary campaign visual.",
    ...baseHero,
  });
  return targets;
}
