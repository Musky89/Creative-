/**
 * Registry of logical fal execution paths (unified visual backend).
 * IDs are fal model path strings where applicable; specialty paths are internal placeholders.
 */

export type FalPathKind =
  | "TEXT_TO_IMAGE"
  | "IMAGE_EDIT"
  | "LORA_TEXT_TO_IMAGE"
  | "LORA_IMAGE_EDIT"
  | "SPECIALTY";

export type FalPathDefinition = {
  id: string;
  kind: FalPathKind;
  label: string;
  description: string;
};

export const FAL_PATH_REGISTRY: Record<string, FalPathDefinition> = {
  "fal-ai/flux-general": {
    id: "fal-ai/flux-general",
    kind: "TEXT_TO_IMAGE",
    label: "Flux General (text-to-image)",
    description: "Default high-quality text-to-image; no reference image required.",
  },
  "fal-ai/flux/dev/image-to-image": {
    id: "fal-ai/flux/dev/image-to-image",
    kind: "IMAGE_EDIT",
    label: "Flux Dev image-to-image",
    description: "Edit or restyle from a base plate or reference raster.",
  },
  "fal-ai/flux-lora": {
    id: "fal-ai/flux-lora",
    kind: "LORA_TEXT_TO_IMAGE",
    label: "Flux + LoRA (text-to-image)",
    description: "Generation conditioned on a trained LoRA / style adapter.",
  },
  "fal-ai/flux-lora/image-to-image": {
    id: "fal-ai/flux-lora/image-to-image",
    kind: "LORA_IMAGE_EDIT",
    label: "Flux LoRA image-to-image",
    description: "Edit existing image while applying LoRA / brand style.",
  },
  "fal-ai/recraft/upscale": {
    id: "fal-ai/recraft/upscale",
    kind: "SPECIALTY",
    label: "Recraft upscale (specialty)",
    description: "Resolution / detail refinement utility.",
  },
  "internal/composition-only": {
    id: "internal/composition-only",
    kind: "SPECIALTY",
    label: "Composition-only (no fal image)",
    description: "Layout/export-first; skip fal image subscribe for this target.",
  },
};

export function getFalPathDefinition(pathId: string): FalPathDefinition | undefined {
  return FAL_PATH_REGISTRY[pathId];
}

export function listFalPaths(): FalPathDefinition[] {
  return Object.values(FAL_PATH_REGISTRY);
}
