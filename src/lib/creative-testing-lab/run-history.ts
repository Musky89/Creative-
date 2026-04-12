/**
 * Lightweight persistent test run history (localStorage).
 * Avoids storing huge base64 payloads — summaries + remote FAL URLs only.
 */

import type { ProductionMode } from "../production-engine/modes";
import type { ProductionEngineInput, ProductionEngineRunResult } from "../production-engine/types";
import type { ProductionPlanDocument } from "../production-engine/production-plan-schema";
import type { LabBrandForm, LabCreativeForm, LabComposeExtras } from "./map-to-production-input";

export type LabExecutionPathUi =
  | "router"
  | "generate"
  | "edit"
  | "lora_gen"
  | "lora_edit";

export type LabAssetBundle = {
  logoDataUrl?: string;
  heroDataUrl?: string;
  secondaryDataUrl?: string;
  tertiaryDataUrl?: string;
  extraRefs?: { id: string; name: string; dataUrl: string }[];
};

export const RUN_HISTORY_KEY = "creative-testing-lab-runs-v2";
export const RUN_HISTORY_VERSION = 4;
export const MAX_STORED_RUNS = 28;

export type OutputReviewMark = "preferred" | "rejected" | "refine" | "none";

export type LabFalExecutionRecord = {
  targetId: string;
  targetIndex: number;
  targetType?: string;
  /** Resolved endpoint id */
  pathId: string;
  /** Human: Text-to-image | Image edit | LoRA generate | LoRA edit | Skipped */
  pathKindLabel: string;
  ok: boolean;
  error?: string;
  imageUrls: string[];
};

export type LabManualVerdict = "strong" | "usable" | "weak" | "failed" | "";

export type LabTestRun = {
  version: typeof RUN_HISTORY_VERSION;
  id: string;
  createdAt: string;
  updatedAt: string;
  mode: ProductionMode;
  brandName: string;
  /** Key creative fields for scanning */
  headline: string;
  cta: string;
  conceptName: string;
  projectTitle: string;
  campaignCoreSnippet: string;
  visualDirectionSnippet: string;
  qualityTier: string;
  executionPathLabel: string;
  /** Restore FAL path dropdown */
  executionPathKey?: LabExecutionPathUi;
  falKeyConfigured: boolean;
  /** Full form restore (may omit on legacy runs) */
  labBrand?: LabBrandForm;
  labCreative?: LabCreativeForm;
  styleModelRef?: string;
  loraRef?: string;
  strongRefs?: boolean;
  preferEdit?: boolean;
  targetTypeFilter?: string;
  batchSize?: number;
  /** Uploaded assets as stored at last save (can be large) */
  assetBundle?: LabAssetBundle;
  /** Slim input for reload (no multi-MB data URLs) */
  productionInputSummary: Record<string, unknown>;
  falRoutingSummary: string;
  falPrimaryPath?: string;
  productionPlan?: ProductionPlanDocument;
  falExecutions: LabFalExecutionRecord[];
  selectedOutputUrl: string | null;
  /** key = `${targetId}::${url}` or url hash */
  outputMarks: Record<string, OutputReviewMark>;
  manualVerdict: LabManualVerdict;
  manualScores: {
    brandAlignment: number;
    realism: number;
    quality: number;
    composition: number;
    typographyLayout: number;
    usefulness: number;
  };
  manualNotes: string;
  /** Compose: dimensions + whether we had a preview (base64 not stored) */
  composeMeta: { width?: number; height?: number; hasPreview: boolean } | null;
  /** Filled after a successful Generate; for summary card */
  lastRunSummary?: {
    outputCount: number;
    chosenFalPath?: string;
    chosenFalPathLabel?: string;
    executedTargetIndices: number[];
  };
  /** Restore outputs panel without re-calling API */
  cachedPipelineResult?: ProductionEngineRunResult;
  falResultsSnapshot?: Array<{
    targetIndex: number;
    targetId: string;
    pathId: string;
    ok: boolean;
    imageUrls: string[];
    error?: string;
  }>;
  /** Side-by-side compare picks (restored with full run) */
  compareA?: string | null;
  compareB?: string | null;
  /** Compose-preview extras (platform repurpose, dieline JSON, QA bans, handoff status) */
  labComposeExtras?: LabComposeExtras & { socialRepurposePlatformIds?: string[] };
};

export function pathIdToKindLabel(pathId: string): string {
  if (pathId === "internal/composition-only") return "Skipped (composition-only)";
  if (pathId.includes("flux-lora") && pathId.includes("image-to-image"))
    return "LoRA image edit";
  if (pathId === "fal-ai/flux-lora") return "LoRA text-to-image";
  if (pathId.includes("image-to-image")) return "Image edit (i2i)";
  if (pathId.includes("flux-general")) return "Text-to-image";
  return pathId;
}

/** Strip heavy fields from input for storage */
export function summarizeProductionInput(input: ProductionEngineInput): Record<string, unknown> {
  const stripUrl = (u?: string) =>
    u && u.startsWith("data:") ? `[data-url ${Math.round(u.length / 1024)}kb]` : u;
  return {
    mode: input.mode,
    briefSummary: input.briefSummary.slice(0, 400),
    selectedHeadline: input.selectedHeadline,
    selectedCta: input.selectedCta,
    selectedConcept: input.selectedConcept,
    campaignCore: input.campaignCore,
    visualDirection: input.visualDirection.slice(0, 300),
    visualQualityTier: input.visualQualityTier,
    brandRulesSummary: input.brandRulesSummary.slice(0, 400),
    logoUrl: stripUrl(input.brandAssets?.logoUrl),
    heroImageUrl: stripUrl(input.heroImageUrl),
    secondaryImageUrl: stripUrl(input.secondaryImageUrl),
    tertiaryImageUrl: stripUrl(input.tertiaryImageUrl),
    referenceCount: input.referenceSummaries?.length ?? 0,
    socialOutputTarget: input.socialOutputTarget,
    packagingDielinePanelCount: input.packagingDieline?.panels.length,
    socialRepurposePlatformIds: input.socialRepurposePlatformIds,
    bannedSubstringCount: input.outputVerificationRules?.bannedSubstrings?.length,
    handoffStatus: input.handoffApproval?.status,
  };
}

export function loadRuns(): LabTestRun[] {
  try {
    const raw = localStorage.getItem(RUN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { runs?: Array<Record<string, unknown> & { id?: string; version?: number }> };
    if (!Array.isArray(parsed.runs)) return [];
    return parsed.runs
      .filter(
        (r) =>
          r &&
          typeof r.id === "string" &&
          (r.version === 2 || r.version === 3 || r.version === RUN_HISTORY_VERSION),
      )
      .map((r) => ({ ...r, version: RUN_HISTORY_VERSION } as LabTestRun));
  } catch {
    return [];
  }
}

export function saveRuns(runs: LabTestRun[]): void {
  const trimmed = runs.slice(-MAX_STORED_RUNS);
  localStorage.setItem(
    RUN_HISTORY_KEY,
    JSON.stringify({ version: RUN_HISTORY_VERSION, runs: trimmed }),
  );
}

export function buildExportPackage(run: LabTestRun): Record<string, unknown> {
  return {
    exportedAt: new Date().toISOString(),
    runId: run.id,
    inputs: run.productionInputSummary,
    labForm: {
      brand: run.labBrand,
      creative: run.labCreative,
      executionPathKey: run.executionPathKey,
      styleModelRef: run.styleModelRef,
      loraRef: run.loraRef,
      strongRefs: run.strongRefs,
      preferEdit: run.preferEdit,
      targetTypeFilter: run.targetTypeFilter,
      batchSize: run.batchSize,
    },
    productionPlan: run.productionPlan,
    falRoutingSummary: run.falRoutingSummary,
    falPrimaryPath: run.falPrimaryPath,
    falExecutions: run.falExecutions,
    falResultsSnapshot: run.falResultsSnapshot,
    lastRunSummary: run.lastRunSummary,
    selectedOutputUrl: run.selectedOutputUrl,
    compareA: run.compareA,
    compareB: run.compareB,
    outputMarks: run.outputMarks,
    manualQa: {
      verdict: run.manualVerdict,
      scores: run.manualScores,
      notes: run.manualNotes,
    },
    composeMeta: run.composeMeta,
    falKeyWasConfigured: run.falKeyConfigured,
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
