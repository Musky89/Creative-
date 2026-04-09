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

const PRESET_KEY = "creative-testing-lab-presets-v1";

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

type Preset = { id: string; name: string; brand: LabBrandForm; creative: LabCreativeForm; mode: ProductionMode };

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
  const [executionPath, setExecutionPath] = useState<
    "router" | "generate" | "edit" | "lora_gen" | "lora_edit"
  >("router");
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
    { targetId: string; pathId: string; ok: boolean; imageUrls: string[]; error?: string }[] | null
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
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    fetch("/api/creative-testing-lab/status")
      .then((r) => r.json())
      .then((d: { falKeyConfigured?: boolean }) => setFalKeyOk(!!d.falKeyConfigured))
      .catch(() => setFalKeyOk(false));
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (raw) setPresets(JSON.parse(raw) as Preset[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persistPresets = useCallback((next: Preset[]) => {
    setPresets(next);
    localStorage.setItem(PRESET_KEY, JSON.stringify(next));
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
    try {
      const res = await fetch("/api/creative-testing-lab/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: productionInput, visualBundleOptions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setPipelineResult(data as ProductionEngineRunResult);
      const n = (data as ProductionEngineRunResult).visualExecution.targets.length;
      setSelectedTargetIndices(n ? [0] : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function runFal() {
    setLoading("fal");
    setError(null);
    const indices =
      selectedTargetIndices.length > 0
        ? selectedTargetIndices
        : filteredTargetIndices.slice(0, 3);
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
      setFalResults(data.results as typeof falResults);
      const firstUrl = (data.results as { imageUrls?: string[] }[]).find(
        (r) => r.imageUrls?.length,
      )?.imageUrls?.[0];
      if (firstUrl) setSelectedVisualUrl(firstUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  function savePreset() {
    const name = presetName.trim() || "Untitled preset";
    const p: Preset = {
      id: `p-${Date.now()}`,
      name,
      brand: { ...brand },
      creative: { ...creative },
      mode,
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
  }

  const modeCfg = listProductionModes().find((m) => m.id === mode);

  return (
    <div className="space-y-10">
      {falKeyOk === false ? (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          <strong className="font-semibold">FAL_KEY not set.</strong> Routing and planning work; live
          generation requires <code className="rounded bg-black/30 px-1">FAL_KEY</code> in the environment.
        </div>
      ) : falKeyOk === true ? (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-2 text-xs text-emerald-200/90">
          FAL credentials detected — you can run live test generation.
        </div>
      ) : null}

      {error ? (
        <pre className="max-h-40 overflow-auto rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-xs text-red-100">
          {error}
        </pre>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card
          title="Brand context"
          subtitle="Who this is for — CI, tone, and guardrails feed the production plan and FAL prompts."
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
          subtitle="Stored as data URLs in-session for lab use — no cloud storage."
        >
          <div className="space-y-4">
            <AssetRow
              label="Logo"
              dataUrl={logoDataUrl}
              onFile={async (f) => setLogoDataUrl(await uploadFile(f))}
              onClear={() => setLogoDataUrl(undefined)}
            />
            <AssetRow
              label="Hero / primary visual (compose + optional edit)"
              dataUrl={heroDataUrl}
              onFile={async (f) => setHeroDataUrl(await uploadFile(f))}
              onClear={() => setHeroDataUrl(undefined)}
            />
            <AssetRow
              label="Secondary visual"
              dataUrl={secondaryDataUrl}
              onFile={async (f) => setSecondaryDataUrl(await uploadFile(f))}
              onClear={() => setSecondaryDataUrl(undefined)}
            />
            <AssetRow
              label="Tertiary (identity route C / detail)"
              dataUrl={tertiaryDataUrl}
              onFile={async (f) => setTertiaryDataUrl(await uploadFile(f))}
              onClear={() => setTertiaryDataUrl(undefined)}
            />
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">
                Reference boards, packshots, inspiration (multiple)
              </p>
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

        <Card title="Test presets" subtitle="Saved in localStorage for this browser.">
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
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                <span className="text-sm text-zinc-300">{p.name}</span>
                <div className="flex gap-2">
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
            Tip: save &quot;McDonald&apos;s OOH&quot;, &quot;Fashion editorial&quot;, etc. after filling brand + creative once.
          </p>
        </Card>
      </div>

      <Card title="Test actions" subtitle="Run in sequence: plan → generate → pick visual → compose → handoff.">
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
            disabled={!!loading}
            onClick={runFal}
            className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-40"
            title={!falKeyOk ? "FAL_KEY missing — call will fail until configured" : undefined}
          >
            {loading === "fal" ? "Generating…" : "Generate test (FAL)"}
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={runFal}
            className="rounded-xl border border-cyan-700/50 px-5 py-2.5 text-sm text-cyan-200 hover:bg-cyan-950/30 disabled:opacity-40"
          >
            Generate batch (same as generate with selected indices)
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
            Export handoff preview
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Edit/refine: switch path to <strong>edit</strong> or <strong>LoRA edit</strong>, ensure a base image is set, then run Generate again.
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

          <OutputSection title="FAL routing" summary="Resolved path per target from production-engine router.">
            <div className="space-y-3">
              {pipelineResult.visualExecution.routedExecutions.map((r) => (
                <div key={r.target.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <p className="font-mono text-sm text-amber-200/90">{r.route.pathId}</p>
                  <p className="text-xs text-zinc-500">
                    {r.route.kind} · {r.target.id}
                  </p>
                  <ul className="mt-2 list-inside list-disc text-xs text-zinc-500">
                    {r.route.reasons.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              ))}
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
            <OutputSection title="Raw generated visuals" summary="From live FAL when configured.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {falResults.flatMap((r) =>
                  r.imageUrls.map((url, j) => (
                    <button
                      key={`${r.targetId}-${j}`}
                      type="button"
                      onClick={() => setSelectedVisualUrl(url)}
                      className={`overflow-hidden rounded-xl border text-left transition ${
                        selectedVisualUrl === url
                          ? "border-violet-500 ring-2 ring-violet-500/40"
                          : "border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="aspect-square w-full object-cover" />
                      <p className="p-2 font-mono text-[10px] text-zinc-500">{r.targetId}</p>
                    </button>
                  )),
                )}
              </div>
              {falResults.some((r) => r.error) ? (
                <ul className="mt-4 text-xs text-amber-200/90">
                  {falResults
                    .filter((r) => r.error)
                    .map((r) => (
                      <li key={r.targetId}>
                        {r.targetId}: {r.error}
                      </li>
                    ))}
                </ul>
              ) : null}
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

      <Card title="Manual quality review" subtitle="Founder scores — stored in this session only (React state).">
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
}: {
  label: string;
  dataUrl?: string;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="min-w-[140px] flex-1">
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <input
          type="file"
          accept="image/*"
          className="mt-1 text-xs text-zinc-500"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {dataUrl ? (
        <div className="relative">
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
