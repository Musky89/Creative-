/**
 * FAL model router — chooses execution path from target + tier + edit vs generate + style refs.
 * Unified visual backend: only fal path ids from fal-paths registry.
 */

import type { GenerationTarget } from "./generation-targets";
import type { QualityTier } from "./fal-contracts";
import type { FalPathKind } from "./fal-paths";
import {
  buildFalExecutionRequest,
  buildStubFalResponse,
  type RoutedFalExecution,
} from "./fal-contracts";

export type FalRouterInput = {
  target: GenerationTarget;
  qualityTier: QualityTier;
  /** If true, prefer image-to-image / edit paths when base asset exists. */
  hasBaseImageForEdit: boolean;
  /** URLs already resolved for fal (e.g. logo, ref board). */
  referenceImageUrls: string[];
};

function pickPath(args: {
  target: GenerationTarget;
  qualityTier: QualityTier;
  hasBaseImageForEdit: boolean;
  reasons: string[];
}): { pathId: string; kind: FalPathKind } {
  const t = args.target;
  const reasons = args.reasons;

  if (t.productionMode === "EXPORT_PRESENTATION") {
    reasons.push("EXPORT_PRESENTATION defaults to composition-only unless hero visual explicitly requested.");
    return { pathId: "internal/composition-only", kind: "SPECIALTY" };
  }

  const hasStyle = !!(t.styleModelRef?.trim() || t.loraRef?.trim());

  if (args.hasBaseImageForEdit) {
    if (hasStyle) {
      reasons.push("Base image + style ref → LoRA image-to-image.");
      return { pathId: "fal-ai/flux-lora/image-to-image", kind: "LORA_IMAGE_EDIT" };
    }
    reasons.push("Base image without LoRA → standard image-to-image edit.");
    return { pathId: "fal-ai/flux/dev/image-to-image", kind: "IMAGE_EDIT" };
  }

  if (hasStyle) {
    reasons.push("Style/lora ref set → LoRA text-to-image.");
    return { pathId: "fal-ai/flux-lora", kind: "LORA_TEXT_TO_IMAGE" };
  }

  if (t.targetType === "DETAIL_CROP" && args.qualityTier === "high") {
    reasons.push("Detail crop + high tier → specialty upscale path after gen (stub routing to flux-general for first pass).");
    return { pathId: "fal-ai/flux-general", kind: "TEXT_TO_IMAGE" };
  }

  reasons.push("Default text-to-image via flux-general.");
  return { pathId: "fal-ai/flux-general", kind: "TEXT_TO_IMAGE" };
}

export function routeFalExecution(input: FalRouterInput): RoutedFalExecution {
  const reasons: string[] = [];
  const alternativesConsidered = [
    "fal-ai/flux-general",
    "fal-ai/flux/dev/image-to-image",
    "fal-ai/flux-lora",
    "fal-ai/flux-lora/image-to-image",
    "internal/composition-only",
  ];

  const { pathId, kind } = pickPath({
    target: input.target,
    qualityTier: input.qualityTier,
    hasBaseImageForEdit: input.hasBaseImageForEdit,
    reasons,
  });

  const request = buildFalExecutionRequest({
    target: input.target,
    pathId,
    kind,
    qualityTier: input.qualityTier,
    routerReasons: reasons,
    referenceImageUrls: input.referenceImageUrls,
  });

  const response = buildStubFalResponse(request);

  return {
    target: input.target,
    route: {
      pathId,
      kind,
      reasons,
      alternativesConsidered,
    },
    request,
    response,
  };
}

export function routeBatch(
  inputs: FalRouterInput[],
): RoutedFalExecution[] {
  return inputs.map(routeFalExecution);
}
