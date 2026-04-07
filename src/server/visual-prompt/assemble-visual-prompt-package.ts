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
import { VISUAL_SLOP_AND_REALISM_BLOCK } from "@/server/visual-reference/slop-grounding-prompt";
import { formatBrandVisualDnaSection } from "@/server/visual-identity/format-brand-visual-dna-prompt";
import type { BrandVisualProfileForPrompt } from "@/server/visual-identity/merge-brand-visual-profile";
import {
  buildReferenceCompositionProfile,
  campaignCompositionNegativeLines,
  formatCompositionControlBlock,
  formatCompositionLeadIn,
} from "@/lib/visual/reference-composition-profile";

function traitsUsedFromProfile(p: BrandVisualProfileForPrompt): string[] {
  return [
    ...p.lightingPatterns.slice(0, 3),
    ...p.compositionPatterns.slice(0, 3),
    ...p.colorSignatures.slice(0, 2),
    ...p.texturePatterns.slice(0, 2),
    ...p.framingRules.slice(0, 2),
    ...p.styleKeywords.slice(0, 3),
  ];
}

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
function formatReferenceGroundingBlock(
  input: BuildVisualPromptPackageInput,
): { text: string; used: { id: string; label: string; imageUrl?: string }[] } {
  const used: { id: string; label: string; imageUrl?: string }[] = [];
  const lines: string[] = [];

  const refs = input.selectedReferences ?? [];
  for (const r of refs) {
    used.push({ id: r.id, label: r.label, imageUrl: r.imageUrl });
    const meta =
      r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
        ? (r.metadata as Record<string, unknown>)
        : {};
    const mood = typeof meta.mood === "string" ? meta.mood.trim() : "";
    const comp = typeof meta.composition === "string" ? meta.composition.trim() : "";
    const light = typeof meta.lighting === "string" ? meta.lighting.trim() : "";
    const tagStr = Array.isArray(meta.tags)
      ? (meta.tags as unknown[]).map((t) => String(t)).filter(Boolean).join(", ")
      : "";
    lines.push(
      `- **${r.label}** (${r.category})${mood ? ` — mood: ${mood}` : ""}${comp ? `; composition: ${comp}` : ""}${light ? `; lighting: ${light}` : ""}${tagStr ? `; tags: ${tagStr}` : ""}`,
    );
    if (r.imageUrl?.trim()) {
      lines.push(`  Reference still URL (style anchor — emulate feel, do not copy IP): ${r.imageUrl.trim()}`);
    }
  }

  const founderUrls = (input.founderReferenceUrls ?? [])
    .map((u) => u.trim())
    .filter((u) => u.length > 4)
    .slice(0, 5);
  for (let i = 0; i < founderUrls.length; i++) {
    lines.push(
      `- **Founder reference ${i + 1}:** ${founderUrls[i]} — match lighting scale, lens character, and campaign realism; do not reproduce logos or trademarks from the reference unless they are the client's own marks and the brief requires it.`,
    );
  }

  if (lines.length === 0) {
    return { text: "", used: [] };
  }

  return {
    text: [
      "REFERENCE GROUNDING (campaign-realism anchors):",
      "Inspired by the following real-world photography / campaign cues — **emulate lighting, lensing, and art-direction discipline**, not subject-for-subject copying:",
      ...lines,
      "Composition constraints from references: favor believable camera height, natural depth separation, and motivated negative space consistent with the cues above.",
    ].join("\n"),
    used,
  };
}

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
  if (brandOs.visualCompositionTendencies.trim()) {
    brandVisualLines.push(
      `Composition tendencies (taste): ${brandOs.visualCompositionTendencies.trim()}`,
    );
  }
  if (brandOs.visualMaterialTextureDirection.trim()) {
    brandVisualLines.push(
      `Material / texture direction (taste): ${brandOs.visualMaterialTextureDirection.trim()}`,
    );
  }
  if (brandOs.visualLightingTendencies.trim()) {
    brandVisualLines.push(
      `Lighting tendencies (taste): ${brandOs.visualLightingTendencies.trim()}`,
    );
  }
  if (brandOs.tasteCloserThan.length) {
    brandVisualLines.push(
      `Taste calibration: ${brandOs.tasteCloserThan.join(" | ")}`,
    );
  }
  if (brandOs.tasteShouldFeelLike.trim()) {
    brandVisualLines.push(`Should feel like: ${brandOs.tasteShouldFeelLike.trim()}`);
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

  const refIntent =
    spec.referenceIntent?.trim() &&
    `Reference intent (real-world genre to emulate): ${spec.referenceIntent.trim()}`;
  const refHints =
    spec.referenceStyleHints?.length &&
    `Reference style hints: ${spec.referenceStyleHints.join(" · ")}`;

  const { text: referenceGroundingBlock, used: visualRefsUsed } =
    formatReferenceGroundingBlock(input);

  const refList = input.selectedReferences ?? [];
  const referenceCompositionProfile = buildReferenceCompositionProfile(refList);
  const compositionControlBlock = formatCompositionControlBlock(referenceCompositionProfile);
  const compositionLeadIn = formatCompositionLeadIn(referenceCompositionProfile);
  const compositionNegLines = campaignCompositionNegativeLines(referenceCompositionProfile);

  const brandDnaBlock = formatBrandVisualDnaSection(
    input.brandVisualProfile ?? null,
  );
  const traitsUsedForInfluence = input.brandVisualProfile
    ? traitsUsedFromProfile(input.brandVisualProfile)
    : [];

  const seed =
    spec.optionalPromptSeed?.trim() &&
    `Supporting seed (do not override spec specifics): ${spec.optionalPromptSeed.trim()}`;

  const categoryTaste =
    brandOs.categoryDifferentiation.trim() ||
    brandOs.categoryTypicalBehavior.trim()
      ? [
          brandOs.categoryTypicalBehavior.trim()
            ? `Category context: ${brandOs.categoryTypicalBehavior.trim()}`
            : null,
          brandOs.categoryDifferentiation.trim()
            ? `Brand differentiation (honor visually): ${brandOs.categoryDifferentiation.trim()}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  /** Composition lead-in first so every provider sees framing/angle before anti-slop copy. */
  const primaryPrompt = [
    compositionLeadIn,
    "",
    VISUAL_SLOP_AND_REALISM_BLOCK,
    "",
    brandDnaBlock ? `${brandDnaBlock}\n` : "",
    `Objective: ${spec.visualObjective}`,
    `Concept route: ${spec.conceptName}.`,
    frameworkLine,
    `Mood: ${spec.mood}. Emotional tone in frame: ${spec.emotionalTone}.`,
    emotionalContext,
    categoryTaste,
    founderBlock,
    refIntent,
    refHints,
    referenceGroundingBlock
      ? `\n${referenceGroundingBlock}\n\n${compositionControlBlock}`
      : `\n${compositionControlBlock}`,
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
    [
      "Reference-derived control (must align with COMPOSITION CONTROL in primary prompt):",
      `- Framing: ${referenceCompositionProfile.framingType.replace(/-/g, " ")}`,
      `- Placement: ${referenceCompositionProfile.subjectPlacement.replace(/-/g, " ")}`,
      `- Angle: ${referenceCompositionProfile.cameraAngle.replace(/-/g, " ")}`,
      `- Background: ${referenceCompositionProfile.backgroundTreatment.replace(/-/g, " ")}`,
      `- Negative space: ${referenceCompositionProfile.negativeSpaceUsage}`,
      brandOs.compositionStyle.trim()
        ? `Align with brand composition bias: ${brandOs.compositionStyle.trim()}`
        : "",
      brandOs.visualCompositionTendencies.trim()
        ? `Taste engine composition tendencies: ${brandOs.visualCompositionTendencies.trim()}`
        : "",
    ].filter(Boolean),
  );

  const lightingInstructions = joinLines(
    "Lighting:",
    spec.lightingDirection,
    [
      brandOs.lightingStyle.trim()
        ? `Brand lighting bias: ${brandOs.lightingStyle.trim()}`
        : "",
      brandOs.visualLightingTendencies.trim()
        ? `Taste engine lighting tendencies: ${brandOs.visualLightingTendencies.trim()}`
        : "",
    ].filter(Boolean),
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
    [
      brandOs.textureFocus.trim()
        ? `Brand texture focus: ${brandOs.textureFocus.trim()}`
        : "",
      brandOs.visualMaterialTextureDirection.trim()
        ? `Taste engine material direction: ${brandOs.visualMaterialTextureDirection.trim()}`
        : "",
    ].filter(Boolean),
  );

  const typographyInstructions = joinLines(
    "Typography in the frame:",
    spec.typographyDirection,
  );

  const referenceInstructions = joinLines(
    "Reference discipline:",
    [
      spec.referenceLogic,
      refIntent || "",
      refHints || "",
      referenceGroundingBlock || refList.length
        ? "Ground execution in REFERENCE GROUNDING + COMPOSITION CONTROL (campaign photo realism, deliberate framing)."
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const brandAlignmentNotes = joinLines(
    "Why this fits the brand (from spec + OS):",
    spec.whyItWorksForBrand,
    brandVisualLines.length ? [`Brand OS visual anchors: ${brandVisualLines.join(" | ")}`] : undefined,
  );

  const profileNeg =
    input.brandVisualProfile?.negativeTraits.map(
      (t) => `Brand visual DNA avoid: ${t}`,
    ) ?? [];

  const boundaryLines = [
    ...brandOs.emotionalBoundaries,
    ...brandOs.bannedPhrases.map((p) => `Avoid phrase/trope: ${p}`),
    ...brandOs.languageDnaPhrasesNever.map((p) => `Language DNA NEVER: ${p}`),
    ...brandOs.categoryClichesToAvoid.map((p) => `Category cliché avoid: ${p}`),
    ...brandOs.visualNeverLooksLike.map((p) => `NEVER looks like: ${p}`),
    ...(brandOs.tasteMustNotFeelLike.trim()
      ? [`Must NOT feel like: ${brandOs.tasteMustNotFeelLike.trim()}`]
      : []),
    ...profileNeg.slice(0, 12),
  ];

  const negativePrompt = mergeAvoid(spec, [
    ...boundaryLines,
    ...compositionNegLines.map((x) => `Composition discipline: ${x}`),
  ]);

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
      referenceGrounding: referenceGroundingBlock ? true : false,
      brandVisualDna: brandDnaBlock ? true : false,
      visualModelRef: input.visualModelRef?.trim() || null,
      referenceCompositionSummary: {
        framingType: referenceCompositionProfile.framingType,
        cameraAngle: referenceCompositionProfile.cameraAngle,
        subjectPlacement: referenceCompositionProfile.subjectPlacement,
        backgroundTreatment: referenceCompositionProfile.backgroundTreatment,
        realismBias: referenceCompositionProfile.realismBias,
      },
    },
    _visualReferencesUsed: visualRefsUsed.length ? visualRefsUsed : undefined,
    _brandVisualProfileInfluence:
      input.brandVisualProfile && traitsUsedForInfluence.length
        ? {
            profileId: input.brandVisualProfile.id,
            traitsUsed: traitsUsedForInfluence,
          }
        : undefined,
    _visualModelRef: input.visualModelRef?.trim() || null,
    _referenceCompositionProfile: referenceCompositionProfile,
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
    _visualReferencesUsed: payload._visualReferencesUsed,
    _brandVisualProfileInfluence: payload._brandVisualProfileInfluence,
    _visualModelRef: payload._visualModelRef,
    _referenceCompositionProfile: payload._referenceCompositionProfile,
    providerVariants: payload.providerVariants,
  });

  if (!parsed.success) {
    throw new Error(`Visual prompt package validation failed: ${parsed.error.message}`);
  }

  return parsed.data;
}
