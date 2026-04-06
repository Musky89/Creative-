import type { ProviderReadyPromptBundle } from "../types";
import type { VisualPromptPackagePayload } from "../types";

/**
 * GPT / DALL·E style: imperative instructions, clear sections.
 * Does not call OpenAI — prepares strings for a future images API.
 */
export function adaptGptImage(
  pkg: VisualPromptPackagePayload,
): ProviderReadyPromptBundle {
  const prompt = [
    "Generate a single image matching this art direction.",
    "",
    pkg.primaryPrompt,
    "",
    "Follow these instructions exactly:",
    `1) Composition: ${pkg.compositionInstructions}`,
    `2) Lighting: ${pkg.lightingInstructions}`,
    `3) Color: ${pkg.colorInstructions}`,
    `4) Texture and materials: ${pkg.textureInstructions}`,
    `5) Typography in frame (if any): ${pkg.typographyInstructions}`,
    `6) Overall style: ${pkg.styleInstructions}`,
    `7) Reference discipline: ${pkg.referenceInstructions}`,
    `8) Brand alignment: ${pkg.brandAlignmentNotes}`,
  ].join("\n");

  return {
    prompt: prompt.trim(),
    negativeOrAvoid: pkg.negativePrompt,
    adapterNote:
      "GPT_IMAGE: imperative numbered brief; use negativeOrAvoid as moderation / negative prompt parameter when available.",
  };
}
