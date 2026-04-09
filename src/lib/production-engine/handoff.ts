import type { ProductionEngineInput } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import type { CompositionPlanDocument } from "./composition-plan-schema";
import type { VisualExecutionBundle } from "./types";
import type { CompositionLayerManifestEntry } from "./composition-plan-schema";
import { getModeConfig } from "./mode-registry";
import { buildHandoffExportProfile } from "./handoff-export-profile";
import {
  buildHandoffLayerManifestDocument,
  resolveHandoffCopy,
} from "./handoff-layer-manifest";
import type { FashionVariantCopy } from "./mode-identity-fashion-export";
import type { ExportDeckSection } from "./mode-identity-fashion-export";
import type { QualityTier } from "./fal-contracts";
import type {
  HandoffPackageExtended,
  HandoffPackageItem,
  HandoffCopyMetadata,
  HandoffBrandMetadata,
  HandoffSourceVisualRef,
} from "./handoff-types";
import type { HandoffExportProfile } from "./handoff-export-profile";

export type {
  HandoffPackageExtended,
  HandoffPackageItem,
  HandoffCopyMetadata,
  HandoffBrandMetadata,
  HandoffSourceVisualRef,
} from "./handoff-types";

function slug(s: string): string {
  return s.replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function collectSourceVisuals(
  input: ProductionEngineInput,
  bundle: VisualExecutionBundle,
): HandoffSourceVisualRef[] {
  const out: HandoffSourceVisualRef[] = [];
  if (input.heroImageUrl?.trim()) {
    out.push({ role: "heroImageUrl", uri: input.heroImageUrl.trim() });
  }
  if (input.secondaryImageUrl?.trim()) {
    out.push({ role: "secondaryImageUrl", uri: input.secondaryImageUrl.trim() });
  }
  if (input.tertiaryImageUrl?.trim()) {
    out.push({ role: "tertiaryImageUrl", uri: input.tertiaryImageUrl.trim() });
  }
  for (const ex of bundle.routedExecutions) {
    for (const a of ex.response.assets) {
      if (a.uri) {
        out.push({
          role: `fal_stub:${ex.target.id}`,
          uri: a.uri,
          targetId: ex.target.id,
          falPathId: ex.response.falPathUsed,
        });
      }
    }
  }
  return out;
}

function buildProductionNotes(args: {
  mode: ProductionEngineInput["mode"];
  plan: ProductionPlanDocument;
  profile: HandoffExportProfile;
  qualityTier?: QualityTier;
}): string[] {
  const { mode, plan, profile, qualityTier } = args;
  const lines: string[] = [
    `Mode: ${mode} — ${profile.label}`,
    `Export preset: ${profile.presetId}`,
    profile.mediaSpecHint,
    `Composition intent (excerpt): ${plan.compositionIntent.slice(0, 280)}${plan.compositionIntent.length > 280 ? "…" : ""}`,
    `Typography intent (excerpt): ${plan.typographyIntent.slice(0, 220)}${plan.typographyIntent.length > 220 ? "…" : ""}`,
  ];
  if (qualityTier) {
    lines.push(`Visual quality tier: ${qualityTier}`);
  }
  lines.push(...profile.deliveryNotes);
  return lines;
}

export function buildHandoffPackage(
  input: ProductionEngineInput,
  plan: ProductionPlanDocument,
  compositionPlan: CompositionPlanDocument,
  logicalManifest: CompositionLayerManifestEntry[],
  visualExecution: VisualExecutionBundle,
  options?: {
    qualityTier?: QualityTier;
    textOverride?: { headline: string; cta: string };
    fashionVariant?: FashionVariantCopy;
    exportSection?: ExportDeckSection;
  },
): HandoffPackageExtended {
  const cfg = getModeConfig(input.mode);
  const slugMode = input.mode.toLowerCase();
  const conceptSlug = slug(input.selectedConcept.conceptName);
  const basePath = `exports/${slugMode}/${conceptSlug}`;
  const qualityTier = options?.qualityTier ?? input.visualQualityTier;

  const exportProfile = buildHandoffExportProfile({
    mode: input.mode,
    compositionPlan,
    productionPlan: plan,
    qualityTier,
  });

  const resolvedCopy = resolveHandoffCopy(input, options?.textOverride, {
    fashionVariant: options?.fashionVariant,
    exportSection: options?.exportSection,
  });

  const layerManifestStructured = buildHandoffLayerManifestDocument({
    input,
    compositionPlan,
    logicalManifest,
    visualExecution,
    exportProfile,
    resolvedCopy,
  });

  const sourceVisuals = collectSourceVisuals(input, visualExecution);

  const copyMetadata: HandoffCopyMetadata = {
    headline: resolvedCopy.headline,
    cta: resolvedCopy.cta,
    supportingCopy: input.supportingCopy,
    briefSummary: input.briefSummary,
    conceptName: input.selectedConcept.conceptName,
    campaignCore: input.campaignCore,
  };

  const brandMetadata: HandoffBrandMetadata = {
    logoUrl: input.brandAssets?.logoUrl,
    logoDescription: input.brandAssets?.logoDescription,
    colors: input.brandAssets?.colors ?? [],
    fonts: input.brandAssets?.fonts ?? [],
    brandRulesSummary: input.brandRulesSummary,
    brandOperatingSystemSummary: input.brandOperatingSystemSummary,
  };

  const productionNotes = buildProductionNotes({
    mode: input.mode,
    plan,
    profile: exportProfile,
    qualityTier,
  });

  const targets = plan.exportTargets ?? cfg.exportFormats;

  const items: HandoffPackageItem[] = [
    {
      path: `${basePath}/final/${conceptSlug}-master.${compositionPlan.exportFormat}`,
      description: `Flattened master — ${compositionPlan.canvasWidth}×${compositionPlan.canvasHeight}px (${exportProfile.primaryFormats.join(", ")})`,
      kind: "flattened_master",
    },
    {
      path: `${basePath}/manifest/layer-manifest-handoff.json`,
      description: "Structured layer manifest (PSD/Figma adapter input)",
      kind: "layer_manifest",
    },
    {
      path: `${basePath}/plans/production-plan.json`,
      description: "Validated production plan",
      kind: "production_plan",
    },
    {
      path: `${basePath}/plans/composition-plan.json`,
      description: "Composition plan — rects, finishing, mode layouts",
      kind: "composition_plan",
    },
    {
      path: `${basePath}/source/source-visuals.json`,
      description: "Resolved + stub source raster URIs for packaging",
      kind: "source_raster",
    },
    {
      path: `${basePath}/brand/brand-metadata.json`,
      description: "Logo refs, colors, fonts, brand rules summaries",
      kind: "brand_metadata",
    },
    {
      path: `${basePath}/copy/copy-metadata.json`,
      description: "Headline, CTA, brief, campaign core for re-typesetting",
      kind: "copy_metadata",
    },
    {
      path: `${basePath}/export/export-profile.json`,
      description: "Mode-aware DPI, formats, print hints",
      kind: "export_profile",
    },
    {
      path: `${basePath}/notes/production-notes.md`,
      description: "Agency-facing production notes",
      kind: "production_notes",
    },
    {
      path: `${basePath}/README.md`,
      description: "Bundle index and assembly explanation pointers",
      kind: "assembly_readme",
    },
  ];

  const readme = [
    `# ${cfg.label} — ${input.selectedConcept.conceptName}`,
    ``,
    `**Bundle:** \`${conceptSlug}-production-bundle\``,
    `**Canvas:** ${compositionPlan.canvasWidth}×${compositionPlan.canvasHeight}px`,
    `**Export preset:** ${exportProfile.presetId} — ${exportProfile.label}`,
    `**Print DPI (recommended):** ${exportProfile.printDpiRecommended ?? "n/a (screen-first)"}`,
    `**Color:** ${exportProfile.colorSpace}`,
    ``,
    `## Contents`,
    items.map((i) => `- \`${i.path}\` — ${i.description}`).join("\n"),
    ``,
    `## Plan export targets`,
    targets.join(", "),
    ``,
    `Layer manifest schema version: ${layerManifestStructured.schemaVersion} — ready for PSD/Figma adapter (not generated in this pass).`,
  ].join("\n");

  return {
    mode: input.mode,
    bundleName: `${conceptSlug}-production-bundle`,
    items,
    readme,
    exportProfile,
    layerManifestStructured,
    copyMetadata,
    brandMetadata,
    sourceVisuals,
    productionNotes,
  };
}
