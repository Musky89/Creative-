/**
 * Creative Testing Lab — optional real FAL calls (server-only).
 * Uses @fal-ai/client; requires FAL_KEY.
 */

import { createFalClient } from "@fal-ai/client";
import type { FalExecutionRequest } from "@/lib/production-engine/fal-contracts";
import type { QualityTier } from "@/lib/production-engine/fal-contracts";

export type LabExecutionKind =
  | "router_default"
  | "force_text"
  | "force_edit"
  | "force_lora"
  | "force_lora_edit";

export type FalExecuteTargetResult = {
  targetIndex: number;
  targetId: string;
  pathId: string;
  ok: boolean;
  imageUrls: string[];
  error?: string;
  raw?: unknown;
};

function extractImageUrls(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const images = (data as { images?: Array<{ url?: string }> }).images;
  if (!Array.isArray(images)) return [];
  return images.map((i) => i.url).filter((u): u is string => typeof u === "string");
}

function imageSizeForTier(tier: QualityTier | undefined): "square_hd" | "landscape_4_3" | "portrait_4_3" {
  if (tier === "premium" || tier === "high") return "landscape_4_3";
  if (tier === "draft") return "square_hd";
  return "portrait_4_3";
}

function loraWeightsFromRef(ref?: string): Array<{ path: string; scale?: number }> | undefined {
  const t = ref?.trim();
  if (!t) return undefined;
  if (t.startsWith("http://") || t.startsWith("https://") || t.includes("/")) {
    return [{ path: t, scale: 1 }];
  }
  return undefined;
}

export async function executeFalForLabTargets(args: {
  requests: FalExecutionRequest[];
  targetIndices: number[];
  executionKind: LabExecutionKind;
  batchSize: number;
  heroImageUrl?: string;
  secondaryImageUrl?: string;
  visualQualityTier?: QualityTier;
  modelRef?: string;
}): Promise<FalExecuteTargetResult[]> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new Error("FAL_KEY is not set");
  }

  const fal = createFalClient({ credentials: key });
  const results: FalExecuteTargetResult[] = [];
  const baseImage =
    args.heroImageUrl?.trim() || args.secondaryImageUrl?.trim() || undefined;
  const numImages = Math.min(4, Math.max(1, args.batchSize || 1));

  for (const idx of args.targetIndices) {
    const req = args.requests[idx];
    if (!req) {
      results.push({
        targetIndex: idx,
        targetId: `missing-${idx}`,
        pathId: "",
        ok: false,
        imageUrls: [],
        error: "No request at index",
      });
      continue;
    }

    let pathId = req.resolvedPath.pathId;
    if (pathId === "internal/composition-only") {
      results.push({
        targetIndex: idx,
        targetId: req.sourceTargetId,
        pathId,
        ok: true,
        imageUrls: [],
        error: "Skipped — composition-only (no FAL raster)",
      });
      continue;
    }

    if (args.executionKind === "force_text") {
      pathId = "fal-ai/flux-general";
    } else if (args.executionKind === "force_edit") {
      pathId = "fal-ai/flux/dev/image-to-image";
    } else if (args.executionKind === "force_lora") {
      pathId = "fal-ai/flux-lora";
    } else if (args.executionKind === "force_lora_edit") {
      pathId = "fal-ai/flux-lora/image-to-image";
    }

    const resolvedLoras = loraWeightsFromRef(args.modelRef ?? req.loraRef ?? req.styleModelRef);
    if (
      (pathId === "fal-ai/flux-lora" || pathId === "fal-ai/flux-lora/image-to-image") &&
      (!resolvedLoras || resolvedLoras.length === 0)
    ) {
      pathId = "fal-ai/flux-general";
    }

    const prompt = req.promptPackage.positivePrompt.slice(0, 3800);
    const neg = req.promptPackage.negativePrompt?.slice(0, 1200);
    const size = imageSizeForTier(args.visualQualityTier);
    const loras = resolvedLoras;

    try {
      let data: unknown;

      if (pathId === "fal-ai/flux/dev/image-to-image" || pathId === "fal-ai/flux-lora/image-to-image") {
        if (!baseImage) {
          results.push({
            targetIndex: idx,
            targetId: req.sourceTargetId,
            pathId,
            ok: false,
            imageUrls: [],
            error: "Image-to-image requires heroImageUrl or secondaryImageUrl",
          });
          continue;
        }
        if (pathId === "fal-ai/flux/dev/image-to-image") {
          const out = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
            input: {
              prompt,
              image_url: baseImage,
              num_images: numImages,
              strength: 0.92,
              enable_safety_checker: true,
              output_format: "png",
            },
          });
          data = out.data;
        } else {
          const out = await fal.subscribe("fal-ai/flux-lora/image-to-image", {
            input: {
              prompt,
              image_url: baseImage,
              image_size: size,
              num_images: numImages,
              loras: loras ?? [],
              strength: 0.88,
              enable_safety_checker: true,
              output_format: "png",
            },
          });
          data = out.data;
        }
      } else if (pathId === "fal-ai/flux-lora") {
        const out = await fal.subscribe("fal-ai/flux-lora", {
          input: {
            prompt,
            num_images: numImages,
            image_size: size,
            loras: loras ?? [],
            enable_safety_checker: true,
            output_format: "png",
          },
        });
        data = out.data;
      } else {
        const out = await fal.subscribe("fal-ai/flux-general", {
          input: {
            prompt,
            num_images: numImages,
            image_size: size,
            enable_safety_checker: true,
            output_format: "png",
            ...(neg ? { negative_prompt: neg } : {}),
          },
        });
        data = out.data;
      }

      const urls = extractImageUrls(data);
      results.push({
        targetIndex: idx,
        targetId: req.sourceTargetId,
        pathId,
        ok: urls.length > 0,
        imageUrls: urls,
        raw: process.env.NODE_ENV === "development" ? data : undefined,
        error: urls.length === 0 ? "No image URLs in FAL response" : undefined,
      });
    } catch (e) {
      results.push({
        targetIndex: idx,
        targetId: req.sourceTargetId,
        pathId,
        ok: false,
        imageUrls: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}
