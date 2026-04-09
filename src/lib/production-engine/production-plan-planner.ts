/**
 * Deterministic Production Plan builder from normalized input + mode config.
 * For future LLM-assisted planning, add a sibling module and swap behind a flag.
 */

import type { ProductionEngineInput } from "./types";
import type {
  ProductionPlanDocument,
} from "./production-plan-schema";
import { getModeConfig } from "./mode-registry";
import { socialBatchCount } from "./mode-ooh-social";

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

  let heroAssetIntent = `Primary visual expressing "${input.selectedConcept.conceptName}" — ${input.visualDirection.slice(0, 200)}`;
  let secondaryAssetIntent =
    input.visualSpecNotes ??
    "Supporting crop or variant derived from hero after mode rules.";
  let compositionIntent = cfg.compositionPriorities.join(" → ");
  let negativeSpaceIntent =
    cfg.id === "OOH" || cfg.id === "IDENTITY"
      ? "Generous negative space; avoid crowding the focal read."
      : cfg.id === "PACKAGING"
        ? "Structured negative space per grid; legal zones untouched."
        : "Balance text and visual breathing room per platform or panel.";
  let realismBias: ProductionPlanDocument["realismBias"] =
    cfg.id === "EXPORT_PRESENTATION"
      ? "mixed"
      : cfg.id === "IDENTITY"
        ? "illustrative"
        : cfg.id === "ECOMMERCE_FASHION"
          ? "photoreal"
          : "photoreal";
  let typographyIntent = [
    input.visualDirection.slice(0, 120),
    input.brandRulesSummary.slice(0, 120),
  ]
    .filter(Boolean)
    .join(" | ");
  let exportTargets = [...cfg.exportFormats, ...cfg.typicalAspectRatios.slice(0, 2)];
  let reviewFocus = [...cfg.reviewFocus];
  let modeConstraints = [
    cfg.objective,
    ...cfg.successCriteria.slice(0, 3),
    cfg.textTolerance,
  ];

  if (input.mode === "OOH") {
    heroAssetIntent = `Billboard-scale single focal: "${input.selectedConcept.conceptName}" — bold silhouette, no fine print in-image; ${input.visualDirection.slice(0, 160)}`;
    secondaryAssetIntent =
      "Type-lockup proof plate: flat or softly graded field; reserve 35%+ frame for headline clear zone.";
    compositionIntent =
      "OOH: focal dominance → negative space → one message → logo tertiary; never social crop logic.";
    negativeSpaceIntent =
      "Minimum 30% clean area for headline + logo; no competing subjects at horizon line.";
    realismBias = "photoreal";
    typographyIntent =
      "OOH type: ultra-short headline; max 8 words; high contrast; no body copy on board.";
    exportTargets = [
      "png-print-300dpi",
      "pdf-proof",
      ...cfg.exportFormats,
      "14:48",
      "4:1",
    ];
    reviewFocus = [
      "distance readability",
      "hero dominance",
      "text economy",
      "clutter rejection",
      "print handoff readiness",
    ];
    modeConstraints = [
      "OOH: one dominant message only",
      "OOH: strong focal point; single center of gravity",
      "OOH: minimal on-board text — platform sets type in compose",
      "OOH: billboard logic not scaled social",
      ...modeConstraints,
    ];
  }

  if (input.mode === "SOCIAL") {
    const batchN = socialBatchCount(input.socialBatchPreset);
    heroAssetIntent = `Social campaign family (${batchN} slot${batchN > 1 ? "s" : ""}): "${input.selectedConcept.conceptName}" — scroll-stop + controlled variation; ${input.visualDirection.slice(0, 140)}`;
    secondaryAssetIntent =
      "Variant set: product hero, lifestyle, statement, offer, text-led — same DNA, different layout weight.";
    compositionIntent =
      "SOCIAL: recurring motif/color bar + crop-safe master; vary angle not strategy.";
    negativeSpaceIntent =
      "Thumb-stop zone (upper/center) kept clear; bottom band for type on hero-bottom layouts.";
    realismBias = "photoreal";
    typographyIntent =
      "Social: scannable headline; CTA readable at feed scale; family-consistent type voice.";
    exportTargets = [
      `batch-${batchN}`,
      "1:1",
      "4:5",
      "9:16",
      ...cfg.exportFormats,
    ];
    reviewFocus = [
      "set coherence",
      "non-repetition across batch",
      "scroll-stopping contrast",
      "visual variety within system",
    ];
    modeConstraints = [
      `SOCIAL batch: ${batchN} assets`,
      "SOCIAL: controlled variation — rotate content family, lock strategy",
      "SOCIAL: campaign DNA from references + concept",
      ...modeConstraints,
    ];
  }

  return {
    campaignCoreSummary: campaignCoreSummary(input),
    selectedConceptSummary: conceptSummary(input),
    selectedHeadline: input.selectedHeadline,
    selectedCta: input.selectedCta,
    supportingCopySummary: supportingSummary(input),
    heroAssetIntent,
    secondaryAssetIntent,
    compositionIntent,
    negativeSpaceIntent,
    realismBias,
    typographyIntent,
    logoIntent: input.brandAssets?.logoUrl
      ? "Use supplied logo lockup in mode-appropriate zone."
      : input.brandAssets?.logoDescription
        ? `Compose type-based mark from: ${input.brandAssets.logoDescription}`
        : "Type-forward or placeholder mark per brand rules.",
    finishingIntent: [
      `Color discipline: ${input.brandAssets?.colors?.map((c) => c.hex).join(", ") ?? "from brand OS"}`,
      input.mode === "OOH"
        ? "OOH: print-safe margins + bleed notes in exportDpiNote."
        : input.mode === "SOCIAL"
          ? "SOCIAL: platform-safe overlays; optional bottom scrim."
          : "Print-safe or web-optimized export per exportTargets.",
    ].join(" "),
    exportTargets,
    reviewFocus,
    modeConstraints,
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
  const base = baseFromInput(input);

  switch (input.mode) {
    case "OOH":
      return {
        productionMode: "OOH",
        ...base,
        distanceReadabilityRule:
          "Simulate 3s drive-by: headline readable at 50% scale on proof; no sub-24px-equivalent type on final board width.",
        focalPointRule:
          "Exactly one hero subject or mark; secondary elements must not compete for gaze.",
        minimalTextRule:
          "On-board raster: zero body copy; headline/CTA live in compose layer only — max 8-word headline equivalent.",
        negativeSpaceRequirement:
          "≥30% of frame uncluttered (sky, flat field, or soft bokeh) reserved for type + logo islands.",
      };
    case "SOCIAL": {
      const n = socialBatchCount(input.socialBatchPreset);
      return {
        productionMode: "SOCIAL",
        ...base,
        contentSeriesIdea: `Family anchored on "${input.selectedConcept.conceptName}" with recurring color/motif from references.`,
        variationRules: `Batch ${n}: cycle PRODUCT_HERO, LIFESTYLE, STATEMENT, OFFER_CTA, TEXT_LED — vary crop/light/subject scale; never duplicate identical layout twice in a row.`,
        assetFamilyLogic:
          "One campaign DNA string (colors + motif + tone); per-slot family shifts layout archetype weight, not brand strategy.",
        recurringMotifRule:
          "Every slot includes the same anchor element (color bar width, corner radius, or texture stamp) for feed recognition.",
      };
    }
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
