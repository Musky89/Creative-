/**
 * Maps Creative Testing Lab form state → ProductionEngineInput.
 * Keeps production-engine schema as single source of truth.
 */

import type { ProductionEngineInput } from "../production-engine/types";
import type { SocialPlatformId } from "../production-engine/channel-specs";
import { packagingDielineDocumentSchema } from "../production-engine/packaging-dieline";
import type { ProductionMode } from "../production-engine/modes";
import type { QualityTier } from "../production-engine/fal-contracts";
import type { LayoutArchetype } from "../production-engine/layout-archetypes";

export type LabBrandForm = {
  clientName: string;
  industry: string;
  brandSummary: string;
  toneOfVoice: string;
  keyAudience: string;
  positioning: string;
  mustSignal: string;
  mustAvoid: string;
  visualLanguage: string;
  colorPalette: string;
  fontNotes: string;
  brandRulesCi: string;
  competitorNotes: string;
  marketRegion: string;
  fullBrandOperatingNotes: string;
};

export type LabCreativeForm = {
  projectTitle: string;
  campaignCore: string;
  emotionalTension: string;
  visualNarrative: string;
  conceptName: string;
  conceptRationale: string;
  headline: string;
  cta: string;
  supportingCopy: string;
  visualDirection: string;
  compositionIntent: string;
  moodLighting: string;
  negativeSpaceNotes: string;
  deliverableNotes: string;
  packagingNotes: string;
  fashionNotes: string;
  longFormBrief: string;
};

export type LabAssetUrls = {
  logoUrl?: string;
  heroImageUrl?: string;
  secondaryImageUrl?: string;
  tertiaryImageUrl?: string;
  /** Extra reference URLs (boards, packshots, etc.) — used for FAL refs + summaries */
  referenceUrls: string[];
};

export function buildReferenceSummariesFromLab(args: {
  creative: LabCreativeForm;
  assets: LabAssetUrls;
}): string[] {
  const lines: string[] = [];
  if (args.creative.longFormBrief.trim()) {
    lines.push(`Brief excerpt: ${args.creative.longFormBrief.trim().slice(0, 400)}`);
  }
  if (args.creative.deliverableNotes.trim()) {
    lines.push(`Deliverables: ${args.creative.deliverableNotes.trim().slice(0, 300)}`);
  }
  const n = args.assets.referenceUrls.length;
  if (n > 0) {
    lines.push(`${n} uploaded reference asset(s) attached for visual alignment.`);
  }
  if (lines.length === 0) {
    lines.push("(Add references or brief details for stronger FAL conditioning.)");
  }
  return lines;
}

export type LabComposeExtras = {
  /** SOCIAL: which platform dimensions to compose (default showcase 4:5) */
  socialOutputPlatformId?: SocialPlatformId;
  /** SOCIAL: when composing showcase master, also return resized PNGs for these platforms */
  socialRepurposePlatformIds?: SocialPlatformId[];
  /** PACKAGING: optional JSON for packagingDielineDocument */
  packagingDielineJson?: string;
  /** Post-compose QA: one banned phrase per line */
  bannedSubstringsText?: string;
  handoffStatus?: "draft" | "in_review" | "approved";
};

export function mapLabToProductionEngineInput(args: {
  mode: ProductionMode;
  brand: LabBrandForm;
  creative: LabCreativeForm;
  assets: LabAssetUrls;
  visualQualityTier: QualityTier;
  layoutArchetype?: LayoutArchetype;
  visualStyleRef?: string;
  modelRef?: string;
  composeExtras?: LabComposeExtras;
}): ProductionEngineInput {
  const { brand, creative, assets, mode, composeExtras } = args;

  const brandRulesSummary = [
    brand.mustSignal && `Must signal: ${brand.mustSignal}`,
    brand.mustAvoid && `Must avoid: ${brand.mustAvoid}`,
    brand.brandRulesCi && `CI / rules: ${brand.brandRulesCi}`,
    brand.visualLanguage && `Visual language: ${brand.visualLanguage}`,
    brand.colorPalette && `Palette: ${brand.colorPalette}`,
    brand.fontNotes && `Type: ${brand.fontNotes}`,
    brand.competitorNotes && `Category / competitors: ${brand.competitorNotes}`,
    brand.marketRegion && `Market: ${brand.marketRegion}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);

  const brandOperatingSystemSummary = [
    brand.clientName && `Client: ${brand.clientName}`,
    brand.industry && `Industry: ${brand.industry}`,
    brand.toneOfVoice && `Tone: ${brand.toneOfVoice}`,
    brand.keyAudience && `Audience: ${brand.keyAudience}`,
    brand.positioning && `Positioning: ${brand.positioning}`,
    brand.fullBrandOperatingNotes?.trim(),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8000);

  const briefSummary = [
    brand.brandSummary.trim() || `${brand.clientName || "Brand"} — ${args.mode} creative test`,
    creative.projectTitle && `Project: ${creative.projectTitle}`,
    creative.campaignCore && `Big idea: ${creative.campaignCore}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);

  const visualDirection = [
    creative.visualDirection.trim(),
    creative.compositionIntent && `Composition: ${creative.compositionIntent}`,
    creative.moodLighting && `Mood / light: ${creative.moodLighting}`,
    creative.negativeSpaceNotes && `Negative space: ${creative.negativeSpaceNotes}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);

  const visualSpecNotes = [
    creative.packagingNotes.trim() && `Packaging: ${creative.packagingNotes}`,
    creative.fashionNotes.trim() && `Fashion: ${creative.fashionNotes}`,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 2000);

  const colors =
    brand.colorPalette.trim().length > 0
      ? brand.colorPalette
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12)
          .map((chunk) => {
            const hex = chunk.match(/#([0-9a-fA-F]{3,8})\b/)?.[0];
            return { name: chunk.slice(0, 40), hex: hex ?? "#888888", role: undefined as string | undefined };
          })
      : undefined;

  const referenceSummaries = buildReferenceSummariesFromLab({ creative, assets });

  let packagingDieline: ProductionEngineInput["packagingDieline"];
  if (composeExtras?.packagingDielineJson?.trim()) {
    try {
      const parsed = JSON.parse(composeExtras.packagingDielineJson) as unknown;
      packagingDieline = packagingDielineDocumentSchema.parse(parsed);
    } catch {
      packagingDieline = undefined;
    }
  }

  const bannedLines =
    composeExtras?.bannedSubstringsText
      ?.split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const socialOutputTarget =
    mode === "SOCIAL" && composeExtras?.socialOutputPlatformId
      ? composeExtras.socialOutputPlatformId === "showcase_master"
        ? { kind: "showcase_master" as const }
        : {
            kind: "platform" as const,
            platformId: composeExtras.socialOutputPlatformId,
          }
      : mode === "SOCIAL"
        ? { kind: "showcase_master" as const }
        : undefined;

  return {
    mode,
    briefSummary: briefSummary || "Creative Testing Lab run",
    campaignCore: {
      singleLineIdea: creative.campaignCore.trim() || undefined,
      emotionalTension: creative.emotionalTension.trim() || undefined,
      visualNarrative: creative.visualNarrative.trim() || undefined,
    },
    selectedConcept: {
      conceptName: creative.conceptName.trim() || creative.projectTitle.trim() || "Test concept",
      rationale: creative.conceptRationale.trim() || undefined,
      visualDirection: creative.visualDirection.trim() || undefined,
    },
    selectedHeadline: creative.headline.trim() || "Headline TBD",
    selectedCta: creative.cta.trim() || "Learn more",
    supportingCopy: creative.supportingCopy.trim() || undefined,
    visualDirection: visualDirection || "Brand-aligned visual test",
    visualSpecNotes: visualSpecNotes || undefined,
    referenceSummaries,
    brandRulesSummary: brandRulesSummary || "Follow brand discipline for this test.",
    brandOperatingSystemSummary: brandOperatingSystemSummary || undefined,
    brandAssets: {
      logoUrl: assets.logoUrl,
      logoDescription: brand.clientName ? `${brand.clientName} logo` : undefined,
      colors,
      fonts: brand.fontNotes.trim()
        ? [{ family: brand.fontNotes.slice(0, 120), sourceNote: "Lab notes" }]
        : undefined,
    },
    visualStyleRef: args.visualStyleRef?.trim() || undefined,
    modelRef: args.modelRef?.trim() || undefined,
    visualQualityTier: args.visualQualityTier,
    layoutArchetype: args.layoutArchetype,
    heroImageUrl: assets.heroImageUrl,
    secondaryImageUrl: assets.secondaryImageUrl,
    tertiaryImageUrl: assets.tertiaryImageUrl,
    socialOutputTarget,
    packagingDieline,
    socialRepurposePlatformIds:
      mode === "SOCIAL" ? composeExtras?.socialRepurposePlatformIds : undefined,
    outputVerificationRules: bannedLines.length > 0 ? { bannedSubstrings: bannedLines } : undefined,
    handoffApproval: composeExtras?.handoffStatus
      ? { status: composeExtras.handoffStatus }
      : undefined,
  };
}
