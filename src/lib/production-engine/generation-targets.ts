/**
 * Reusable visual generation targets for the FAL-first execution layer.
 */

import type { ProductionMode } from "./modes";
import type { SocialContentFamily } from "./mode-ooh-social";

export const GENERATION_TARGET_TYPES = [
  "HERO_PHOTO",
  "BACKGROUND_PLATE",
  "SUPPORTING_TEXTURE",
  "INGREDIENT_IMAGE",
  "PRODUCT_COMPONENT",
  "MODEL_SHOT",
  "PACKAGING_MOOD_IMAGE",
  "IDENTITY_BOARD_VISUAL",
  "RETAIL_PROMO_VISUAL",
  "LIFESTYLE_SCENE",
  "DETAIL_CROP",
] as const;

export type GenerationTargetType = (typeof GENERATION_TARGET_TYPES)[number];

export type RealismBias = "photoreal" | "stylized" | "illustrative" | "mixed";

export type GenerationTarget = {
  /** Stable id for traceability (contracts, logs). */
  id: string;
  targetType: GenerationTargetType;
  productionMode: ProductionMode;
  /** How this asset sits in the final composed output. */
  roleInOutput: string;
  subjectIntent: string;
  backgroundIntent: string;
  compositionIntent: string;
  lightingIntent: string;
  realismBias: RealismBias;
  brandVisualConstraints: string;
  referenceSummary: string;
  negativeRules: string[];
  /** Brand visual style / trained style ref (fal LoRA endpoint input). */
  styleModelRef?: string;
  /** Optional explicit LoRA or adapter id for fal. */
  loraRef?: string;
  desiredBatchSize: number;
  evaluationFocus: string[];
  /** SOCIAL: content family for this slice of the batch. */
  socialContentFamily?: SocialContentFamily;
  /** SOCIAL: index within batch (0-based). */
  socialVariantIndex?: number;
  /** OOH: label for hero vs plate vs proof. */
  oohVariantLabel?: string;
  /** PACKAGING / RETAIL: role for routing (support vs product — never final FOP text). */
  packagingRetailRole?:
    | "INGREDIENT_MOOD"
    | "TEXTURE_PLATE"
    | "PRODUCT_SUPPORT"
    | "PROMO_SCENE";
};
