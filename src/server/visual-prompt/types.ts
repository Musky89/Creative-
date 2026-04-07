import type { VisualPromptProviderTarget } from "@/generated/prisma/client";
import type { VisualSpecArtifact } from "@/lib/artifacts/contracts";
import type { BrandOperatingSystemContext } from "@/server/brand/brand-os-prompt";
import type { SelectedVisualReference } from "@/server/visual-reference/select-references";

/** Creative Canon framework summary for assembly (no full agent context required). */
export type FrameworkAssemblyContext = {
  id: string;
  name: string;
  structure: string;
};

export type BuildVisualPromptPackageInput = {
  sourceVisualSpecId: string;
  spec: VisualSpecArtifact;
  brandOs: BrandOperatingSystemContext;
  /** Latest founder approval/revision feedback for the visual-direction task, if any. */
  founderDirection?: string;
  framework?: FrameworkAssemblyContext | null;
  /** Library references selected for this package (deterministic). */
  selectedReferences?: SelectedVisualReference[];
  /** Founder-supplied reference image URLs (brief-level); described in prompt when present. */
  founderReferenceUrls?: string[];
};

/** Provider-ready strings — adapters fill these; no API calls. */
export type ProviderReadyPromptBundle = {
  prompt: string;
  negativeOrAvoid: string;
  /** Short note on how this bundle was shaped for the provider. */
  adapterNote: string;
};

export type VisualPromptPackagePayload = {
  sourceVisualSpecId: string;
  /** Canonical neutral target; detailed strings are provider-neutral sections below. */
  providerTarget: VisualPromptProviderTarget;
  primaryPrompt: string;
  negativePrompt: string;
  styleInstructions: string;
  compositionInstructions: string;
  lightingInstructions: string;
  colorInstructions: string;
  textureInstructions: string;
  typographyInstructions: string;
  referenceInstructions: string;
  brandAlignmentNotes: string;
  optionalShotVariants?: string[];
  optionalPromptMetadata?: Record<string, unknown>;
  _visualReferencesUsed?: { id: string; label: string; imageUrl?: string }[];
  /** Per-provider adapted bundles for `generateVisualAssetFromPromptPackage` (future). */
  providerVariants: Partial<
    Record<VisualPromptProviderTarget, ProviderReadyPromptBundle>
  >;
};
