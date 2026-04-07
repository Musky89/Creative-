import {
  BRAND_STYLE_MAX_IMAGES,
  BRAND_STYLE_MIN_IMAGES,
} from "@/lib/visual/brand-visual-style-limits";

export { BRAND_STYLE_MAX_IMAGES, BRAND_STYLE_MIN_IMAGES };
/** Hours between training runs (anti spam / cost). */
export const BRAND_STYLE_TRAIN_COOLDOWN_HOURS = 12;

export const FAL_TRAINING_ENDPOINT = "fal-ai/flux-lora-fast-training" as const;
export const FAL_GENERATION_ENDPOINT = "fal-ai/flux-general" as const;

/** Lowercase trigger baked into captions / test prompts when a style pack exists. */
export const BRAND_STYLE_TRIGGER_WORD = "brandvisualstyle";
