import type { ProductionMode } from "./modes";
import type { HandoffExportProfile } from "./handoff-export-profile";
import type { HandoffLayerManifestDocument } from "./handoff-layer-manifest";

export type HandoffCopyMetadata = {
  headline: string;
  cta: string;
  supportingCopy?: string;
  briefSummary: string;
  conceptName: string;
  campaignCore?: {
    singleLineIdea?: string;
    emotionalTension?: string;
    visualNarrative?: string;
  };
};

export type HandoffBrandMetadata = {
  logoUrl?: string;
  logoDescription?: string;
  colors: { name?: string; hex: string; role?: string }[];
  fonts: { family: string; weights?: string[]; sourceNote?: string }[];
  brandRulesSummary: string;
  brandOperatingSystemSummary?: string;
};

export type HandoffSourceVisualRef = {
  role: string;
  uri: string;
  targetId?: string;
  falPathId?: string;
};

export type HandoffPackageItem = {
  path: string;
  description: string;
  kind:
    | "flattened_master"
    | "layer_manifest"
    | "production_plan"
    | "composition_plan"
    | "source_raster"
    | "brand_metadata"
    | "copy_metadata"
    | "production_notes"
    | "export_profile"
    | "assembly_readme";
};

/** Full agency handoff bundle metadata (ZIP manifest is future I/O). */
export type HandoffPackageExtended = {
  mode: ProductionMode;
  bundleName: string;
  items: HandoffPackageItem[];
  readme: string;
  exportProfile: HandoffExportProfile;
  layerManifestStructured: HandoffLayerManifestDocument;
  copyMetadata: HandoffCopyMetadata;
  brandMetadata: HandoffBrandMetadata;
  sourceVisuals: HandoffSourceVisualRef[];
  productionNotes: string[];
};
