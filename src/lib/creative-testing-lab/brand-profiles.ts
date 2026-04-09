/**
 * Saved brand profiles for the Creative Testing Lab (localStorage).
 * Separate from run history and from generic "test presets" so you can maintain
 * reusable brand kits and apply them before filling campaign-specific creative.
 */

import type { ProductionMode } from "../production-engine/modes";
import type { LabBrandForm, LabCreativeForm } from "./map-to-production-input";
import type { LabExecutionPathUi } from "./run-history";

export const BRAND_PROFILES_KEY = "creative-testing-lab-brand-profiles-v1";
export const BRAND_PROFILES_VERSION = 1;
export const BRAND_PROFILES_VERSION_KEY = "creative-testing-lab-brand-profiles-version";

export type LabBrandProfileSeedAssets = {
  logoUrl?: string;
  heroUrl?: string;
  secondaryUrl?: string;
  tertiaryUrl?: string;
  extraRefs?: { id: string; name: string; url: string }[];
};

export type LabBrandProfile = {
  version: typeof BRAND_PROFILES_VERSION;
  id: string;
  name: string;
  brand: LabBrandForm;
  seedAssets: LabBrandProfileSeedAssets;
  defaultMode: ProductionMode;
  qualityTier: "draft" | "standard" | "high" | "premium";
  executionPath: LabExecutionPathUi;
  batchSize: number;
  targetTypeFilter: string;
  styleModelRef: string;
  loraRef: string;
  strongRefs: boolean;
  preferEdit: boolean;
  /** When true, loading the profile also restores campaign/creative fields */
  storedCreative: LabCreativeForm | null;
};

export function loadBrandProfiles(): LabBrandProfile[] {
  try {
    const raw = localStorage.getItem(BRAND_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is LabBrandProfile =>
        p &&
        typeof p === "object" &&
        typeof (p as LabBrandProfile).id === "string" &&
        typeof (p as LabBrandProfile).name === "string" &&
        (p as LabBrandProfile).brand != null,
    );
  } catch {
    return [];
  }
}

export function saveBrandProfiles(profiles: LabBrandProfile[]): void {
  localStorage.setItem(BRAND_PROFILES_KEY, JSON.stringify(profiles.slice(-48)));
}
