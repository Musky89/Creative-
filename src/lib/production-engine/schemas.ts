import { z } from "zod";
import { PRODUCTION_MODES } from "./modes";
import { LAYOUT_ARCHETYPES } from "./layout-archetypes";
import { SOCIAL_CONTENT_FAMILIES } from "./mode-ooh-social";
import {
  PACKAGING_VARIANT_KEYS,
  RETAIL_POS_VARIANT_KEYS,
} from "./mode-packaging-retail";
import {
  FASHION_OUTPUT_FAMILIES,
  IDENTITY_ROUTE_KEYS,
} from "./mode-identity-fashion-export";
import { socialOutputTargetSchema, socialPlatformIdSchema } from "./channel-specs";
import { packagingDielineDocumentSchema } from "./packaging-dieline";

const productionModeSchema = z.enum(PRODUCTION_MODES);

const campaignCoreSchema = z
  .object({
    singleLineIdea: z.string().optional(),
    emotionalTension: z.string().optional(),
    visualNarrative: z.string().optional(),
  })
  .optional();

const brandAssetsSchema = z
  .object({
    logoUrl: z.string().optional(),
    logoDescription: z.string().optional(),
    fonts: z
      .array(
        z.object({
          family: z.string(),
          weights: z.array(z.string()).optional(),
          sourceNote: z.string().optional(),
        }),
      )
      .optional(),
    colors: z
      .array(
        z.object({
          name: z.string().optional(),
          hex: z.string(),
          role: z.string().optional(),
        }),
      )
      .optional(),
    otherAssetNotes: z.string().optional(),
  })
  .optional();

const qualityTierSchema = z
  .enum(["draft", "standard", "high", "premium"])
  .optional();
const layoutArchetypeSchema = z.enum(LAYOUT_ARCHETYPES).optional();
const socialBatchPresetSchema = z.enum(["1", "7", "15", "30"]).optional();
const socialFamilySchema = z.enum(SOCIAL_CONTENT_FAMILIES);

export const productionEngineInputSchema = z.object({
  mode: productionModeSchema,
  briefSummary: z.string().min(1, "briefSummary required"),
  campaignCore: campaignCoreSchema,
  selectedConcept: z.object({
    conceptId: z.string().optional(),
    conceptName: z.string().min(1),
    hook: z.string().optional(),
    rationale: z.string().optional(),
    visualDirection: z.string().optional(),
  }),
  selectedHeadline: z.string().min(1),
  selectedCta: z.string().min(1),
  supportingCopy: z.string().optional(),
  visualDirection: z.string().min(1),
  visualSpecNotes: z.string().optional(),
  referenceSummaries: z.array(z.string()),
  brandRulesSummary: z.string().min(1),
  brandOperatingSystemSummary: z.string().optional(),
  brandAssets: brandAssetsSchema,
  visualStyleRef: z.string().optional(),
  modelRef: z.string().optional(),
  visualQualityTier: qualityTierSchema,
  layoutArchetype: layoutArchetypeSchema,
  heroImageUrl: z.string().optional(),
  secondaryImageUrl: z.string().optional(),
  tertiaryImageUrl: z.string().optional(),
  socialBatchPreset: socialBatchPresetSchema,
  socialContentFamilies: z.array(socialFamilySchema).optional(),
  socialVariantIndex: z.number().int().min(0).max(99).optional(),
  /** SOCIAL: canvas = platform spec; use showcase_master for 4:5 “build once” then repurpose */
  socialOutputTarget: socialOutputTargetSchema.optional(),
  /** SOCIAL: when composing showcase master, API may return extra resized PNGs */
  socialRepurposePlatformIds: z.array(socialPlatformIdSchema).optional(),
  /** PACKAGING: optional dieline tightens safe margins */
  packagingDieline: packagingDielineDocumentSchema.optional(),
  /** Post-compose QA rules */
  outputVerificationRules: z
    .object({
      bannedSubstrings: z.array(z.string()).optional(),
      requireLegalStripNonEmpty: z.boolean().optional(),
    })
    .optional(),
  /** Handoff / workflow */
  handoffApproval: z
    .object({
      status: z.enum(["draft", "in_review", "approved"]),
      approvedAt: z.string().optional(),
      approvedBy: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  packagingVariant: z.enum(PACKAGING_VARIANT_KEYS).optional(),
  retailPosVariant: z.enum(RETAIL_POS_VARIANT_KEYS).optional(),
  fashionBatchPreset: z.enum(["1", "4"]).optional(),
  fashionOutputFamilies: z.array(z.enum(FASHION_OUTPUT_FAMILIES)).optional(),
  fashionVariantIndex: z.number().int().min(0).max(15).optional(),
  exportSlideIndex: z.number().int().min(0).max(12).optional(),
  identityRouteHighlight: z.enum(IDENTITY_ROUTE_KEYS).optional(),
});

export type ProductionEngineInputParsed = z.infer<
  typeof productionEngineInputSchema
>;
