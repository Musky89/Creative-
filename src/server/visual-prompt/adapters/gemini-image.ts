import type { ProviderReadyPromptBundle } from "../types";
import type { VisualPromptPackagePayload } from "../types";

/**
 * Gemini-style: concise scene description first; constraints as short labeled lines.
 * Does not call the API — shapes text for future Imagen / Gemini image endpoints.
 */
export function adaptGeminiImage(
  pkg: VisualPromptPackagePayload,
): ProviderReadyPromptBundle {
  const prompt = [
    pkg.primaryPrompt,
    "",
    "Constraints (honor CAMPAIGN COMPOSITION at the top of the scene block first):",
    `- Composition: ${pkg.compositionInstructions}`,
    `- Lighting: ${pkg.lightingInstructions}`,
    `- Palette: ${pkg.colorInstructions}`,
    `- Materials: ${pkg.textureInstructions}`,
    `- Typography role: ${pkg.typographyInstructions}`,
    `- Style: ${pkg.styleInstructions}`,
    `- References: ${pkg.referenceInstructions}`,
    `- Brand: ${pkg.brandAlignmentNotes}`,
  ].join("\n");

  return {
    prompt: prompt.trim(),
    negativeOrAvoid: pkg.negativePrompt,
    adapterNote:
      "GEMINI_IMAGE: scene-first paragraph + labeled constraints; negative text for `negativePrompt` field when API supports it.",
  };
}
