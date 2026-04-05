import type { VisualPromptProviderTarget } from "@/generated/prisma/client";
import {
  visualPromptPackageArtifactSchema,
  type VisualPromptPackageArtifact,
  type VisualSpecArtifact,
} from "@/lib/artifacts/contracts";
import { getFrameworkById } from "@/lib/canon/frameworks";
import { adaptGeneric } from "./adapters/generic";
import { adaptGeminiImage } from "./adapters/gemini-image";
import { adaptGptImage } from "./adapters/gpt-image";
import type {
  BuildVisualPromptPackageInput,
  VisualPromptPackagePayload,
} from "./types";

function joinLines(title: string, body: string, extra?: string[]): string {
  const parts = [title, body.trim()];
  if (extra?.length) {
    parts.push(...extra.filter(Boolean));
  }
  return parts.filter(Boolean).join("\n");
}

function mergeAvoid(
  spec: VisualSpecArtifact,
  brandOsLines: string[],
): string {
  const fromSpec = spec.avoidList.map((x) => `- ${x}`).join("\n");
  const fromOs =
    brandOsLines.length > 0
      ? "Brand OS boundaries (visual / emotional):\n" +
        brandOsLines.map((x) => `- ${x}`).join("\n")
      : "";
  return [fromSpec, fromOs].filter(Boolean).join("\n\n");
}

/**
 * Deterministic translation: VISUAL_SPEC + Brand OS (+ optional founder + framework) →
 * provider-neutral sections + per-adapter bundles.
 *
 * Future: `generateVisualAssetFromPromptPackage(artifactId, provider)` reads `providerVariants`.
 */
export function buildVisualPromptPackage(
  input: BuildVisualPromptPackageInput,
  defaultTarget: VisualPromptProviderTarget = "GENERIC",
): VisualPromptPackageArtifact {
  const { spec, brandOs, founderDirection, framework } = input;

  const fw = framework ?? getFrameworkById(spec.frameworkUsed);
  const frameworkLine = fw
    ? `Creative Canon framework: ${fw.name} (${fw.id}). Structure to honor visually: ${fw.structure}`
    : `Creative Canon framework id: ${spec.frameworkUsed}.`;

  const brandVisualLines: string[] = [];
  if (brandOs.visualStyle.trim()) {
    brandVisualLines.push(`Overall visual style: ${brandOs.visualStyle.trim()}`);
  }
  if (brandOs.colorPhilosophy.trim()) {
    brandVisualLines.push(`Color philosophy: ${brandOs.colorPhilosophy.trim()}`);
  }
  if (brandOs.compositionStyle.trim()) {
    brandVisualLines.push(`Composition bias: ${brandOs.compositionStyle.trim()}`);
  }
  if (brandOs.textureFocus.trim()) {
    brandVisualLines.push(`Texture focus: ${brandOs.textureFocus.trim()}`);
  }
  if (brandOs.lightingStyle.trim()) {
    brandVisualLines.push(`Lighting bias: ${brandOs.lightingStyle.trim()}`);
  }

  const emotionalContext = [
    brandOs.emotionalToneDescription.trim()
      ? `Emotional brief: ${brandOs.emotionalToneDescription.trim()}`
      : null,
    `Primary emotion register: ${brandOs.primaryEmotion}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const founderBlock =
    founderDirection && founderDirection.trim()
      ? `Founder direction (must respect): ${founderDirection.trim()}`
      : "";

  const seed =
    spec.optionalPromptSeed?.trim() &&
    `Supporting seed (do not override spec specifics): ${spec.optionalPromptSeed.trim()}`;

  const primaryPrompt = [
    `Objective: ${spec.visualObjective}`,
    `Concept route: ${spec.conceptName}.`,
    frameworkLine,
    `Mood: ${spec.mood}. Emotional tone in frame: ${spec.emotionalTone}.`,
    emotionalContext,
    founderBlock,
    `Distinctiveness: ${spec.distinctivenessNotes}`,
    seed,
  ]
    .filter(Boolean)
    .join("\n");

  const styleInstructions = joinLines(
    "Image / capture style:",
    spec.imageStyle,
    brandVisualLines.length ? [brandVisualLines.join(" ")] : undefined,
  );

  const compositionInstructions = joinLines(
    "Composition:",
    spec.composition,
    brandOs.compositionStyle.trim()
      ? [`Align with brand composition bias: ${brandOs.compositionStyle.trim()}`]
      : undefined,
  );

  const lightingInstructions = joinLines(
    "Lighting:",
    spec.lightingDirection,
    brandOs.lightingStyle.trim()
      ? [`Brand lighting bias: ${brandOs.lightingStyle.trim()}`]
      : undefined,
  );

  const colorInstructions = joinLines(
    "Color:",
    spec.colorDirection,
    brandOs.colorPhilosophy.trim()
      ? [`Brand color philosophy: ${brandOs.colorPhilosophy.trim()}`]
      : undefined,
  );

  const textureInstructions = joinLines(
    "Texture and materials:",
    spec.textureDirection,
    brandOs.textureFocus.trim()
      ? [`Brand texture focus: ${brandOs.textureFocus.trim()}`]
      : undefined,
  );

  const typographyInstructions = joinLines(
    "Typography in the frame:",
    spec.typographyDirection,
  );

  const referenceInstructions = joinLines(
    "Reference discipline:",
    spec.referenceLogic,
  );

  const brandAlignmentNotes = joinLines(
    "Why this fits the brand (from spec + OS):",
    spec.whyItWorksForBrand,
    brandVisualLines.length ? [`Brand OS visual anchors: ${brandVisualLines.join(" | ")}`] : undefined,
  );

  const boundaryLines = [
    ...brandOs.emotionalBoundaries,
    ...brandOs.bannedPhrases.map((p) => `Avoid phrase/trope: ${p}`),
  ];

  const negativePrompt = mergeAvoid(spec, boundaryLines);

  const shotVariants = [
    `Wide establishing consistent with: ${spec.composition.slice(0, 120)}${spec.composition.length > 120 ? "…" : ""}`,
    `Detail / texture-forward consistent with: ${spec.textureDirection}`,
  ];

  const payload: VisualPromptPackagePayload = {
    sourceVisualSpecId: input.sourceVisualSpecId,
    providerTarget: defaultTarget,
    primaryPrompt,
    negativePrompt,
    styleInstructions,
    compositionInstructions,
    lightingInstructions,
    colorInstructions,
    textureInstructions,
    typographyInstructions,
    referenceInstructions,
    brandAlignmentNotes,
    optionalShotVariants: shotVariants,
    optionalPromptMetadata: {
      assembledAt: new Date().toISOString(),
      frameworkId: spec.frameworkUsed,
      conceptName: spec.conceptName,
    },
    providerVariants: {},
  };

  payload.providerVariants.GENERIC = adaptGeneric(payload);
  payload.providerVariants.GEMINI_IMAGE = adaptGeminiImage(payload);
  payload.providerVariants.GPT_IMAGE = adaptGptImage(payload);

  const parsed = visualPromptPackageArtifactSchema.safeParse({
    sourceVisualSpecId: input.sourceVisualSpecId,
    providerTarget: defaultTarget,
    primaryPrompt: payload.primaryPrompt,
    negativePrompt: payload.negativePrompt,
    styleInstructions: payload.styleInstructions,
    compositionInstructions: payload.compositionInstructions,
    lightingInstructions: payload.lightingInstructions,
    colorInstructions: payload.colorInstructions,
    textureInstructions: payload.textureInstructions,
    typographyInstructions: payload.typographyInstructions,
    referenceInstructions: payload.referenceInstructions,
    brandAlignmentNotes: payload.brandAlignmentNotes,
    optionalShotVariants: payload.optionalShotVariants,
    optionalPromptMetadata: payload.optionalPromptMetadata,
    providerVariants: payload.providerVariants,
  });

  if (!parsed.success) {
    throw new Error(`Visual prompt package validation failed: ${parsed.error.message}`);
  }

  return parsed.data;
}
