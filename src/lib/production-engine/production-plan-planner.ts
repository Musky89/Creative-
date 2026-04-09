/**
 * Deterministic Production Plan builder from normalized input + mode config.
 * For future LLM-assisted planning, add a sibling module and swap behind a flag.
 */

import type { ProductionEngineInput } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import { getModeConfig } from "./mode-registry";

function campaignCoreSummary(input: ProductionEngineInput): string {
  const c = input.campaignCore;
  if (!c) return input.briefSummary.slice(0, 280);
  return [
    c.singleLineIdea,
    c.emotionalTension,
    c.visualNarrative,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);
}

function conceptSummary(input: ProductionEngineInput): string {
  const s = input.selectedConcept;
  return [s.conceptName, s.hook, s.rationale, s.visualDirection]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 500);
}

function supportingSummary(input: ProductionEngineInput): string {
  return (input.supportingCopy ?? "").slice(0, 400) || "(none)";
}

function baseFromInput(
  input: ProductionEngineInput,
): Pick<
  ProductionPlanDocument,
  | "campaignCoreSummary"
  | "selectedConceptSummary"
  | "selectedHeadline"
  | "selectedCta"
  | "supportingCopySummary"
  | "heroAssetIntent"
  | "secondaryAssetIntent"
  | "compositionIntent"
  | "negativeSpaceIntent"
  | "realismBias"
  | "typographyIntent"
  | "logoIntent"
  | "finishingIntent"
  | "exportTargets"
  | "reviewFocus"
  | "modeConstraints"
> {
  const cfg = getModeConfig(input.mode);
  return {
    campaignCoreSummary: campaignCoreSummary(input),
    selectedConceptSummary: conceptSummary(input),
    selectedHeadline: input.selectedHeadline,
    selectedCta: input.selectedCta,
    supportingCopySummary: supportingSummary(input),
    heroAssetIntent: `Primary visual expressing "${input.selectedConcept.conceptName}" — ${input.visualDirection.slice(0, 200)}`,
    secondaryAssetIntent:
      input.visualSpecNotes ??
      "Supporting crop or variant derived from hero after mode rules.",
    compositionIntent: cfg.compositionPriorities.join(" → "),
    negativeSpaceIntent:
      cfg.id === "OOH" || cfg.id === "IDENTITY"
        ? "Generous negative space; avoid crowding the focal read."
        : cfg.id === "PACKAGING"
          ? "Structured negative space per grid; legal zones untouched."
          : "Balance text and visual breathing room per platform or panel.",
    realismBias:
      cfg.id === "EXPORT_PRESENTATION"
        ? "mixed"
        : cfg.id === "IDENTITY"
          ? "illustrative"
          : cfg.id === "ECOMMERCE_FASHION"
            ? "photoreal"
            : "photoreal",
    typographyIntent: [
      input.visualDirection.slice(0, 120),
      input.brandRulesSummary.slice(0, 120),
    ]
      .filter(Boolean)
      .join(" | "),
    logoIntent: input.brandAssets?.logoUrl
      ? "Use supplied logo lockup in mode-appropriate zone."
      : input.brandAssets?.logoDescription
        ? `Compose type-based mark from: ${input.brandAssets.logoDescription}`
        : "Type-forward or placeholder mark per brand rules.",
    finishingIntent: [
      `Color discipline: ${input.brandAssets?.colors?.map((c) => c.hex).join(", ") ?? "from brand OS"}`,
      "Print-safe or web-optimized export per exportTargets.",
    ].join(" "),
    exportTargets: [...cfg.exportFormats, ...cfg.typicalAspectRatios.slice(0, 2)],
    reviewFocus: cfg.reviewFocus,
    modeConstraints: [
      cfg.objective,
      ...cfg.successCriteria.slice(0, 3),
      cfg.textTolerance,
    ],
  };
}

/** Extension point: async AI planner could replace body later. */
export type ProductionPlanPlannerOptions = {
  /** Reserved for future: 'deterministic' | 'ai' */
  strategy?: "deterministic";
};

export function buildProductionPlanDocument(
  input: ProductionEngineInput,
  options?: ProductionPlanPlannerOptions,
): ProductionPlanDocument {
  void options;
  const cfg = getModeConfig(input.mode);
  const base = baseFromInput(input);

  switch (input.mode) {
    case "OOH":
      return {
        productionMode: "OOH",
        ...base,
        distanceReadabilityRule:
          "Headline must remain legible at planned viewing distance; test at 50% scale minimum.",
        focalPointRule:
          "Single dominant focal — product, face, or mark; no competing centers.",
        minimalTextRule: cfg.textTolerance,
        negativeSpaceRequirement:
          "Maintain minimum 20% clear area around headline block where layout allows.",
      };
    case "SOCIAL":
      return {
        productionMode: "SOCIAL",
        ...base,
        contentSeriesIdea: `Family anchored on "${input.selectedConcept.conceptName}" with recurring color/motif from references.`,
        variationRules:
          "Headline lock or rotate max one line per variant; visual may shift crop, not strategy.",
        assetFamilyLogic:
          "Derive 1:1, 4:5, 9:16 from one master composition with safe-area-aware reflow.",
        recurringMotifRule:
          "Repeat one visual anchor (texture, shape, or color bar) across batch for scroll recognition.",
      };
    case "PACKAGING":
      return {
        productionMode: "PACKAGING",
        ...base,
        shelfImpactObjective:
          "Win 3-second aisle scan — brand block + variant + hero benefit legible.",
        packFrontHierarchy: "Brand → sub-brand/variant → hero claim → mandatory nutrition/legal.",
        claimsPriority: "Regulatory and nutrition claims outrank marketing sublines on FOP.",
        variantSystemLogic:
          "Color stripe or icon system differentiates SKU while preserving master grid.",
        structuredGridRule:
          "All type and marks snap to 8px grid; no optical drift between panels.",
      };
    case "RETAIL_POS":
      return {
        productionMode: "RETAIL_POS",
        ...base,
        promoHierarchy: "Offer / price → product → supporting proof → legal footnote.",
        offerVisibilityRule:
          "Primary offer occupies upper third or center band per format; min contrast 4.5:1.",
        urgencyTreatment:
          "Time-bound language paired with clear end date or 'while supplies last' stub.",
      };
    case "IDENTITY":
      return {
        productionMode: "IDENTITY",
        ...base,
        routePresentationLogic:
          "Side-by-side boards: equal scale, neutral background, same lighting convention.",
        boardType: "Route comparison + exploration grid + single application preview.",
        identityNarrativeRule:
          "Each route ties to strategic tension from brief — name the tradeoff in caption.",
      };
    case "ECOMMERCE_FASHION":
      return {
        productionMode: "ECOMMERCE_FASHION",
        ...base,
        modelRole:
          "Model supports garment read — pose serves fit, drape, and proportion truth.",
        garmentRole: "Hero SKU — color and silhouette must match listing metadata.",
        poseIntent:
          "Three-quarter or straight-on per shot plan; avoid pose that hides construction.",
        shotType: "Hero on white or brand set per SKU set; detail crop second.",
        sceneIntent: input.visualDirection.slice(0, 200) || "Minimal set, brand-aligned props.",
        catalogVsEditorialBias:
          input.visualSpecNotes?.toLowerCase().includes("editorial")
            ? "editorial-leaning with catalog-safe crop"
            : "catalog-first; editorial only in lookbook variants",
      };
    case "EXPORT_PRESENTATION":
      return {
        productionMode: "EXPORT_PRESENTATION",
        ...base,
        storyArc:
          "Agenda → insight → concept reveal → copy/visual proof → identity (if any) → next steps.",
        groupingLogic:
          "Pair each creative artifact with its rationale slide; appendix for specs.",
        rationaleDensity:
          "Founder deck: medium density. Client teaser: low — visuals lead.",
      };
    default: {
      const _never: never = input.mode;
      throw new Error(`Unhandled production mode: ${String(_never)}`);
    }
  }
}
