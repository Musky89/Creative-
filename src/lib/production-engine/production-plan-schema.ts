/**
 * Shared Production Plan schema — discriminated by productionMode.
 * Validated with Zod; used by planner and API responses.
 */

import { z } from "zod";
import { PRODUCTION_MODES } from "./modes";

const productionModeEnum = z.enum(PRODUCTION_MODES);

/** Common fields for every mode. */
const productionPlanBaseSchema = z.object({
  productionMode: productionModeEnum,
  campaignCoreSummary: z.string(),
  selectedConceptSummary: z.string(),
  selectedHeadline: z.string(),
  selectedCta: z.string(),
  supportingCopySummary: z.string(),
  heroAssetIntent: z.string(),
  secondaryAssetIntent: z.string(),
  compositionIntent: z.string(),
  negativeSpaceIntent: z.string(),
  realismBias: z.enum(["photoreal", "stylized", "illustrative", "mixed"]),
  typographyIntent: z.string(),
  logoIntent: z.string(),
  finishingIntent: z.string(),
  exportTargets: z.array(z.string()).min(1),
  reviewFocus: z.array(z.string()).min(1),
  modeConstraints: z.array(z.string()),
});

const oohExtension = productionPlanBaseSchema.extend({
  productionMode: z.literal("OOH"),
  distanceReadabilityRule: z.string(),
  focalPointRule: z.string(),
  minimalTextRule: z.string(),
  negativeSpaceRequirement: z.string(),
});

const socialExtension = productionPlanBaseSchema.extend({
  productionMode: z.literal("SOCIAL"),
  contentSeriesIdea: z.string(),
  variationRules: z.string(),
  assetFamilyLogic: z.string(),
  recurringMotifRule: z.string(),
});

const packagingExtension = productionPlanBaseSchema.extend({
  productionMode: z.literal("PACKAGING"),
  shelfImpactObjective: z.string(),
  packFrontHierarchy: z.string(),
  claimsPriority: z.string(),
  variantSystemLogic: z.string(),
  structuredGridRule: z.string(),
});

const retailPosExtension = productionPlanBaseSchema.extend({
  productionMode: z.literal("RETAIL_POS"),
  promoHierarchy: z.string(),
  offerVisibilityRule: z.string(),
  urgencyTreatment: z.string(),
});

const identityExtension = productionPlanBaseSchema.extend({
  productionMode: z.literal("IDENTITY"),
  routePresentationLogic: z.string(),
  boardType: z.string(),
  identityNarrativeRule: z.string(),
});

const ecommerceFashionExtension = productionPlanBaseSchema.extend({
  productionMode: z.literal("ECOMMERCE_FASHION"),
  modelRole: z.string(),
  garmentRole: z.string(),
  poseIntent: z.string(),
  shotType: z.string(),
  sceneIntent: z.string(),
  catalogVsEditorialBias: z.string(),
});

const exportPresentationExtension = productionPlanBaseSchema.extend({
  productionMode: z.literal("EXPORT_PRESENTATION"),
  storyArc: z.string(),
  groupingLogic: z.string(),
  rationaleDensity: z.string(),
});

export const productionPlanDocumentSchema = z.discriminatedUnion(
  "productionMode",
  [
    oohExtension,
    socialExtension,
    packagingExtension,
    retailPosExtension,
    identityExtension,
    ecommerceFashionExtension,
    exportPresentationExtension,
  ],
);

export type ProductionPlanDocument = z.infer<typeof productionPlanDocumentSchema>;

/** Keys that exist on every mode (for UI / introspection). */
export const PRODUCTION_PLAN_COMMON_KEYS = [
  "productionMode",
  "campaignCoreSummary",
  "selectedConceptSummary",
  "selectedHeadline",
  "selectedCta",
  "supportingCopySummary",
  "heroAssetIntent",
  "secondaryAssetIntent",
  "compositionIntent",
  "negativeSpaceIntent",
  "realismBias",
  "typographyIntent",
  "logoIntent",
  "finishingIntent",
  "exportTargets",
  "reviewFocus",
  "modeConstraints",
] as const satisfies readonly (keyof z.infer<typeof productionPlanBaseSchema>)[];

export type ProductionPlanCommonKey = (typeof PRODUCTION_PLAN_COMMON_KEYS)[number];

export function splitProductionPlanForDisplay(plan: ProductionPlanDocument): {
  common: Record<string, unknown>;
  modeSpecific: Record<string, unknown>;
} {
  const common: Record<string, unknown> = {};
  const modeSpecific: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(plan)) {
    if ((PRODUCTION_PLAN_COMMON_KEYS as readonly string[]).includes(k)) {
      common[k] = v;
    } else {
      modeSpecific[k] = v;
    }
  }
  return { common, modeSpecific };
}
