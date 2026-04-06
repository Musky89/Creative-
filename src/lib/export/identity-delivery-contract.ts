/**
 * Agency-style identity delivery: manifest + asset slot contracts.
 * Raster placeholders are structural only; vector masters are SVG contract files until real marks exist.
 */

export const IDENTITY_DELIVERY_VERSION = "1.0.0" as const;

/** Logical roles in the logo / lockup asset pack (files may be placeholders until generation exists). */
export const IDENTITY_ASSET_ROLES = [
  "master_vector",
  "master_raster_png",
  "monochrome_vector",
  "reversed_vector",
  "symbol_only_vector",
  "wordmark_vector",
  "combination_lockup_vector",
  "usage_preview_jpg",
] as const;

export type IdentityAssetRole = (typeof IDENTITY_ASSET_ROLES)[number];

export type IdentityAssetFormat = "svg" | "pdf" | "png" | "jpg" | "json" | "md";

/** Future layered / source masters — not produced until real files exist. */
export type IdentityFutureSourceKind =
  | "psd_layers"
  | "ai_package"
  | "affinity_package"
  | "figma_link";

export type IdentityAssetSlotStatus =
  | "placeholder_contract"
  | "generated_placeholder"
  | "from_pipeline";

export type IdentityAssetSlot = {
  role: IdentityAssetRole;
  format: IdentityAssetFormat;
  /** Path inside the ZIP (forward slashes). */
  path: string;
  status: IdentityAssetSlotStatus;
  /** True when this is not a final master (e.g. placeholder PNG is not equivalent to SVG master). */
  isMasterEquivalent: boolean;
  notes?: string;
};

export type IdentityDeliveryManifest = {
  schema: "agenticforce.identity_delivery_manifest";
  version: typeof IDENTITY_DELIVERY_VERSION;
  exportedAt: string;
  project: {
    briefId: string;
    briefTitle: string;
    clientId: string;
    clientName: string;
    deadline: string;
  };
  selectedRoute: {
    index: number | null;
    routeName: string | null;
    routeType: string | null;
    founderFeedback: string | null;
    /** Human-readable warning when no route is selected yet. */
    selectionStatus: "selected" | "not_selected";
  };
  documents: {
    strategySummaryIncluded: boolean;
    selectedRouteDetailIncluded: boolean;
    fullStrategyJsonIncluded: boolean;
    fullRoutesPackJsonIncluded: boolean;
  };
  assets: IdentityAssetSlot[];
  futureSourceExports: {
    kinds: IdentityFutureSourceKind[];
    note: string;
  };
  notes: string[];
};

export function emptyFutureSourceNote(): string {
  return (
    "Layered PSD, Illustrator packages, and similar source exports are not included in this build. " +
    "Slots are reserved in the manifest; populate when true source files are available from design tooling."
  );
}
