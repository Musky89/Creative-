/**
 * Lightweight persistent test run history (localStorage).
 * Avoids storing huge base64 payloads — summaries + remote FAL URLs only.
 */

import type { ProductionMode } from "../production-engine/modes";
import type { ProductionEngineInput } from "../production-engine/types";
import type { ProductionPlanDocument } from "../production-engine/production-plan-schema";

export const RUN_HISTORY_KEY = "creative-testing-lab-runs-v2";
export const RUN_HISTORY_VERSION = 2;
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
  falKeyConfigured: boolean;
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
  };
}

export function loadRuns(): LabTestRun[] {
  try {
    const raw = localStorage.getItem(RUN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { runs?: LabTestRun[] };
    if (!Array.isArray(parsed.runs)) return [];
    return parsed.runs.filter((r) => r.version === RUN_HISTORY_VERSION);
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
    productionPlan: run.productionPlan,
    falRoutingSummary: run.falRoutingSummary,
    falPrimaryPath: run.falPrimaryPath,
    falExecutions: run.falExecutions,
    selectedOutputUrl: run.selectedOutputUrl,
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
