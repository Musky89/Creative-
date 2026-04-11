"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PRODUCTION_MODES,
  listProductionModes,
  type ProductionEngineRunResult,
} from "@/lib/production-engine";
import { GENERATION_TARGET_TYPES } from "@/lib/production-engine/generation-targets";
import type { ProductionMode } from "@/lib/production-engine/modes";
import {
  mapLabToProductionEngineInput,
  type LabBrandForm,
  type LabCreativeForm,
  type LabAssetUrls,
} from "@/lib/creative-testing-lab/map-to-production-input";
import {
  RUN_HISTORY_VERSION,
  MAX_STORED_RUNS,
  type LabTestRun,
  type LabFalExecutionRecord,
  type OutputReviewMark,
  type LabManualVerdict,
  pathIdToKindLabel,
  summarizeProductionInput,
  loadRuns,
  saveRuns,
  buildExportPackage,
  downloadJson,
} from "@/lib/creative-testing-lab/run-history";
import {
  LAB_DEMO_PRESETS_STORAGE_KEY,
  LAB_DEMO_PRESETS_VERSION,
  rehydrateLabPresetsFromStorage,
  type LabFullPreset,
} from "@/lib/creative-testing-lab/demo-presets";
import {
  BRAND_PROFILES_VERSION,
  BRAND_PROFILES_VERSION_KEY,
  loadBrandProfiles,
  saveBrandProfiles,
  type LabBrandProfile,
} from "@/lib/creative-testing-lab/brand-profiles";

const PRESET_KEY = "creative-testing-lab-presets-v1";

function executionPathLabel(
  p: "router" | "generate" | "edit" | "lora_gen" | "lora_edit",
): string {
  const m: Record<typeof p, string> = {
    router: "Router (engine default)",
    generate: "Force text-to-image",
    edit: "Force image edit",
    lora_gen: "Force LoRA generate",
    lora_edit: "Force LoRA edit",
  };
  return m[p];
}

type ExecutionPathUi = "router" | "generate" | "edit" | "lora_gen" | "lora_edit";

/** Legacy runs may only have `executionPathLabel` string */
function inferExecutionPathFromLabel(label: string): ExecutionPathUi {
  if (label.includes("LoRA edit")) return "lora_edit";
  if (label.includes("LoRA generate")) return "lora_gen";
  if (label.includes("image edit")) return "edit";
  if (label.includes("text-to-image")) return "generate";
  return "router";
}

/** Stable across reruns (same target slot + variant index) */
function outputMarkKey(targetIndex: number, targetId: string, j: number): string {
  return `mark:${targetIndex}:${targetId}:${j}`;
}

function getOutputMark(
  marks: Record<string, OutputReviewMark>,
  targetIndex: number,
  targetId: string,
  j: number,
): OutputReviewMark {
  const k = outputMarkKey(targetIndex, targetId, j);
  if (marks[k]) return marks[k]!;
  const legacy = Object.keys(marks).find(
    (key) => key.startsWith(`${targetIndex}::${targetId}::${j}::`) || key.includes(`::${targetId}::${j}::`),
  );
  return legacy ? marks[legacy]! : "none";
}

const emptyBrand = (): LabBrandForm => ({
  clientName: "",
  industry: "",
  brandSummary: "",
  toneOfVoice: "",
  keyAudience: "",
  positioning: "",
  mustSignal: "",
  mustAvoid: "",
  visualLanguage: "",
  colorPalette: "",
  fontNotes: "",
  brandRulesCi: "",
  competitorNotes: "",
  marketRegion: "",
  fullBrandOperatingNotes: "",
});

const emptyCreative = (): LabCreativeForm => ({
  projectTitle: "",
  campaignCore: "",
  emotionalTension: "",
  visualNarrative: "",
  conceptName: "",
  conceptRationale: "",
  headline: "",
  cta: "",
  supportingCopy: "",
  visualDirection: "",
  compositionIntent: "",
  moodLighting: "",
  negativeSpaceNotes: "",
  deliverableNotes: "",
  packagingNotes: "",
  fashionNotes: "",
  longFormBrief: "",
});

type ReviewScores = {
  brandAlignment: number;
  realism: number;
  quality: number;
  composition: number;
  typographyLayout: number;
  usefulness: number;
};

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800/90 bg-zinc-900/40 shadow-xl shadow-black/20">
      <header className="border-b border-zinc-800/80 px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight text-zinc-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Stars({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-zinc-400">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`rounded px-1 text-sm ${n <= value ? "text-amber-400" : "text-zinc-600"}`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function CreativeTestingLabShell() {
  const [brand, setBrand] = useState(emptyBrand);
  const [creative, setCreative] = useState(emptyCreative);
  const [mode, setMode] = useState<ProductionMode>("SOCIAL");
  const [qualityTier, setQualityTier] = useState<"draft" | "standard" | "high" | "premium">("standard");
  const [executionPath, setExecutionPath] = useState<ExecutionPathUi>("router");
  const [batchSize, setBatchSize] = useState(1);
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("");
  const [styleModelRef, setStyleModelRef] = useState("");
  const [loraRef, setLoraRef] = useState("");
  const [strongRefs, setStrongRefs] = useState(false);
  const [preferEdit, setPreferEdit] = useState(false);

  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>();
  const [heroDataUrl, setHeroDataUrl] = useState<string | undefined>();
  const [secondaryDataUrl, setSecondaryDataUrl] = useState<string | undefined>();
  const [tertiaryDataUrl, setTertiaryDataUrl] = useState<string | undefined>();
  const [extraRefs, setExtraRefs] = useState<{ id: string; name: string; dataUrl: string }[]>([]);

  const [falKeyOk, setFalKeyOk] = useState<boolean | null>(null);
  const [pipelineResult, setPipelineResult] = useState<ProductionEngineRunResult | null>(null);
  const [composeData, setComposeData] = useState<Record<string, unknown> | null>(null);
  const [falResults, setFalResults] = useState<
    | {
        targetIndex: number;
        targetId: string;
        pathId: string;
        ok: boolean;
        imageUrls: string[];
        error?: string;
      }[]
    | null
  >(null);
  const [selectedVisualUrl, setSelectedVisualUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTargetIndices, setSelectedTargetIndices] = useState<number[]>([0]);

  const [reviewScores, setReviewScores] = useState<ReviewScores>({
    brandAlignment: 0,
    realism: 0,
    quality: 0,
    composition: 0,
    typographyLayout: 0,
    usefulness: 0,
  });
  const [reviewNotes, setReviewNotes] = useState("");

  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<LabFullPreset[]>([]);
  const [brandProfiles, setBrandProfiles] = useState<LabBrandProfile[]>([]);
  const [brandProfileName, setBrandProfileName] = useState("");
  const [brandProfileIncludeCreative, setBrandProfileIncludeCreative] = useState(false);
  const [assetUrlDrafts, setAssetUrlDrafts] = useState({
    logo: "",
    hero: "",
    secondary: "",
    tertiary: "",
  });
  const [extraRefUrlDraft, setExtraRefUrlDraft] = useState("");
  const [extraRefNameDraft, setExtraRefNameDraft] = useState("");

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<LabTestRun[]>([]);
  const [outputMarks, setOutputMarks] = useState<Record<string, OutputReviewMark>>({});
  const [manualVerdict, setManualVerdict] = useState<LabManualVerdict>("");
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const mergeRunIntoHistory = useCallback((updater: (prev: LabTestRun[]) => LabTestRun[]) => {
    setRunHistory((prev) => {
      const next = updater(prev).slice(-MAX_STORED_RUNS);
      saveRuns(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!activeRunId) return;
    const t = setTimeout(() => {
      mergeRunIntoHistory((prev) =>
        prev.map((r) =>
          r.id === activeRunId
            ? {
                ...r,
                updatedAt: new Date().toISOString(),
                labBrand: brand,
                labCreative: creative,
                executionPathKey: executionPath,
                styleModelRef,
                loraRef,
                strongRefs,
                preferEdit,
                targetTypeFilter,
                batchSize,
                assetBundle: {
                  logoDataUrl: logoDataUrl,
                  heroDataUrl: heroDataUrl,
                  secondaryDataUrl: secondaryDataUrl,
                  tertiaryDataUrl: tertiaryDataUrl,
                  extraRefs,
                },
                manualScores: reviewScores,
                manualNotes: reviewNotes,
                manualVerdict,
                selectedOutputUrl: selectedVisualUrl,
                outputMarks,
                compareA,
                compareB,
                cachedPipelineResult: pipelineResult ?? r.cachedPipelineResult,
                falResultsSnapshot: falResults ?? r.falResultsSnapshot,
              }
            : r,
        ),
      );
    }, 900);
    return () => clearTimeout(t);
  }, [
    activeRunId,
    brand,
    creative,
    executionPath,
    styleModelRef,
    loraRef,
    strongRefs,
    preferEdit,
    targetTypeFilter,
    batchSize,
    logoDataUrl,
    heroDataUrl,
    secondaryDataUrl,
    tertiaryDataUrl,
    extraRefs,
    reviewScores,
    reviewNotes,
    manualVerdict,
    selectedVisualUrl,
    outputMarks,
    compareA,
    compareB,
    pipelineResult,
    falResults,
    mergeRunIntoHistory,
  ]);

  useEffect(() => {
    fetch("/api/creative-testing-lab/status")
      .then((r) => r.json())
      .then((d: { falKeyConfigured?: boolean }) => setFalKeyOk(!!d.falKeyConfigured))
      .catch(() => setFalKeyOk(false));
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      const demoVer = localStorage.getItem(LAB_DEMO_PRESETS_STORAGE_KEY);
      const { presets: nextPresets, shouldPersist } = rehydrateLabPresetsFromStorage({
        presetsJson: raw,
        demoVersionKey: demoVer ?? "",
      });
      setPresets(nextPresets);
      if (shouldPersist) {
        localStorage.setItem(PRESET_KEY, JSON.stringify(nextPresets));
        localStorage.setItem(LAB_DEMO_PRESETS_STORAGE_KEY, String(LAB_DEMO_PRESETS_VERSION));
      }
    } catch {
      /* ignore */
    }
    setRunHistory(loadRuns());
    try {
      const bp = loadBrandProfiles();
      setBrandProfiles(bp);
      if (!localStorage.getItem(BRAND_PROFILES_VERSION_KEY)) {
        localStorage.setItem(BRAND_PROFILES_VERSION_KEY, String(BRAND_PROFILES_VERSION));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistBrandProfiles = useCallback((next: LabBrandProfile[]) => {
    setBrandProfiles(next);
    saveBrandProfiles(next);
  }, []);

  const persistPresets = useCallback((next: LabFullPreset[]) => {
    setPresets(next);
    localStorage.setItem(PRESET_KEY, JSON.stringify(next));
  }, []);

  const loadFullRun = useCallback((run: LabTestRun) => {
    setActiveRunId(run.id);
    setMode(run.mode);
    setQualityTier((run.qualityTier as typeof qualityTier) || "standard");
    setExecutionPath(run.executionPathKey ?? inferExecutionPathFromLabel(run.executionPathLabel));
    setBatchSize(run.batchSize ?? 1);
    setTargetTypeFilter(run.targetTypeFilter ?? "");
    setStyleModelRef(run.styleModelRef ?? "");
    setLoraRef(run.loraRef ?? "");
    setStrongRefs(run.strongRefs ?? false);
    setPreferEdit(run.preferEdit ?? false);
    if (run.labBrand) setBrand(run.labBrand);
    if (run.labCreative) setCreative(run.labCreative);
    const ab = run.assetBundle;
    setLogoDataUrl(ab?.logoDataUrl);
    setHeroDataUrl(ab?.heroDataUrl);
    setSecondaryDataUrl(ab?.secondaryDataUrl);
    setTertiaryDataUrl(ab?.tertiaryDataUrl);
    setExtraRefs(ab?.extraRefs ?? []);
    setAssetUrlDrafts({
      logo: ab?.logoDataUrl?.startsWith("http") ? ab.logoDataUrl : "",
      hero: ab?.heroDataUrl?.startsWith("http") ? ab.heroDataUrl : "",
      secondary: ab?.secondaryDataUrl?.startsWith("http") ? ab.secondaryDataUrl : "",
      tertiary: ab?.tertiaryDataUrl?.startsWith("http") ? ab.tertiaryDataUrl : "",
    });
    setReviewScores(run.manualScores);
    setReviewNotes(run.manualNotes);
    setManualVerdict(run.manualVerdict);
    setOutputMarks(run.outputMarks);
    setSelectedVisualUrl(run.selectedOutputUrl);
    setCompareA(run.compareA ?? null);
    setCompareB(run.compareB ?? null);
    setPipelineResult(run.cachedPipelineResult ?? null);
    setFalResults(run.falResultsSnapshot ?? null);
    setComposeData(null);
    const n = run.cachedPipelineResult?.visualExecution.targets.length ?? 0;
    setSelectedTargetIndices(n ? [0] : []);
  }, []);

  const assets: LabAssetUrls = useMemo(
    () => ({
      logoUrl: logoDataUrl,
      heroImageUrl: heroDataUrl,
      secondaryImageUrl: secondaryDataUrl,
      tertiaryImageUrl: tertiaryDataUrl,
      referenceUrls: extraRefs.map((r) => r.dataUrl),
    }),
    [logoDataUrl, heroDataUrl, secondaryDataUrl, tertiaryDataUrl, extraRefs],
  );

  const productionInput = useMemo(() => {
    const input = mapLabToProductionEngineInput({
      mode,
      brand,
      creative,
      assets,
      visualQualityTier: qualityTier,
      visualStyleRef: styleModelRef || undefined,
      modelRef: loraRef || undefined,
    });
    return input;
  }, [mode, brand, creative, assets, qualityTier, styleModelRef, loraRef]);

  const visualBundleOptions = useMemo(
    () => ({
      extraReferenceUrls: extraRefs.map((r) => r.dataUrl),
      preferEditOverGenerate: preferEdit,
      strongReferenceImages: strongRefs,
    }),
    [extraRefs, preferEdit, strongRefs],
  );

  const executionKind = useMemo(() => {
    switch (executionPath) {
      case "generate":
        return "force_text";
      case "edit":
        return "force_edit";
      case "lora_gen":
        return "force_lora";
      case "lora_edit":
        return "force_lora_edit";
      default:
        return "router_default";
    }
  }, [executionPath]);

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/creative-testing-lab/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { dataUrl?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.dataUrl!;
  }

  const filteredTargetIndices = useMemo(() => {
    if (!pipelineResult) return [];
    const targets = pipelineResult.visualExecution.targets;
    let idxs = targets.map((_, i) => i);
    if (targetTypeFilter) {
      idxs = idxs.filter((i) => targets[i]!.targetType === targetTypeFilter);
    }
    return idxs.length ? idxs : [0];
  }, [pipelineResult, targetTypeFilter]);

  async function runPipeline() {
    setLoading("pipeline");
    setError(null);
    const runId = activeRunId ?? `run-${Date.now()}`;
    setActiveRunId(runId);
    try {
      const res = await fetch("/api/creative-testing-lab/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: productionInput, visualBundleOptions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      const pr = data as ProductionEngineRunResult;
      setPipelineResult(pr);
      const n = pr.visualExecution.targets.length;
      setSelectedTargetIndices(n ? [0] : []);

      const now = new Date().toISOString();
      const falExecPlanned: LabFalExecutionRecord[] =
        pr.visualExecution.routedExecutions.map((ex, i) => ({
          targetId: ex.target.id,
          targetIndex: i,
          targetType: ex.target.targetType,
          pathId: ex.route.pathId,
          pathKindLabel: `${ex.route.kind.replace(/_/g, " ")} · ${pathIdToKindLabel(ex.route.pathId)}`,
          ok: ex.route.pathId !== "internal/composition-only",
          error:
            ex.route.pathId === "internal/composition-only"
              ? "Router: composition-only (no FAL image for this target)"
              : undefined,
          imageUrls: [],
        }));

      mergeRunIntoHistory((prev) => {
        const existing = prev.find((r) => r.id === runId);
        const assetBundle = {
          logoDataUrl,
          heroDataUrl,
          secondaryDataUrl,
          tertiaryDataUrl,
          extraRefs,
        };
        const base: LabTestRun =
          existing ?? {
            version: RUN_HISTORY_VERSION,
            id: runId,
            createdAt: now,
            updatedAt: now,
            mode: productionInput.mode,
            brandName: brand.clientName || "(unnamed brand)",
            headline: creative.headline,
            cta: creative.cta,
            conceptName: creative.conceptName,
            projectTitle: creative.projectTitle,
            campaignCoreSnippet: creative.campaignCore.slice(0, 200),
            visualDirectionSnippet: creative.visualDirection.slice(0, 200),
            qualityTier,
            executionPathLabel: executionPathLabel(executionPath),
            executionPathKey: executionPath,
            labBrand: brand,
            labCreative: creative,
            styleModelRef,
            loraRef,
            strongRefs,
            preferEdit,
            targetTypeFilter,
            batchSize,
            assetBundle,
            falKeyConfigured: falKeyOk === true,
            productionInputSummary: summarizeProductionInput(productionInput),
            falRoutingSummary: "",
            falPrimaryPath: undefined,
            productionPlan: undefined,
            falExecutions: [],
            selectedOutputUrl: null,
            outputMarks: {},
            manualVerdict: "",
            manualScores: reviewScores,
            manualNotes: reviewNotes,
            composeMeta: null,
          };
        const merged: LabTestRun = {
          ...base,
          updatedAt: now,
          mode: productionInput.mode,
          brandName: brand.clientName || base.brandName,
          headline: creative.headline,
          cta: creative.cta,
          conceptName: creative.conceptName,
          projectTitle: creative.projectTitle,
          campaignCoreSnippet: creative.campaignCore.slice(0, 200),
          visualDirectionSnippet: creative.visualDirection.slice(0, 200),
          qualityTier,
          executionPathLabel: executionPathLabel(executionPath),
          executionPathKey: executionPath,
          labBrand: brand,
          labCreative: creative,
          styleModelRef,
          loraRef,
          strongRefs,
          preferEdit,
          targetTypeFilter,
          batchSize,
          assetBundle,
          falKeyConfigured: falKeyOk === true,
          productionInputSummary: summarizeProductionInput(productionInput),
          falRoutingSummary: pr.falRouting.reason,
          falPrimaryPath: pr.falRouting.primaryEndpointId,
          productionPlan: pr.productionPlan,
          falExecutions: falExecPlanned,
          cachedPipelineResult: pr,
        };
        return [...prev.filter((r) => r.id !== runId), merged];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function runFal(indicesArg?: number[]) {
    setLoading("fal");
    setError(null);
    const indices =
      indicesArg ??
      (selectedTargetIndices.length > 0
        ? selectedTargetIndices
        : filteredTargetIndices.slice(0, 3));
    try {
      const res = await fetch("/api/creative-testing-lab/fal-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: productionInput,
          visualBundleOptions,
          targetIndices: indices.slice(0, 8),
          executionKind,
          batchSize,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      const results = data.results as Array<{
        targetIndex: number;
        targetId: string;
        pathId: string;
        ok: boolean;
        imageUrls: string[];
        error?: string;
      }>;
      setFalResults(results);
      const firstUrl = results.find((r) => r.imageUrls?.length)?.imageUrls?.[0];
      if (firstUrl) setSelectedVisualUrl(firstUrl);

      if (activeRunId) {
        const outputCount = results.reduce((acc, x) => acc + x.imageUrls.length, 0);
        const firstPath = results.find((x) => x.imageUrls.length)?.pathId ?? results[0]?.pathId;
        mergeRunIntoHistory((prev) =>
          prev.map((r) => {
            if (r.id !== activeRunId) return r;
            const byIdx = new Map(results.map((x) => [x.targetIndex, x]));
            const nextExec = r.falExecutions.map((ex) => {
              const hit = byIdx.get(ex.targetIndex);
              if (!hit) return ex;
              return {
                ...ex,
                pathId: hit.pathId,
                pathKindLabel: pathIdToKindLabel(hit.pathId),
                ok: hit.ok && hit.imageUrls.length > 0,
                imageUrls: hit.imageUrls,
                error: hit.error,
              };
            });
            return {
              ...r,
              updatedAt: new Date().toISOString(),
              falExecutions: nextExec,
              falResultsSnapshot: results,
              lastRunSummary: {
                outputCount,
                chosenFalPath: firstPath,
                chosenFalPathLabel: firstPath ? pathIdToKindLabel(firstPath) : undefined,
                executedTargetIndices: indices.slice(0, 8),
              },
              falKeyConfigured: falKeyOk === true,
            };
          }),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  function runFalSingleOnly() {
    const idx =
      selectedTargetIndices.length === 1
        ? selectedTargetIndices[0]
        : selectedTargetIndices[0] ?? filteredTargetIndices[0];
    if (idx === undefined) {
      setError("Select one target (or run Build plan first).");
      return;
    }
    void runFal([idx]);
  }

  function runFalAllTargets() {
    if (!pipelineResult) return;
    const all = pipelineResult.visualExecution.targets.map((_, i) => i);
    void runFal(all.slice(0, 12));
  }

  async function runCompose() {
    setLoading("compose");
    setError(null);
    const inputPayload = {
      ...productionInput,
      heroImageUrl: selectedVisualUrl ?? productionInput.heroImageUrl,
    };
    try {
      const res = await fetch("/api/production-engine/compose-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: inputPayload,
          visualBundleOptions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setComposeData(data as Record<string, unknown>);
      const preview = data.preview as { width?: number; height?: number } | undefined;
      if (activeRunId) {
        mergeRunIntoHistory((prev) =>
          prev.map((r) =>
            r.id === activeRunId
              ? {
                  ...r,
                  updatedAt: new Date().toISOString(),
                  composeMeta: {
                    width: preview?.width,
                    height: preview?.height,
                    hasPreview: !!preview,
                  },
                }
              : r,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  function saveQaToRun() {
    if (!activeRunId) return;
    mergeRunIntoHistory((prev) =>
      prev.map((r) =>
        r.id === activeRunId
          ? {
              ...r,
              updatedAt: new Date().toISOString(),
              labBrand: brand,
              labCreative: creative,
              executionPathKey: executionPath,
              styleModelRef,
              loraRef,
              strongRefs,
              preferEdit,
              targetTypeFilter,
              batchSize,
              assetBundle: {
                logoDataUrl,
                heroDataUrl,
                secondaryDataUrl,
                tertiaryDataUrl,
                extraRefs,
              },
              manualScores: reviewScores,
              manualNotes: reviewNotes,
              manualVerdict,
              selectedOutputUrl: selectedVisualUrl,
              outputMarks,
              compareA,
              compareB,
              cachedPipelineResult: pipelineResult ?? r.cachedPipelineResult,
              falResultsSnapshot: falResults ?? r.falResultsSnapshot,
            }
          : r,
      ),
    );
  }

  function setMarkForOutput(
    targetIndex: number,
    targetId: string,
    j: number,
    mark: OutputReviewMark,
  ) {
    const k = outputMarkKey(targetIndex, targetId, j);
    setOutputMarks((prev) => ({ ...prev, [k]: mark }));
  }

  function exportCurrentRunJson() {
    const run = runHistory.find((r) => r.id === activeRunId);
    if (!run) {
      setError("No active run in history — run pipeline first.");
      return;
    }
    const merged: LabTestRun = {
      ...run,
      manualScores: reviewScores,
      manualNotes: reviewNotes,
      manualVerdict,
      selectedOutputUrl: selectedVisualUrl,
      outputMarks,
      compareA,
      compareB,
      cachedPipelineResult: pipelineResult ?? run.cachedPipelineResult,
      falResultsSnapshot: falResults ?? run.falResultsSnapshot,
      updatedAt: new Date().toISOString(),
    };
    downloadJson(`creative-lab-run-${run.id}.json`, buildExportPackage(merged));
  }

  function startNewRun() {
    const id = `run-${Date.now()}`;
    setActiveRunId(id);
    setPipelineResult(null);
    setFalResults(null);
    setComposeData(null);
    setOutputMarks({});
    setManualVerdict("");
    setCompareA(null);
    setCompareB(null);
  }

  function resetForNewBrandTest() {
    setBrand(emptyBrand());
    setCreative(emptyCreative());
    setLogoDataUrl(undefined);
    setHeroDataUrl(undefined);
    setSecondaryDataUrl(undefined);
    setTertiaryDataUrl(undefined);
    setExtraRefs([]);
    setMode("SOCIAL");
    setQualityTier("standard");
    setExecutionPath("router");
    setBatchSize(1);
    setTargetTypeFilter("");
    setStyleModelRef("");
    setLoraRef("");
    setStrongRefs(false);
    setPreferEdit(false);
    setPipelineResult(null);
    setFalResults(null);
    setComposeData(null);
    setSelectedVisualUrl(null);
    setOutputMarks({});
    setManualVerdict("");
    setCompareA(null);
    setCompareB(null);
    setReviewScores({
      brandAlignment: 0,
      realism: 0,
      quality: 0,
      composition: 0,
      typographyLayout: 0,
      usefulness: 0,
    });
    setReviewNotes("");
    setError(null);
    setAssetUrlDrafts({ logo: "", hero: "", secondary: "", tertiary: "" });
    setExtraRefUrlDraft("");
    setExtraRefNameDraft("");
    startNewRun();
  }

  function saveBrandProfileFromForm() {
    const name = brandProfileName.trim() || "Untitled brand profile";
    const profile: LabBrandProfile = {
      version: BRAND_PROFILES_VERSION,
      id: `bp-${Date.now()}`,
      name,
      brand: { ...brand },
      seedAssets: {
        logoUrl: logoDataUrl,
        heroUrl: heroDataUrl,
        secondaryUrl: secondaryDataUrl,
        tertiaryUrl: tertiaryDataUrl,
        extraRefs: extraRefs.map((r) => ({ id: r.id, name: r.name, url: r.dataUrl })),
      },
      defaultMode: mode,
      qualityTier,
      executionPath,
      batchSize,
      targetTypeFilter,
      styleModelRef,
      loraRef,
      strongRefs,
      preferEdit,
      storedCreative: brandProfileIncludeCreative ? { ...creative } : null,
    };
    persistBrandProfiles([...brandProfiles.filter((x) => x.name !== name), profile]);
    setBrandProfileName("");
    setBrandProfileIncludeCreative(false);
  }

  function loadBrandProfile(id: string) {
    const p = brandProfiles.find((x) => x.id === id);
    if (!p) return;
    setBrand(p.brand);
    setMode(p.defaultMode);
    setQualityTier(p.qualityTier);
    setExecutionPath(p.executionPath);
    setBatchSize(p.batchSize);
    setTargetTypeFilter(p.targetTypeFilter);
    setStyleModelRef(p.styleModelRef);
    setLoraRef(p.loraRef);
    setStrongRefs(p.strongRefs);
    setPreferEdit(p.preferEdit);
    setCreative(p.storedCreative ? { ...p.storedCreative } : emptyCreative());
    const s = p.seedAssets;
    setLogoDataUrl(s.logoUrl);
    setHeroDataUrl(s.heroUrl);
    setSecondaryDataUrl(s.secondaryUrl);
    setTertiaryDataUrl(s.tertiaryUrl);
    setExtraRefs(
      (s.extraRefs ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        dataUrl: r.url,
      })),
    );
    setAssetUrlDrafts({
      logo: s.logoUrl?.startsWith("http") ? s.logoUrl : "",
      hero: s.heroUrl?.startsWith("http") ? s.heroUrl : "",
      secondary: s.secondaryUrl?.startsWith("http") ? s.secondaryUrl : "",
      tertiary: s.tertiaryUrl?.startsWith("http") ? s.tertiaryUrl : "",
    });
    setPipelineResult(null);
    setFalResults(null);
    setComposeData(null);
    setSelectedVisualUrl(null);
    setOutputMarks({});
    setCompareA(null);
    setCompareB(null);
    setError(null);
  }

  function savePreset() {
    const name = presetName.trim() || "Untitled preset";
    const p: LabFullPreset = {
      id: `p-${Date.now()}`,
      name,
      brand: { ...brand },
      creative: { ...creative },
      mode,
      qualityTier,
      executionPath,
      batchSize,
      targetTypeFilter,
      styleModelRef,
      loraRef,
      strongRefs,
      preferEdit,
      seedAssets: {
        logoUrl: logoDataUrl,
        heroUrl: heroDataUrl,
        secondaryUrl: secondaryDataUrl,
        tertiaryUrl: tertiaryDataUrl,
        extraRefs: extraRefs.map((r) => ({ id: r.id, name: r.name, url: r.dataUrl })),
      },
    };
    persistPresets([...presets.filter((x) => x.name !== name), p]);
    setPresetName("");
  }

  function loadPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setBrand(p.brand);
    setCreative(p.creative);
    setMode(p.mode);
    setQualityTier(p.qualityTier ?? "standard");
    setExecutionPath(p.executionPath ?? "router");
    setBatchSize(p.batchSize ?? 1);
    setTargetTypeFilter(p.targetTypeFilter ?? "");
    setStyleModelRef(p.styleModelRef ?? "");
    setLoraRef(p.loraRef ?? "");
    setStrongRefs(p.strongRefs ?? false);
    setPreferEdit(p.preferEdit ?? false);
    const s = p.seedAssets;
    setLogoDataUrl(s?.logoUrl);
    setHeroDataUrl(s?.heroUrl);
    setSecondaryDataUrl(s?.secondaryUrl);
    setTertiaryDataUrl(s?.tertiaryUrl);
    setExtraRefs(
      (s?.extraRefs ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        dataUrl: r.url,
      })),
    );
    setAssetUrlDrafts({
      logo: s?.logoUrl?.startsWith("http") ? s.logoUrl : "",
      hero: s?.heroUrl?.startsWith("http") ? s.heroUrl : "",
      secondary: s?.secondaryUrl?.startsWith("http") ? s.secondaryUrl : "",
      tertiary: s?.tertiaryUrl?.startsWith("http") ? s.tertiaryUrl : "",
    });
  }

  const modeCfg = listProductionModes().find((m) => m.id === mode);

  return (
    <div className="space-y-10">
      {falKeyOk === false ? (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          <strong className="font-semibold">FAL_KEY missing.</strong> You can still build plans and inspect
          routing. Live calls to fal.ai will return 503 until{" "}
          <code className="rounded bg-black/30 px-1">FAL_KEY</code> is set server-side.
        </div>
      ) : falKeyOk === true ? (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-2 text-xs text-emerald-200/90">
          FAL_KEY is configured — generation uses text-to-image, image edit, or LoRA endpoints per path below.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 px-4 py-2 text-xs text-zinc-500">
          Checking FAL_KEY status…
        </div>
      )}

      {error ? (
        <pre className="max-h-40 overflow-auto rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-xs text-red-100">
          {error}
        </pre>
      ) : null}

      <Card
        title="Run history"
        subtitle="Stored in this browser (localStorage). Compare runs and export JSON for review."
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startNewRun}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            New run
          </button>
          <span className="text-xs text-zinc-500">
            Active:{" "}
            <span className="font-mono text-zinc-400">{activeRunId ?? "— (build plan to create)"}</span>
          </span>
          <button
            type="button"
            onClick={exportCurrentRunJson}
            disabled={!activeRunId}
            className="rounded-lg bg-zinc-700 px-3 py-2 text-xs text-white hover:bg-zinc-600 disabled:opacity-40"
          >
            Export run JSON
          </button>
        </div>
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {[...runHistory].reverse().map((r) => (
            <div
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                r.id === activeRunId ? "border-violet-500/50 bg-violet-950/20" : "border-zinc-800 bg-zinc-950/40"
              }`}
            >
              <div>
                <span className="text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span>
                <span className="ml-2 font-mono text-xs text-emerald-400/90">{r.mode}</span>
                <span className="ml-2 text-zinc-300">{r.brandName}</span>
                <span className="ml-2 line-clamp-1 text-xs text-zinc-500">{r.headline}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-violet-400 hover:underline"
                  onClick={() => loadFullRun(r)}
                >
                  Load full run
                </button>
                <button
                  type="button"
                  className="text-xs text-zinc-400 hover:underline"
                  onClick={() => {
                    setActiveRunId(r.id);
                    setPipelineResult(null);
                    setFalResults(null);
                    setComposeData(null);
                  }}
                >
                  Set active
                </button>
                <button
                  type="button"
                  className="text-xs text-red-400/80 hover:underline"
                  onClick={() =>
                    mergeRunIntoHistory((prev) => prev.filter((x) => x.id !== r.id))
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Brand profiles"
        subtitle="Save a full brand kit (all Brand context fields + asset URLs or uploads + default mode/FAL settings). Reuse across tests; optionally include current campaign creative."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetForNewBrandTest}
            className="rounded-lg border border-violet-600/50 bg-violet-950/30 px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-950/50"
          >
            New brand test (clear all fields)
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Profile name (e.g. Acme Corp)"
            value={brandProfileName}
            onChange={(e) => setBrandProfileName(e.target.value)}
          />
          <button
            type="button"
            onClick={saveBrandProfileFromForm}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600"
          >
            Save brand profile
          </button>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={brandProfileIncludeCreative}
            onChange={(e) => setBrandProfileIncludeCreative(e.target.checked)}
          />
          Also save current Creative input (headline, brief, etc.) into this profile
        </label>
        <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
          {brandProfiles.length === 0 ? (
            <li className="text-sm text-zinc-500">No saved profiles yet — fill Brand context + assets, then save.</li>
          ) : (
            brandProfiles.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2"
              >
                <span className="text-sm text-zinc-300">{p.name}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-violet-400 hover:underline"
                    onClick={() => loadBrandProfile(p.id)}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-400/80 hover:underline"
                    onClick={() => persistBrandProfiles(brandProfiles.filter((x) => x.id !== p.id))}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card
          title="Brand context"
          subtitle="Who this is for — CI, tone, and guardrails feed the production plan and FAL prompts. Use “Brand profiles” above to save or load the full set."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand / client name">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                value={brand.clientName}
                onChange={(e) => setBrand({ ...brand, clientName: e.target.value })}
              />
            </Field>
            <Field label="Industry / category">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.industry}
                onChange={(e) => setBrand({ ...brand, industry: e.target.value })}
              />
            </Field>
            <Field label="Brand summary" className="sm:col-span-2">
              <textarea
                className="h-20 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.brandSummary}
                onChange={(e) => setBrand({ ...brand, brandSummary: e.target.value })}
              />
            </Field>
            <Field label="Tone of voice">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.toneOfVoice}
                onChange={(e) => setBrand({ ...brand, toneOfVoice: e.target.value })}
              />
            </Field>
            <Field label="Key audience">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.keyAudience}
                onChange={(e) => setBrand({ ...brand, keyAudience: e.target.value })}
              />
            </Field>
            <Field label="Positioning" className="sm:col-span-2">
              <textarea
                className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.positioning}
                onChange={(e) => setBrand({ ...brand, positioning: e.target.value })}
              />
            </Field>
            <Field label="Must signal">
              <textarea
                className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.mustSignal}
                onChange={(e) => setBrand({ ...brand, mustSignal: e.target.value })}
              />
            </Field>
            <Field label="Must avoid">
              <textarea
                className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.mustAvoid}
                onChange={(e) => setBrand({ ...brand, mustAvoid: e.target.value })}
              />
            </Field>
            <Field label="Visual language" className="sm:col-span-2">
              <textarea
                className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.visualLanguage}
                onChange={(e) => setBrand({ ...brand, visualLanguage: e.target.value })}
              />
            </Field>
            <Field label="Color palette (hex or notes)" className="sm:col-span-2">
              <textarea
                className="h-14 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.colorPalette}
                onChange={(e) => setBrand({ ...brand, colorPalette: e.target.value })}
                placeholder="#1a1a1a, #f4f4f5, …"
              />
            </Field>
            <Field label="Font / typography notes" className="sm:col-span-2">
              <textarea
                className="h-14 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.fontNotes}
                onChange={(e) => setBrand({ ...brand, fontNotes: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2 rounded-xl border border-violet-900/40 bg-violet-950/15 p-4">
              <p className="text-sm font-semibold text-violet-200/90">Composer typography (deterministic)</p>
              <p className="mt-1 text-xs text-zinc-500">
                Headline + CTA in Sharp compose: Google Fonts (server fetch) or licensed client upload (.woff2 /
                .woff / .ttf). Does not change FAL image generation.
              </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-500">
              <p className="font-medium text-zinc-400">Headline face</p>
              <select
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                value={brand.composerFontHeadlineMode ?? "default"}
                onChange={(e) =>
                  setBrand({
                    ...brand,
                    composerFontHeadlineMode: e.target.value as "default" | "google_fonts" | "client_upload",
                  })
                }
              >
                <option value="default">Default (DejaVu / system sans)</option>
                <option value="google_fonts">Google Fonts (OFL catalog)</option>
                <option value="client_upload">Client font file (licensed)</option>
              </select>
              {(brand.composerFontHeadlineMode ?? "default") === "google_fonts" ? (
                <input
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="Family name, e.g. Oswald, Bebas Neue, Inter"
                  value={brand.composerFontHeadlineGoogle ?? ""}
                  onChange={(e) => setBrand({ ...brand, composerFontHeadlineGoogle: e.target.value })}
                />
              ) : null}
              {(brand.composerFontHeadlineMode ?? "default") === "client_upload" ? (
                <div className="mt-2">
                  <input
                    type="file"
                    accept=".woff2,.woff,.ttf,font/woff2,font/woff"
                    className="text-xs text-zinc-500"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const fd = new FormData();
                      fd.set("file", f);
                      const res = await fetch("/api/creative-testing-lab/upload-font", {
                        method: "POST",
                        body: fd,
                      });
                      const data = (await res.json()) as { dataUrl?: string; error?: string };
                      if (!res.ok) {
                        setError(data.error ?? "Font upload failed");
                        return;
                      }
                      if (data.dataUrl) {
                        setBrand({ ...brand, composerFontHeadlineFileDataUrl: data.dataUrl });
                        setError(null);
                      }
                      e.target.value = "";
                    }}
                  />
                  {brand.composerFontHeadlineFileDataUrl ? (
                    <p className="mt-1 text-[11px] text-emerald-400/90">Font embedded for compose ✓</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="sm:col-span-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-500">
              <label className="flex items-center gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={brand.composerFontCtaSameAsHeadline !== false}
                  onChange={(e) =>
                    setBrand({ ...brand, composerFontCtaSameAsHeadline: e.target.checked })
                  }
                />
                CTA uses same font as headline
              </label>
              {brand.composerFontCtaSameAsHeadline === false ? (
                <>
                  <p className="mt-3 font-medium text-zinc-400">CTA face</p>
                  <select
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                    value={brand.composerFontCtaMode ?? "default"}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        composerFontCtaMode: e.target.value as "default" | "google_fonts" | "client_upload",
                      })
                    }
                  >
                    <option value="default">Default</option>
                    <option value="google_fonts">Google Fonts</option>
                    <option value="client_upload">Client font file</option>
                  </select>
                  {(brand.composerFontCtaMode ?? "default") === "google_fonts" ? (
                    <input
                      className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                      placeholder="Google Font family name"
                      value={brand.composerFontCtaGoogle ?? ""}
                      onChange={(e) => setBrand({ ...brand, composerFontCtaGoogle: e.target.value })}
                    />
                  ) : null}
                  {(brand.composerFontCtaMode ?? "default") === "client_upload" ? (
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".woff2,.woff,.ttf"
                        className="text-xs text-zinc-500"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const fd = new FormData();
                          fd.set("file", f);
                          const res = await fetch("/api/creative-testing-lab/upload-font", {
                            method: "POST",
                            body: fd,
                          });
                          const data = (await res.json()) as { dataUrl?: string; error?: string };
                          if (!res.ok) {
                            setError(data.error ?? "Font upload failed");
                            return;
                          }
                          if (data.dataUrl) {
                            setBrand({ ...brand, composerFontCtaFileDataUrl: data.dataUrl });
                            setError(null);
                          }
                          e.target.value = "";
                        }}
                      />
                      {brand.composerFontCtaFileDataUrl ? (
                        <p className="mt-1 text-[11px] text-emerald-400/90">CTA font embedded ✓</p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
            </div>
            </div>
            <Field label="Brand rules / CI notes" className="sm:col-span-2">
              <textarea
                className="h-20 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.brandRulesCi}
                onChange={(e) => setBrand({ ...brand, brandRulesCi: e.target.value })}
              />
            </Field>
            <Field label="Competitor / category notes">
              <textarea
                className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.competitorNotes}
                onChange={(e) => setBrand({ ...brand, competitorNotes: e.target.value })}
              />
            </Field>
            <Field label="Market / region">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.marketRegion}
                onChange={(e) => setBrand({ ...brand, marketRegion: e.target.value })}
              />
            </Field>
            <Field label="Full brand operating notes" className="sm:col-span-2">
              <textarea
                className="h-32 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={brand.fullBrandOperatingNotes}
                onChange={(e) => setBrand({ ...brand, fullBrandOperatingNotes: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Brand assets"
          subtitle="Upload files (data URLs) or paste HTTPS image URLs (Wikimedia, Unsplash, your CDN). Remote URLs work for compose and FAL."
        >
          <div className="space-y-4">
            <AssetRow
              label="Logo"
              dataUrl={logoDataUrl}
              onFile={async (f) => setLogoDataUrl(await uploadFile(f))}
              onClear={() => setLogoDataUrl(undefined)}
              urlDraft={assetUrlDrafts.logo}
              onUrlDraftChange={(v) => setAssetUrlDrafts((d) => ({ ...d, logo: v }))}
              onApplyUrl={() => {
                const u = assetUrlDrafts.logo.trim();
                if (u) setLogoDataUrl(u);
              }}
            />
            <AssetRow
              label="Hero / primary visual (compose + optional edit)"
              dataUrl={heroDataUrl}
              onFile={async (f) => setHeroDataUrl(await uploadFile(f))}
              onClear={() => setHeroDataUrl(undefined)}
              urlDraft={assetUrlDrafts.hero}
              onUrlDraftChange={(v) => setAssetUrlDrafts((d) => ({ ...d, hero: v }))}
              onApplyUrl={() => {
                const u = assetUrlDrafts.hero.trim();
                if (u) setHeroDataUrl(u);
              }}
            />
            <AssetRow
              label="Secondary visual"
              dataUrl={secondaryDataUrl}
              onFile={async (f) => setSecondaryDataUrl(await uploadFile(f))}
              onClear={() => setSecondaryDataUrl(undefined)}
              urlDraft={assetUrlDrafts.secondary}
              onUrlDraftChange={(v) => setAssetUrlDrafts((d) => ({ ...d, secondary: v }))}
              onApplyUrl={() => {
                const u = assetUrlDrafts.secondary.trim();
                if (u) setSecondaryDataUrl(u);
              }}
            />
            <AssetRow
              label="Tertiary (identity route C / detail)"
              dataUrl={tertiaryDataUrl}
              onFile={async (f) => setTertiaryDataUrl(await uploadFile(f))}
              onClear={() => setTertiaryDataUrl(undefined)}
              urlDraft={assetUrlDrafts.tertiary}
              onUrlDraftChange={(v) => setAssetUrlDrafts((d) => ({ ...d, tertiary: v }))}
              onApplyUrl={() => {
                const u = assetUrlDrafts.tertiary.trim();
                if (u) setTertiaryDataUrl(u);
              }}
            />
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">
                Reference boards, packshots, inspiration (multiple)
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  className="min-w-[120px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
                  placeholder="Label (optional)"
                  value={extraRefNameDraft}
                  onChange={(e) => setExtraRefNameDraft(e.target.value)}
                />
                <input
                  className="min-w-[200px] flex-[2] rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
                  placeholder="https://… image URL"
                  value={extraRefUrlDraft}
                  onChange={(e) => setExtraRefUrlDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-lg border border-zinc-600 px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    const u = extraRefUrlDraft.trim();
                    if (!u) return;
                    const label = extraRefNameDraft.trim() || "Reference URL";
                    setExtraRefs((prev) => [
                      ...prev,
                      { id: `url-${Date.now()}`, name: label, dataUrl: u },
                    ]);
                    setExtraRefUrlDraft("");
                    setExtraRefNameDraft("");
                  }}
                >
                  Add URL
                </button>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="text-xs text-zinc-500"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  for (const f of Array.from(files)) {
                    const dataUrl = await uploadFile(f);
                    setExtraRefs((prev) => [
                      ...prev,
                      { id: `${Date.now()}-${f.name}`, name: f.name, dataUrl },
                    ]);
                  }
                  e.target.value = "";
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {extraRefs.map((r) => (
                  <div key={r.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.dataUrl}
                      alt={r.name}
                      className="h-20 w-20 rounded-lg border border-zinc-700 object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 rounded-full bg-red-900 px-1.5 text-[10px] text-white"
                      onClick={() => setExtraRefs((prev) => prev.filter((x) => x.id !== r.id))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Creative input" subtitle="Campaign thinking and copy — maps into the normalized engine payload.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Campaign / project title" className="sm:col-span-2">
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.projectTitle}
              onChange={(e) => setCreative({ ...creative, projectTitle: e.target.value })}
            />
          </Field>
          <Field label="Campaign core / big idea" className="sm:col-span-2">
            <textarea
              className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.campaignCore}
              onChange={(e) => setCreative({ ...creative, campaignCore: e.target.value })}
            />
          </Field>
          <Field label="Emotional tension">
            <textarea
              className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.emotionalTension}
              onChange={(e) => setCreative({ ...creative, emotionalTension: e.target.value })}
            />
          </Field>
          <Field label="Visual narrative">
            <textarea
              className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.visualNarrative}
              onChange={(e) => setCreative({ ...creative, visualNarrative: e.target.value })}
            />
          </Field>
          <Field label="Selected concept / route">
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.conceptName}
              onChange={(e) => setCreative({ ...creative, conceptName: e.target.value })}
            />
          </Field>
          <Field label="Concept rationale">
            <textarea
              className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.conceptRationale}
              onChange={(e) => setCreative({ ...creative, conceptRationale: e.target.value })}
            />
          </Field>
          <Field label="Headline">
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.headline}
              onChange={(e) => setCreative({ ...creative, headline: e.target.value })}
            />
          </Field>
          <Field label="CTA">
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.cta}
              onChange={(e) => setCreative({ ...creative, cta: e.target.value })}
            />
          </Field>
          <Field label="Supporting copy" className="sm:col-span-2">
            <textarea
              className="h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.supportingCopy}
              onChange={(e) => setCreative({ ...creative, supportingCopy: e.target.value })}
            />
          </Field>
          <Field label="Visual direction" className="sm:col-span-2">
            <textarea
              className="h-20 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.visualDirection}
              onChange={(e) => setCreative({ ...creative, visualDirection: e.target.value })}
            />
          </Field>
          <Field label="Composition intent">
            <textarea
              className="h-14 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.compositionIntent}
              onChange={(e) => setCreative({ ...creative, compositionIntent: e.target.value })}
            />
          </Field>
          <Field label="Mood / lighting">
            <textarea
              className="h-14 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.moodLighting}
              onChange={(e) => setCreative({ ...creative, moodLighting: e.target.value })}
            />
          </Field>
          <Field label="Negative space notes">
            <textarea
              className="h-14 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.negativeSpaceNotes}
              onChange={(e) => setCreative({ ...creative, negativeSpaceNotes: e.target.value })}
            />
          </Field>
          <Field label="Deliverable notes">
            <textarea
              className="h-14 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.deliverableNotes}
              onChange={(e) => setCreative({ ...creative, deliverableNotes: e.target.value })}
            />
          </Field>
          <Field label="Packaging notes">
            <textarea
              className="h-14 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.packagingNotes}
              onChange={(e) => setCreative({ ...creative, packagingNotes: e.target.value })}
            />
          </Field>
          <Field label="Fashion notes">
            <textarea
              className="h-14 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.fashionNotes}
              onChange={(e) => setCreative({ ...creative, fashionNotes: e.target.value })}
            />
          </Field>
          <Field label="Long-form brief paste" className="sm:col-span-2">
            <textarea
              className="h-36 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={creative.longFormBrief}
              onChange={(e) => setCreative({ ...creative, longFormBrief: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card title="Production mode">
          <div className="flex flex-wrap gap-2">
            {PRODUCTION_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  mode === m
                    ? "border-violet-500/70 bg-violet-950/50 text-violet-100"
                    : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="font-mono font-semibold">{m}</span>
              </button>
            ))}
          </div>
          {modeCfg ? (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-400">
              <p className="font-medium text-zinc-200">{modeCfg.label}</p>
              <p className="mt-2 leading-relaxed">{modeCfg.objective}</p>
              <p className="mt-3 text-xs text-zinc-500">{modeCfg.description}</p>
            </div>
          ) : null}
        </Card>

        <Card title="FAL execution (testing)" subtitle="Overrides map to flux-general / flux dev i2i / flux-lora. Router default uses production-engine logic.">
          <div className="space-y-3 text-sm">
            <Field label="Quality tier">
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={qualityTier}
                onChange={(e) => setQualityTier(e.target.value as typeof qualityTier)}
              >
                <option value="draft">draft</option>
                <option value="standard">standard</option>
                <option value="high">high</option>
                <option value="premium">premium</option>
              </select>
            </Field>
            <Field label="Generation path (lab override)">
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={executionPath}
                onChange={(e) => setExecutionPath(e.target.value as typeof executionPath)}
              >
                <option value="router">Use router (recommended)</option>
                <option value="generate">Force text-to-image (flux-general)</option>
                <option value="edit">Force edit (flux dev i2i — needs hero/secondary)</option>
                <option value="lora_gen">Force LoRA text-to-image (needs LoRA URL in model ref)</option>
                <option value="lora_edit">Force LoRA image-to-image</option>
              </select>
            </Field>
            <Field label="Batch size (per target, max 4)">
              <input
                type="number"
                min={1}
                max={4}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value) || 1)}
              />
            </Field>
            <Field label="Filter targets by type (optional)">
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={targetTypeFilter}
                onChange={(e) => setTargetTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                {GENERATION_TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Style model ref (label / id)">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={styleModelRef}
                onChange={(e) => setStyleModelRef(e.target.value)}
                placeholder="e.g. brand-style-pack-v2"
              />
            </Field>
            <Field label="LoRA / adapter URL (for flux-lora)">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={loraRef}
                onChange={(e) => setLoraRef(e.target.value)}
                placeholder="https://…/adapter.safetensors"
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={strongRefs}
                onChange={(e) => setStrongRefs(e.target.checked)}
              />
              Pass hero/secondary/tertiary as strong FAL reference URLs
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={preferEdit}
                onChange={(e) => setPreferEdit(e.target.checked)}
              />
              Prefer editing over new generation (when base rasters exist)
            </label>
          </div>
        </Card>

        <Card
          title="Test presets"
          subtitle="Saved in localStorage. Three built-in demos (Nike-style, Apple-style, Coca-Cola-style) ship with remote logo + reference URLs — add your Fal LoRA URL after training."
        >
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <button
              type="button"
              onClick={savePreset}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-600"
            >
              Save
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {presets.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-zinc-300">{p.name}</span>
                  {p.id.startsWith("demo-lab-") ? (
                    <div className="mt-1 space-y-1 text-[11px] leading-relaxed text-zinc-500">
                      {p.simulatedUpstreamSummary ? (
                        <p>
                          <span className="font-medium text-zinc-400">Simulated upstream: </span>
                          {p.simulatedUpstreamSummary}
                        </p>
                      ) : null}
                      <p>
                        {p.loraTrainingNote ?? "Paste your trained LoRA URL in FAL execution controls after loading."}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="text-xs text-violet-400 hover:underline"
                    onClick={() => loadPreset(p.id)}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline"
                    onClick={() => persistPresets(presets.filter((x) => x.id !== p.id))}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-zinc-600">
            Demos use Wikimedia Commons logo thumbnails and Unsplash category photos (not official brand shoots). Replace hero URLs with your approved CI stills when available.
          </p>
        </Card>
      </div>

      <Card
        title="Test actions"
        subtitle="1) Build plan · 2) Generate (single / all / selected) · 3) Mark outputs · 4) Compose · 5) Save QA to run"
      >
        <div className="mb-4 grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-400 sm:grid-cols-3">
          <div>
            <span className="text-zinc-500">FAL status:</span>{" "}
            <span className={falKeyOk ? "text-emerald-400" : "text-amber-400"}>
              {falKeyOk === null ? "…" : falKeyOk ? "KEY present" : "KEY missing"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Path override:</span>{" "}
            <span className="text-zinc-200">{executionPathLabel(executionPath)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Selected targets:</span>{" "}
            <span className="font-mono text-zinc-300">
              {selectedTargetIndices.length ? selectedTargetIndices.join(", ") : "none"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!!loading}
            onClick={runPipeline}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
          >
            {loading === "pipeline" ? "Running…" : "Build plan & routes"}
          </button>
          <button
            type="button"
            disabled={!!loading || !pipelineResult}
            onClick={() => void runFalSingleOnly()}
            className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-40"
            title="Uses first checked target only"
          >
            {loading === "fal" ? "…" : "Generate — single target"}
          </button>
          <button
            type="button"
            disabled={!!loading || !pipelineResult}
            onClick={() => void runFal()}
            className="rounded-xl border border-cyan-600/60 px-5 py-2.5 text-sm text-cyan-100 hover:bg-cyan-950/40 disabled:opacity-40"
            title="All checked targets"
          >
            Generate — selected targets
          </button>
          <button
            type="button"
            disabled={!!loading || !pipelineResult}
            onClick={runFalAllTargets}
            className="rounded-xl border border-cyan-700/40 px-5 py-2.5 text-sm text-cyan-200/90 hover:bg-cyan-950/30 disabled:opacity-40"
          >
            Generate — all targets
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={runCompose}
            className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-40"
          >
            {loading === "compose" ? "Composing…" : "Build composed output"}
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={runCompose}
            className="rounded-xl border border-violet-600/50 px-5 py-2.5 text-sm text-violet-200 hover:bg-violet-950/30 disabled:opacity-40"
          >
            Handoff preview (same compose)
          </button>
          <button
            type="button"
            disabled={!activeRunId}
            onClick={saveQaToRun}
            className="rounded-xl border border-zinc-600 px-5 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
          >
            Save QA to run
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          <strong>Single target:</strong> check one box above. <strong>Rerun selected:</strong> adjust checks →
          Generate — selected. <strong>Edit/refine:</strong> switch path to edit / LoRA edit and set a base hero.
        </p>
      </Card>

      {pipelineResult ? (
        <div className="space-y-8">
          <Card title="Target selection" subtitle="Choose which generation targets receive FAL calls.">
            <div className="flex flex-wrap gap-3">
              {pipelineResult.visualExecution.targets.map((t, i) => {
                const on = selectedTargetIndices.includes(i);
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                      on ? "border-violet-500/60 bg-violet-950/20" : "border-zinc-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setSelectedTargetIndices((prev) =>
                          prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b),
                        );
                      }}
                    />
                    <span>
                      <span className="font-mono text-emerald-400/90">{t.targetType}</span>{" "}
                      <span className="text-zinc-500">#{i}</span>
                      <br />
                      <span className="text-zinc-400">{t.roleInOutput.slice(0, 120)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>

          <OutputSection
            title="Production plan"
            summary="Validated mode-aware plan driving targets and composition."
          >
            <PlanSummary doc={pipelineResult.productionPlan} />
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-zinc-500">Technical JSON</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 text-[10px] text-zinc-500">
                {JSON.stringify(pipelineResult.productionPlan, null, 2)}
              </pre>
            </details>
          </OutputSection>

          <OutputSection title="Generation targets" summary={`${pipelineResult.visualExecution.targets.length} derived targets`}>
            <div className="grid gap-3 sm:grid-cols-2">
              {pipelineResult.visualExecution.targets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm"
                >
                  <p className="font-mono text-xs text-emerald-400">{t.targetType}</p>
                  <p className="mt-1 text-xs text-zinc-500">{t.id}</p>
                  <p className="mt-2 text-xs text-zinc-400">{t.roleInOutput}</p>
                </div>
              ))}
            </div>
          </OutputSection>

          <OutputSection
            title="FAL routing & execution"
            summary="What the engine would call — after Generate, see success/failure per target."
          >
            <div className="space-y-3">
              {pipelineResult.visualExecution.routedExecutions.map((r, i) => {
                const live = falResults?.find((x) => x.targetIndex === i);
                const kindLabel = pathIdToKindLabel(r.route.pathId);
                const failed = live && !live.ok;
                return (
                  <div
                    key={r.target.id}
                    className={`rounded-xl border p-4 ${
                      failed ? "border-red-800/60 bg-red-950/20" : "border-zinc-800 bg-zinc-950/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-zinc-500">
                          Target #{i} ·{" "}
                          <span className="font-mono text-emerald-400/90">{r.target.targetType}</span>
                        </p>
                        <p className="mt-1 font-mono text-sm text-amber-200/90">{r.route.pathId}</p>
                        <p className="mt-0.5 text-xs text-violet-300/90">{kindLabel}</p>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          Router kind: {r.route.kind.replace(/_/g, " ")}
                        </p>
                      </div>
                      {live ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            live.ok && live.imageUrls.length
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-red-950 text-red-200"
                          }`}
                        >
                          {live.ok && live.imageUrls.length ? "FAL OK" : "FAL failed"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-600">Not executed yet</span>
                      )}
                    </div>
                    {live?.error ? (
                      <p className="mt-2 text-xs text-red-300/90">{live.error}</p>
                    ) : null}
                    <ul className="mt-2 list-inside list-disc text-[11px] text-zinc-500">
                      {r.route.reasons.slice(0, 4).map((x, j) => (
                        <li key={j}>{x}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-zinc-500">Execution requests (JSON)</summary>
              <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 text-[10px] text-zinc-500">
                {JSON.stringify(
                  pipelineResult.visualExecution.routedExecutions.map((x) => x.request),
                  null,
                  2,
                )}
              </pre>
            </details>
          </OutputSection>

          {falResults && falResults.length > 0 ? (
            <OutputSection title="Generated outputs" summary="Mark preferred / rejected / needs refinement. Click image to set compose hero.">
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-500">Compare A</p>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-300"
                    value={compareA ?? ""}
                    onChange={(e) => setCompareA(e.target.value || null)}
                  >
                    <option value="">Pick output…</option>
                    {falResults.flatMap((r) =>
                      r.imageUrls.map((url, j) => (
                        <option key={`a-${r.targetId}-${j}`} value={url}>
                          #{r.targetIndex} {r.targetId} · {j + 1}
                        </option>
                      )),
                    )}
                  </select>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-500">Compare B</p>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-300"
                    value={compareB ?? ""}
                    onChange={(e) => setCompareB(e.target.value || null)}
                  >
                    <option value="">Pick output…</option>
                    {falResults.flatMap((r) =>
                      r.imageUrls.map((url, j) => (
                        <option key={`b-${r.targetId}-${j}`} value={url}>
                          #{r.targetIndex} {r.targetId} · {j + 1}
                        </option>
                      )),
                    )}
                  </select>
                </div>
              </div>
              {compareA && compareB ? (
                <div className="mb-8 grid grid-cols-2 gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={compareA} alt="" className="w-full rounded-xl border border-zinc-700 object-contain" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={compareB} alt="" className="w-full rounded-xl border border-zinc-700 object-contain" />
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {falResults.flatMap((r) =>
                  r.imageUrls.map((url, j) => {
                    const mk = getOutputMark(outputMarks, r.targetIndex, r.targetId, j);
                    return (
                      <div
                        key={`${r.targetId}-${j}`}
                        className={`overflow-hidden rounded-xl border ${
                          selectedVisualUrl === url
                            ? "border-violet-500 ring-2 ring-violet-500/40"
                            : mk === "preferred"
                              ? "border-emerald-600/60"
                              : mk === "rejected"
                                ? "border-red-800/50 opacity-70"
                                : "border-zinc-800"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedVisualUrl(url)}
                          className="block w-full text-left"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="aspect-square w-full object-cover" />
                        </button>
                        <div className="space-y-2 p-2">
                          <p className="font-mono text-[10px] text-zinc-500">
                            #{r.targetIndex} {r.targetId}
                          </p>
                          <p className="text-[10px] text-zinc-600">{pathIdToKindLabel(r.pathId)}</p>
                          <div className="flex flex-wrap gap-1">
                            {(["preferred", "rejected", "refine", "none"] as const).map((m) => {
                              const active = m === "none" ? mk === "none" : mk === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() =>
                                    setMarkForOutput(
                                      r.targetIndex,
                                      r.targetId,
                                      j,
                                      m === "none" ? "none" : m,
                                    )
                                  }
                                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                    active
                                      ? "bg-zinc-600 text-white"
                                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                                  }`}
                                >
                                  {m === "none" ? "clear" : m}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }),
                )}
              </div>
            </OutputSection>
          ) : null}

          {selectedVisualUrl ? (
            <OutputSection title="Selected / preferred visual" summary="Used as hero when you run composed output.">
              <div className="flex flex-wrap items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedVisualUrl}
                  alt="Selected"
                  className="max-h-64 rounded-xl border border-zinc-700"
                />
                <button
                  type="button"
                  className="text-xs text-zinc-500 underline"
                  onClick={() => setSelectedVisualUrl(null)}
                >
                  Clear selection
                </button>
              </div>
            </OutputSection>
          ) : null}

          {composeData?.preview ? (
            <OutputSection title="Composed output" summary="Sharp deterministic compose + platform type.">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${(composeData.preview as { mimeType: string }).mimeType};base64,${(composeData.preview as { dataBase64: string }).dataBase64}`}
                alt="Composed"
                className="max-h-[480px] rounded-xl border border-zinc-700 shadow-lg"
              />
            </OutputSection>
          ) : null}

          <OutputSection
            title="Engine review"
            summary={pipelineResult.review.summary}
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  pipelineResult.review.verdict === "PASS"
                    ? "bg-emerald-950 text-emerald-300"
                    : pipelineResult.review.verdict === "WARN"
                      ? "bg-amber-950 text-amber-200"
                      : "bg-red-950 text-red-200"
                }`}
              >
                {pipelineResult.review.verdict}
              </span>
            </div>
            {pipelineResult.review.modeReviewSummary ? (
              <ul className="mb-4 list-inside list-disc text-sm text-zinc-400">
                {pipelineResult.review.modeReviewSummary.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            ) : null}
            <details>
              <summary className="cursor-pointer text-xs text-zinc-500">Checklist JSON</summary>
              <pre className="mt-2 max-h-48 overflow-auto text-[10px] text-zinc-500">
                {JSON.stringify(pipelineResult.review.checklist, null, 2)}
              </pre>
            </details>
          </OutputSection>

          {composeData?.handoffPackage ? (
            <OutputSection title="Handoff / export preview" summary="Structured bundle metadata from the engine.">
              <div className="grid gap-4 sm:grid-cols-2 text-sm text-zinc-400">
                <div>
                  <p className="text-xs text-zinc-500">Export preset</p>
                  <p className="font-mono text-zinc-300">
                    {(composeData.handoffPackage as { exportProfile?: { presetId?: string } }).exportProfile
                      ?.presetId ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Bundle</p>
                  <p className="font-mono text-zinc-300">
                    {(composeData.handoffPackage as { bundleName?: string }).bundleName}
                  </p>
                </div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-zinc-500">Package items & metadata</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 text-[10px] text-zinc-500">
                  {JSON.stringify(composeData.handoffPackage, null, 2)}
                </pre>
              </details>
            </OutputSection>
          ) : null}
        </div>
      ) : null}

      <Card
        title="Manual quality review"
        subtitle="Auto-saves to the active run (debounced). Use Save QA to run for an immediate write. Export run JSON includes this block."
      >
        <Field label="Overall verdict">
          <select
            className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            value={manualVerdict}
            onChange={(e) => setManualVerdict(e.target.value as LabManualVerdict)}
          >
            <option value="">—</option>
            <option value="strong">Strong</option>
            <option value="usable">Usable</option>
            <option value="weak">Weak</option>
            <option value="failed">Failed</option>
          </select>
        </Field>
        <Stars
          label="Brand alignment"
          value={reviewScores.brandAlignment}
          onChange={(n) => setReviewScores({ ...reviewScores, brandAlignment: n })}
        />
        <Stars
          label="Realism"
          value={reviewScores.realism}
          onChange={(n) => setReviewScores({ ...reviewScores, realism: n })}
        />
        <Stars
          label="Quality"
          value={reviewScores.quality}
          onChange={(n) => setReviewScores({ ...reviewScores, quality: n })}
        />
        <Stars
          label="Composition"
          value={reviewScores.composition}
          onChange={(n) => setReviewScores({ ...reviewScores, composition: n })}
        />
        <Stars
          label="Typography / layout"
          value={reviewScores.typographyLayout}
          onChange={(n) => setReviewScores({ ...reviewScores, typographyLayout: n })}
        />
        <Stars
          label="Overall usefulness"
          value={reviewScores.usefulness}
          onChange={(n) => setReviewScores({ ...reviewScores, usefulness: n })}
        />
        <Field label="What feels wrong / what should improve?">
          <textarea
            className="mt-2 h-28 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
        </Field>
      </Card>
    </div>
  );
}

function AssetRow({
  label,
  dataUrl,
  onFile,
  onClear,
  urlDraft,
  onUrlDraftChange,
  onApplyUrl,
}: {
  label: string;
  dataUrl?: string;
  onFile: (f: File) => void;
  onClear: () => void;
  urlDraft: string;
  onUrlDraftChange: (v: string) => void;
  onApplyUrl: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-3">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[120px] flex-1">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">Upload</p>
          <input
            type="file"
            accept="image/*"
            className="text-xs text-zinc-500"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="min-w-[180px] flex-[2]">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">Or image URL</p>
          <div className="flex gap-1">
            <input
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
              placeholder="https://…"
              value={urlDraft}
              onChange={(e) => onUrlDraftChange(e.target.value)}
            />
            <button
              type="button"
              className="shrink-0 rounded-lg border border-zinc-600 px-2 py-1.5 text-[11px] text-zinc-200 hover:bg-zinc-800"
              onClick={onApplyUrl}
            >
              Set
            </button>
          </div>
        </div>
        {dataUrl ? (
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="" className="h-24 w-24 rounded-lg border border-zinc-700 object-cover" />
            <button
              type="button"
              className="absolute -right-1 -top-1 rounded-full bg-zinc-800 px-1.5 text-[10px] text-zinc-300"
              onClick={onClear}
            >
              ×
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OutputSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/30 to-zinc-950/50 p-6">
      <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500">{summary}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PlanSummary({ doc }: { doc: ProductionEngineRunResult["productionPlan"] }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs text-zinc-500">Headline</dt>
        <dd className="text-zinc-200">{doc.selectedHeadline}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500">CTA</dt>
        <dd className="text-zinc-200">{doc.selectedCta}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-zinc-500">Hero intent</dt>
        <dd className="text-zinc-400">{doc.heroAssetIntent.slice(0, 280)}…</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-zinc-500">Composition intent</dt>
        <dd className="text-zinc-400">{doc.compositionIntent.slice(0, 280)}…</dd>
      </div>
    </dl>
  );
}
