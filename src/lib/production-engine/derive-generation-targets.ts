/**
 * Derives GenerationTarget[] from normalized input + production plan document.
 */

import type { ProductionEngineInput } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import type { GenerationTarget, RealismBias } from "./generation-targets";
import type { QualityTier } from "./fal-contracts";
import {
  buildAllSocialVariants,
  socialBatchCount,
} from "./mode-ooh-social";

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
    const oohNeg = [
      ...negRules(input),
      "busy street clutter competing with subject",
      "multiple faces competing for attention",
      "small type or fine print inside the image",
      "social-style UI chrome or mock phone frames",
    ];
    targets.push({
      id: tid("ooh-board"),
      targetType: "HERO_PHOTO",
      productionMode: mode,
      oohVariantLabel: "board-hero",
      roleInOutput: "Primary billboard raster — single focal, distance-readable silhouette.",
      ...baseHero,
      subjectIntent: `${plan.heroAssetIntent} Billboard: bold subject scale; readable at 50m equivalent; leave 30%+ negative field for platform type.`,
      backgroundIntent:
        "Soft environmental read or clean gradient — must not fight headline island.",
      compositionIntent:
        "Single center of gravity; rule of thirds bias; no dual heroes.",
      lightingIntent:
        "High subject/background separation; avoid muddy midtones at distance.",
      negativeRules: oohNeg,
      desiredBatchSize: qualityTier === "high" ? 2 : 1,
      evaluationFocus: [
        "distance legibility",
        "single focal dominance",
        "negative space budget",
        "clutter rejection",
        "print handoff (no embedded tiny type)",
      ],
    });
    targets.push({
      id: tid("ooh-plate"),
      targetType: "BACKGROUND_PLATE",
      productionMode: mode,
      oohVariantLabel: "type-proof-plate",
      roleInOutput: "Simplified plate for headline/CTA contrast check at print shop.",
      subjectIntent:
        "Minimal field: gradient or soft texture only — no competing subject.",
      backgroundIntent: "Clean; supports white or dark type overlay testing.",
      compositionIntent: "Upper-left or upper-third kept open for headline block.",
      lightingIntent: "Even; no harsh vignette on type zones.",
      realismBias: realism,
      brandVisualConstraints: brandVc,
      referenceSummary: refSummary(input),
      negativeRules: oohNeg,
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["type island contrast", "safe margin discipline"],
    });
    return targets;
  }

  if (mode === "SOCIAL") {
    const n = socialBatchCount(input.socialBatchPreset);
    const variants = buildAllSocialVariants(input);
    for (let i = 0; i < n; i++) {
      const v = variants[i]!;
      const isTextLed = v.family === "TEXT_LED";
      const isStatement = v.family === "STATEMENT";
      const isOffer = v.family === "OFFER_CTA";
      const typeHint =
        v.family === "PRODUCT_HERO"
          ? "HERO_PHOTO"
          : v.family === "LIFESTYLE"
            ? "LIFESTYLE_SCENE"
            : v.family === "STATEMENT"
              ? "LIFESTYLE_SCENE"
              : v.family === "OFFER_CTA"
                ? "RETAIL_PROMO_VISUAL"
                : "LIFESTYLE_SCENE";
      const targetType =
        typeHint === "HERO_PHOTO"
          ? "HERO_PHOTO"
          : typeHint === "RETAIL_PROMO_VISUAL"
            ? "RETAIL_PROMO_VISUAL"
            : "LIFESTYLE_SCENE";

      targets.push({
        id: tid(`social-${v.family.toLowerCase()}-${i}`),
        targetType,
        productionMode: mode,
        socialContentFamily: v.family,
        socialVariantIndex: i,
        roleInOutput: `Social slot ${i + 1}/${n} — ${v.family.replace(/_/g, " ").toLowerCase()}.`,
        subjectIntent: `${v.visualVariationHint} Campaign: ${input.selectedConcept.conceptName}. ${plan.heroAssetIntent.slice(0, 120)}`,
        backgroundIntent: isTextLed
          ? "Subdued plate; 50%+ calm field for typography dominance."
          : "Supports thumb-stop zone clarity; motif from references.",
        compositionIntent: isStatement
          ? "Bold negative space; subject smaller or corner-anchored."
          : isOffer
            ? "Promo-readable band; product still recognizable."
            : "Crop-safe for 1:1 / 4:5; hero zone upper or center.",
        lightingIntent:
          i % 3 === 0
            ? "Bright key, high clarity for feed."
            : i % 3 === 1
              ? "Softer editorial light; variety vs previous slot."
              : "Contrast pop for scroll stop.",
        realismBias: realism,
        brandVisualConstraints: `${brandVc} | family:${v.family} | slot:${i}`,
        referenceSummary: refSummary(input),
        negativeRules: [
          ...negRules(input),
          "clone of previous slot composition",
          "random aspect crop that breaks campaign DNA",
        ],
        styleModelRef: input.visualStyleRef,
        loraRef: baseHero.loraRef,
        desiredBatchSize: 1,
        evaluationFocus: [
          "family coherence",
          "non-duplicate vs siblings",
          "scroll-stop",
          "safe crop",
        ],
      });
    }
    return targets;
  }

  if (mode === "PACKAGING") {
    const packNeg = [
      ...negRules(input),
      "consumer-facing brand name or claims text in the raster",
      "nutrition facts or legal copy inside generated image",
      "barcode or QR in generated image",
      "ad-style tagline supers over product",
    ];
    targets.push({
      id: tid("pack-ingredient"),
      targetType: "INGREDIENT_IMAGE",
      productionMode: mode,
      packagingRetailRole: "INGREDIENT_MOOD",
      roleInOutput: "FAL: ingredient / food / material hero for FOP panel (no type).",
      subjectIntent:
        "Isolated ingredient or product macro for panel inset — clean edges for composer mask.",
      backgroundIntent: "Neutral or soft studio; no packaging mockup with text.",
      compositionIntent: "Subject only; composer places inside hero rect on grid.",
      lightingIntent: "Product photography; even, print-safe.",
      realismBias: realism,
      brandVisualConstraints: brandVc + " | NO TEXT IN OUTPUT",
      referenceSummary: refSummary(input),
      negativeRules: packNeg,
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["subject isolation", "no embedded type", "shelf appetite"],
    });
    targets.push({
      id: tid("pack-texture"),
      targetType: "SUPPORTING_TEXTURE",
      productionMode: mode,
      packagingRetailRole: "TEXTURE_PLATE",
      roleInOutput: "FAL: subtle texture tile for FOP background zones.",
      subjectIntent: "Abstract brand texture, grain, or pattern — low contrast.",
      backgroundIntent: "Seamless-tile friendly; no focal competition.",
      compositionIntent: "Fills texture band under claims in composer.",
      lightingIntent: "Flat; packaging print safe.",
      realismBias: realism,
      brandVisualConstraints: brandVc,
      referenceSummary: refSummary(input),
      negativeRules: packNeg,
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["tile safety", "contrast under type"],
    });
    targets.push({
      id: tid("pack-product-support"),
      targetType: "PRODUCT_COMPONENT",
      productionMode: mode,
      packagingRetailRole: "PRODUCT_SUPPORT",
      roleInOutput: "FAL: pack or bottle hero without label copy (plain mock).",
      subjectIntent:
        "Product form / silhouette for FOP — labels blank or generic; composer adds real claims.",
      backgroundIntent: "Clean studio; minimal props.",
      compositionIntent: "Hero panel placement only; grid reserves text columns.",
      lightingIntent: "Shelf-ready clarity.",
      realismBias: realism,
      brandVisualConstraints: brandVc + " | blank or generic label only",
      referenceSummary: refSummary(input),
      negativeRules: [
        ...packNeg,
        "readable fake nutrition panel in image",
        "competitor logos",
      ],
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["silhouette clarity", "label-free for composer"],
    });
    return targets;
  }

  if (mode === "RETAIL_POS") {
    const retailNeg = [
      ...negRules(input),
      "final price numerals or $ in generated image",
      "fine print legal inside raster",
      "social-style UI or phone mockup",
    ];
    targets.push({
      id: tid("retail-product"),
      targetType: "PRODUCT_COMPONENT",
      productionMode: mode,
      packagingRetailRole: "PRODUCT_SUPPORT",
      roleInOutput: "FAL: product hero for POS — no offer text in raster.",
      subjectIntent:
        "Product recognition at shelf distance; clean pack or bottle without promo type.",
      backgroundIntent: "Retail-neutral; optional soft gradient.",
      compositionIntent: "Composer allocates promo bands around this rect.",
      lightingIntent: "Bright; in-store lighting tolerant.",
      realismBias: realism,
      brandVisualConstraints: brandVc,
      referenceSummary: refSummary(input),
      negativeRules: retailNeg,
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["product legibility", "no baked offer"],
    });
    targets.push({
      id: tid("retail-promo-scene"),
      targetType: "RETAIL_PROMO_VISUAL",
      productionMode: mode,
      packagingRetailRole: "PROMO_SCENE",
      roleInOutput: "FAL: optional appetite / lifestyle accent — still no final price.",
      subjectIntent:
        "Supporting appetite or seasonal cue; subordinate to product window in compose.",
      backgroundIntent: "Warm retail context without readable signage in frame.",
      compositionIntent: "Secondary panel or strip; composer owns headline/price.",
      lightingIntent: baseHero.lightingIntent,
      realismBias: realism,
      brandVisualConstraints: brandVc,
      referenceSummary: refSummary(input),
      negativeRules: retailNeg,
      styleModelRef: input.visualStyleRef,
      loraRef: baseHero.loraRef,
      desiredBatchSize: 1,
      evaluationFocus: ["promo support without type", "balance with product"],
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

  targets.push({
    id: tid("hero"),
    targetType: "HERO_PHOTO",
    productionMode: mode,
    roleInOutput: "Primary campaign visual.",
    ...baseHero,
  });
  return targets;
}
