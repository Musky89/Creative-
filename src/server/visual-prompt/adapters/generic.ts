import type { ProviderReadyPromptBundle } from "../types";
import type { VisualPromptPackagePayload } from "../types";

/** Neutral concatenation — longest context, no provider-specific syntax. */
export function adaptGeneric(
  pkg: VisualPromptPackagePayload,
): ProviderReadyPromptBundle {
  const prompt = [
    pkg.primaryPrompt,
    "",
    "STYLE:",
    pkg.styleInstructions,
    "",
    "COMPOSITION:",
    pkg.compositionInstructions,
    "",
    "LIGHT:",
    pkg.lightingInstructions,
    "",
    "COLOR:",
    pkg.colorInstructions,
    "",
    "TEXTURE:",
    pkg.textureInstructions,
    "",
    "TYPE:",
    pkg.typographyInstructions,
    "",
    "REFERENCES:",
    pkg.referenceInstructions,
    "",
    "BRAND:",
    pkg.brandAlignmentNotes,
  ].join("\n");

  return {
    prompt: prompt.trim(),
    negativeOrAvoid: pkg.negativePrompt,
    adapterNote: "GENERIC: single block prompt + separate avoid string.",
  };
}
