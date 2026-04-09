"use client";

import { useCallback, useMemo, useState } from "react";
import {
  PACKAGING_VARIANT_KEYS,
  listProductionModes,
  productionEngineInputSchema,
  runProductionEngineStub,
  splitProductionPlanForDisplay,
  type ProductionEngineInput,
  type ProductionEngineRunResult,
} from "@/lib/production-engine";
import type { ProductionMode } from "@/lib/production-engine/modes";
import { IDENTITY_ROUTE_KEYS } from "@/lib/production-engine/mode-identity-fashion-export";

const DEFAULT_INPUT: ProductionEngineInput = {
  mode: "SOCIAL",
  briefSummary:
    "Spring campaign for a premium home textiles line — light, drape, designer trade.",
  campaignCore: {
    singleLineIdea: "The right cloth teaches a room how to hold light.",
    emotionalTension: "Restraint vs desire for tactile warmth",
    visualNarrative: "North light, folded yardage, chalk and oat palette",
  },
  selectedConcept: {
    conceptId: "concept-a",
    conceptName: "Light & Drape",
    hook: "Specify drapery that performs in real windows.",
    rationale: "Designers buy on hand, drape, and fiber truth.",
    visualDirection: "Natural light, shallow depth, tactile macro of weave",
  },
  selectedHeadline: "Let the room learn the light.",
  selectedCta: "Request the designer swatch set",
  supportingCopy:
    "Limited-run yardage and made-to-order drapery for design-led homes.",
  visualDirection:
    "Restrained palette, serif titles, humanist sans for specs; no retail-shouty graphics.",
  visualSpecNotes: "Hero 4:5 safe for thumb zone; logo bottom third.",
  referenceSummaries: [
    "Editorial shelter-mag still life, oat and graphite",
    "Macro linen slub, honest texture",
  ],
  brandRulesSummary:
    "Banned: best-in-class, luxury experience. Preferred: hand and drape, fiber-forward.",
  brandOperatingSystemSummary: "Voice: warm precision. Primary emotion: CALM.",
  brandAssets: {
    logoDescription: "Wordmark + small mark (stub)",
    colors: [
      { name: "Chalk", hex: "#F4F1EA", role: "background" },
      { name: "Graphite", hex: "#2C2C2C", role: "type" },
    ],
  },
  visualStyleRef: "brand-visual-style-v1 (stub)",
  modelRef: "flux-general (stub)",
};

type StudioTab =
  | "setup"
  | "plan"
  | "visual"
  | "compose"
  | "review"
  | "handoff"
  | "output";

const FLOW: { id: StudioTab; label: string; hint: string }[] = [
  { id: "setup", label: "Setup", hint: "Mode & creative inputs" },
  { id: "plan", label: "Plan", hint: "Production plan" },
  { id: "visual", label: "Visual", hint: "Targets & FAL" },
  { id: "compose", label: "Compose", hint: "Layout & layers" },
  { id: "review", label: "Review", hint: "QA checklist" },
  { id: "handoff", label: "Handoff", hint: "Export bundle" },
  { id: "output", label: "Output", hint: "Rendered preview" },
];

type ComposePreviewPayload = {
  compositionPlanDocument: unknown;
  layerManifest: unknown;
  handoffLayerManifest?: unknown;
  handoffPackage?: {
    bundleName: string;
    items: { path: string; description: string; kind: string }[];
    readme: string;
    exportProfile: {
      presetId: string;
      label: string;
      canvasPx: { width: number; height: number };
      exportDimensionsPx: { width: number; height: number };
      logicalDpiScreen: number;
      printDpiRecommended?: number;
      colorSpace: string;
      primaryFormats: string[];
      allowUpscaleMaster: boolean;
      mediaSpecHint: string;
      deliveryNotes: string[];
    };
    copyMetadata: unknown;
    brandMetadata: unknown;
    sourceVisuals: unknown[];
    productionNotes: string[];
  };
  assemblyExplanation: string[];
  review?: {
    verdict: string;
    checklist: unknown[];
    summary: string;
    modeReviewSummary?: string[];
  };
  socialSlot?: {
    index: number;
    family: string;
    headline: string;
    cta: string;
    visualVariationHint: string;
  };
  packagingVariantSpec?: {
    key: string;
    label: string;
    bandColorHex: string;
    ribbonText: string;
  };
  fashionSlot?: {
    index: number;
    family: string;
    headline: string;
    cta: string;
    shotNotes: string;
  };
  exportDeckSections?: { id: string; title: string; body: string }[];
  exportDeckSection?: { index: number; id: string; title: string; body: string };
  identityRouteLayout?: unknown;
  fashionLayout?: unknown;
  exportLayout?: unknown;
  preview?: { mimeType: string; width: number; height: number; dataBase64: string };
  error?: string;
  message?: string;
};

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-zinc-800/80 bg-zinc-900/50 shadow-sm ${className}`}
    >
      <header className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
        ) : null}
      </header>
      <div className="p-4 text-sm text-zinc-300">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-inside list-disc space-y-1.5 text-xs leading-relaxed text-zinc-400">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

function JsonBlock({
  value,
  className = "",
  maxHeight = "max-h-72",
  size = "text-xs",
}: {
  value: unknown;
  className?: string;
  maxHeight?: string;
  size?: string;
}) {
  return (
    <pre
      className={`overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 font-mono ${size} text-zinc-400 ${maxHeight} ${className}`}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function VerdictPill({ verdict }: { verdict: string }) {
  const v = verdict.toUpperCase();
  const cls =
    v === "PASS"
      ? "bg-emerald-950/80 text-emerald-300 ring-emerald-800/60"
      : v === "WARN"
        ? "bg-amber-950/80 text-amber-200 ring-amber-800/60"
        : "bg-red-950/80 text-red-200 ring-red-800/60";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}
    >
      {verdict}
    </span>
  );
}

export function ProductionStudioShell() {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(DEFAULT_INPUT, null, 2),
  );
  const [tab, setTab] = useState<StudioTab>("setup");
  const [apiResult, setApiResult] = useState<ProductionEngineRunResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [composePreview, setComposePreview] = useState<ComposePreviewPayload | null>(
    null,
  );
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const parsedInput = useMemo(() => {
    try {
      const raw = JSON.parse(jsonText) as unknown;
      return productionEngineInputSchema.safeParse(raw);
    } catch {
      return { success: false as const, error: "parse" as const };
    }
  }, [jsonText]);

  const localRun = useMemo(() => {
    if (!parsedInput.success) return null;
    return runProductionEngineStub(parsedInput.data);
  }, [parsedInput]);

  const active = apiResult ?? localRun;
  const modeCfg = active
    ? listProductionModes().find((x) => x.id === active.input.mode)
    : parsedInput.success
      ? listProductionModes().find((x) => x.id === parsedInput.data.mode)
      : null;
  const planSplit = active ? splitProductionPlanForDisplay(active.productionPlan) : null;

  const setModeInJson = useCallback((mode: ProductionMode) => {
    try {
      const raw = JSON.parse(jsonText) as Record<string, unknown>;
      raw.mode = mode;
      setJsonText(JSON.stringify(raw, null, 2));
    } catch {
      const next = { ...DEFAULT_INPUT, mode };
      setJsonText(JSON.stringify(next, null, 2));
    }
  }, [jsonText]);

  async function runFullPreview() {
    setLoading(true);
    setApiError(null);
    setApiResult(null);
    try {
      const body = JSON.parse(jsonText);
      const res = await fetch("/api/production-engine/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(JSON.stringify(data, null, 2));
        return;
      }
      setApiResult(data as ProductionEngineRunResult);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runComposePreview() {
    setComposeLoading(true);
    setComposeError(null);
    setComposePreview(null);
    try {
      const body = JSON.parse(jsonText);
      const res = await fetch("/api/production-engine/compose-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ComposePreviewPayload & {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setComposeError(JSON.stringify(data, null, 2));
        setComposePreview(data);
        return;
      }
      setComposePreview(data);
      setTab("output");
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : String(e));
    } finally {
      setComposeLoading(false);
    }
  }

  const inputInvalid = !parsedInput.success;
  const parseErr =
    !parsedInput.success && "error" in parsedInput && parsedInput.error === "parse"
      ? "Invalid JSON"
      : !parsedInput.success
        ? "Input does not match schema"
        : null;
  const zodIssues =
    !parsedInput.success && "error" in parsedInput && parsedInput.error !== "parse"
      ? parsedInput.error.flatten()
      : null;

  return (
    <div className="space-y-6">
      {/* Flow */}
      <nav
        aria-label="Production flow"
        className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3"
      >
        <p className="mb-3 px-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Pipeline
        </p>
        <ol className="flex flex-wrap gap-1.5">
          {FLOW.map((step, i) => {
            const isActive = tab === step.id;
            return (
              <li key={step.id} className="flex min-w-0 flex-1 items-center sm:flex-initial">
                {i > 0 ? (
                  <span className="mx-1 hidden text-zinc-700 sm:inline" aria-hidden>
                    →
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setTab(step.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left transition sm:min-w-[5.5rem] ${
                    isActive
                      ? "bg-violet-600/25 ring-1 ring-violet-500/50"
                      : "bg-zinc-900/60 hover:bg-zinc-800/80"
                  }`}
                >
                  <span className="block text-xs font-semibold text-zinc-200">
                    {step.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
                    {step.hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_1fr]">
        {/* Shared input column */}
        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Panel
            title="Production mode"
            subtitle="Switch mode — updates JSON. Refine fields in the editor below."
          >
            <div className="flex flex-wrap gap-2">
              {listProductionModes().map((m) => {
                const current =
                  parsedInput.success && parsedInput.data.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModeInJson(m.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                      current
                        ? "border-violet-500/60 bg-violet-950/40 text-violet-100"
                        : "border-zinc-700 bg-zinc-950/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    <span className="font-mono font-semibold">{m.id}</span>
                    <span className="ml-1.5 text-zinc-500">{m.label}</span>
                  </button>
                );
              })}
            </div>
            {modeCfg ? (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-black/20 p-3">
                <p className="text-xs font-medium text-zinc-400">Active mode</p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">
                  {modeCfg.label}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {modeCfg.description}
                </p>
                <p className="mt-2 text-[11px] text-zinc-600">
                  Aspects: {modeCfg.typicalAspectRatios.join(" · ")}
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel title="Normalized inputs" subtitle="Structured creative payload (JSON)">
            <textarea
              className="mb-3 h-[min(420px,45vh)] w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-200"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              aria-label="Production engine input JSON"
            />
            {inputInvalid ? (
              <div className="mb-3 space-y-2">
                <p className="text-xs text-amber-400/90">{parseErr}</p>
                {zodIssues ? (
                  <pre className="max-h-28 overflow-auto rounded border border-amber-900/30 bg-amber-950/10 p-2 text-[10px] text-amber-100/90">
                    {JSON.stringify(zodIssues, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void runFullPreview();
                  setTab("plan");
                }}
                disabled={loading || inputInvalid}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
              >
                {loading ? "Syncing…" : "Run pipeline (server)"}
              </button>
              <button
                type="button"
                onClick={() => void runComposePreview()}
                disabled={composeLoading || inputInvalid}
                className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-40"
              >
                {composeLoading ? "Rendering…" : "Render preview (Sharp)"}
              </button>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
              Optional: <code className="text-zinc-500">heroImageUrl</code>,{" "}
              <code className="text-zinc-500">visualQualityTier</code>, SOCIAL batch, PACKAGING
              variant, RETAIL variant, IDENTITY{" "}
              <code className="text-zinc-500">tertiaryImageUrl</code> /{" "}
              <code className="text-zinc-500">identityRouteHighlight</code> (
              {IDENTITY_ROUTE_KEYS.join("|")}), FASHION presets,{" "}
              <code className="text-zinc-500">exportSlideIndex</code>. Keys:{" "}
              {PACKAGING_VARIANT_KEYS.slice(0, 4).join(", ")}…
            </p>
            {apiError ? (
              <pre className="mt-3 max-h-32 overflow-auto rounded border border-red-900/40 bg-red-950/20 p-2 text-[10px] text-red-200">
                {apiError}
              </pre>
            ) : null}
            {composeError ? (
              <pre className="mt-3 max-h-32 overflow-auto rounded border border-amber-900/40 bg-amber-950/20 p-2 text-[10px] text-amber-100">
                {composeError}
              </pre>
            ) : null}
          </Panel>
        </div>

        {/* Main studio surface */}
        <div className="min-w-0 space-y-4">
          {tab === "setup" && (
            <>
              <Panel
                title="Mode playbook"
                subtitle="What this deliverable type expects — objectives, layout, and export posture."
              >
                {modeCfg ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <p className="font-semibold text-zinc-300">Objective</p>
                      <p className="mt-1 text-zinc-500">{modeCfg.objective}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="font-semibold text-zinc-300">Success criteria</p>
                        <Bullets items={modeCfg.successCriteria} />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-300">Composition priorities</p>
                        <Bullets items={modeCfg.compositionPriorities} />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="font-semibold text-zinc-300">Text tolerance</p>
                        <p className="text-zinc-500">{modeCfg.textTolerance}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-300">Image expectations</p>
                        <Bullets items={modeCfg.imageExpectations} />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-300">Layout expectations</p>
                      <Bullets items={modeCfg.layoutExpectations} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="font-semibold text-zinc-300">Review focus</p>
                        <Bullets items={modeCfg.reviewFocus} />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-300">Export expectations</p>
                        <Bullets items={modeCfg.exportExpectations} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Fix JSON to load mode playbook.</p>
                )}
              </Panel>
            </>
          )}

          {tab === "plan" && (
            <>
              {!active ? (
                <Panel title="Production plan" subtitle="Run pipeline or fix inputs">
                  <p className="text-xs text-zinc-500">
                    Valid inputs required. Pipeline runs locally as you type; use{" "}
                    <strong className="text-zinc-400">Run pipeline (server)</strong> to sync
                    with the preview API.
                  </p>
                </Panel>
              ) : (
                <>
                  <Panel
                    title="Production plan"
                    subtitle="Deterministic plan from inputs + mode — shared fields and mode extensions."
                  >
                    {planSplit ? (
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-xs font-medium text-zinc-500">Shared</p>
                          <JsonBlock value={planSplit.common} />
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-medium text-amber-200/80">
                            Mode-specific
                          </p>
                          <JsonBlock value={planSplit.modeSpecific} />
                        </div>
                      </div>
                    ) : null}
                  </Panel>
                  <Panel title="Operational checklist" subtitle="Execution steps derived from the plan">
                    <JsonBlock value={active.operationalPlan} maxHeight="max-h-56" />
                  </Panel>
                </>
              )}
            </>
          )}

          {tab === "visual" && (
            <>
              {!active ? (
                <Panel title="Visual execution" subtitle="FAL-first layer">
                  <p className="text-xs text-zinc-500">Valid inputs required.</p>
                </Panel>
              ) : (
                <>
                  <Panel
                    title="Generation targets"
                    subtitle={`Quality tier: ${active.visualExecution.qualityTier} · set visualQualityTier in JSON`}
                  >
                    <ul className="space-y-2">
                      {active.visualExecution.targets.map((t) => (
                        <li
                          key={t.id}
                          className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3"
                        >
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-mono text-xs font-semibold text-emerald-400/90">
                              {t.targetType}
                            </span>
                            <span className="text-[11px] text-zinc-600">{t.id}</span>
                          </div>
                          <p className="mt-1.5 text-xs text-zinc-400">{t.roleInOutput}</p>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            Batch {t.desiredBatchSize} · {t.realismBias}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                  <Panel title="FAL routing" subtitle="Resolved path per target and rationale">
                    <div className="mb-4 rounded-lg border border-zinc-800 bg-black/20 p-3">
                      <p className="text-[11px] font-medium text-zinc-500">Summary</p>
                      <JsonBlock value={active.falRouting} maxHeight="max-h-32" size="text-[11px]" />
                    </div>
                    <div className="space-y-3">
                      {active.visualExecution.routedExecutions.map((r) => (
                        <div
                          key={r.target.id}
                          className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3"
                        >
                          <p className="font-mono text-sm text-amber-200/90">
                            {r.route.pathId}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            {r.route.kind} · {r.target.id}
                          </p>
                          <Bullets items={r.route.reasons} />
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <details className="rounded-xl border border-zinc-800/80 bg-zinc-900/30">
                    <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-zinc-400">
                      Execution contracts (requests / stub responses)
                    </summary>
                    <div className="space-y-3 border-t border-zinc-800/80 p-4">
                      {active.visualExecution.routedExecutions.map((r) => (
                        <div
                          key={r.request.requestId}
                          className="grid gap-2 sm:grid-cols-2"
                        >
                          <div>
                            <p className="mb-1 text-[10px] font-medium uppercase text-zinc-600">
                              Request
                            </p>
                            <JsonBlock value={r.request} maxHeight="max-h-40" size="text-[10px]" />
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-medium uppercase text-zinc-600">
                              Response
                            </p>
                            <JsonBlock value={r.response} maxHeight="max-h-40" size="text-[10px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                  <Panel title="Jobs" subtitle="Planned work aligned with routes">
                    <JsonBlock value={active.jobs} maxHeight="max-h-48" size="text-[11px]" />
                  </Panel>
                </>
              )}
            </>
          )}

          {tab === "compose" && (
            <>
              {!active ? (
                <Panel title="Composition" subtitle="Layout & layers">
                  <p className="text-xs text-zinc-500">Valid inputs required.</p>
                </Panel>
              ) : (
                <>
                  <Panel
                    title="Composition plan"
                    subtitle="Platform-owned layout — archetype, canvas, rects, finishing"
                  >
                    <p className="mb-3 font-mono text-sm text-violet-300">
                      {active.compositionPlanDocument.layoutArchetype}{" "}
                      <span className="text-zinc-500">
                        · {active.compositionPlanDocument.canvasWidth}×
                        {active.compositionPlanDocument.canvasHeight}px
                      </span>
                    </p>
                    <JsonBlock value={active.compositionPlanDocument} />
                  </Panel>
                  <Panel
                    title="Layer stack"
                    subtitle="Order for compose — structured handoff manifest adds sources & type payloads"
                  >
                    <JsonBlock value={active.layerManifest} />
                  </Panel>
                  <Panel title="Assembly narrative" subtitle="How rasters, type, and logo combine">
                    <Bullets items={active.assemblyExplanation} />
                  </Panel>
                  <Panel title="Artifact registry" subtitle="Stubs + future binary refs">
                    <JsonBlock value={active.composed} maxHeight="max-h-40" />
                  </Panel>

                  {active.packagingVariantSpec ? (
                    <Panel title="Packaging — variant" subtitle="SKU band system">
                      <JsonBlock value={active.packagingVariantSpec} maxHeight="max-h-48" />
                    </Panel>
                  ) : null}
                  {active.compositionPlanDocument.packagingLayout ? (
                    <Panel title="Packaging — FOP rects">
                      <JsonBlock value={active.compositionPlanDocument.packagingLayout} />
                    </Panel>
                  ) : null}
                  {active.compositionPlanDocument.retailLayout ? (
                    <Panel title="Retail / POS — promo rects">
                      <JsonBlock value={active.compositionPlanDocument.retailLayout} />
                    </Panel>
                  ) : null}
                  {active.socialVariants && active.socialVariants.length > 0 ? (
                    <Panel title="Social — batch variants" subtitle="Slot index in JSON">
                      <div className="max-h-56 overflow-auto text-xs">
                        <table className="w-full border-collapse text-left text-zinc-400">
                          <thead>
                            <tr className="border-b border-zinc-800 text-zinc-500">
                              <th className="py-2 pr-2">#</th>
                              <th className="py-2 pr-2">Family</th>
                              <th className="py-2 pr-2">Headline</th>
                              <th className="py-2">CTA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {active.socialVariants.map((v, i) => (
                              <tr key={i} className="border-b border-zinc-800/60">
                                <td className="py-2 pr-2 font-mono text-zinc-600">{i}</td>
                                <td className="py-2 pr-2 text-emerald-400/90">{v.family}</td>
                                <td className="py-2 pr-2">{v.headline.slice(0, 48)}</td>
                                <td className="py-2">{v.cta.slice(0, 36)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                  ) : null}
                  {active.fashionVariants && active.fashionVariants.length > 0 ? (
                    <Panel title="Fashion — batch variants">
                      <div className="max-h-56 overflow-auto text-xs">
                        <table className="w-full border-collapse text-left text-zinc-400">
                          <thead>
                            <tr className="border-b border-zinc-800 text-zinc-500">
                              <th className="py-2 pr-2">#</th>
                              <th className="py-2 pr-2">Family</th>
                              <th className="py-2 pr-2">Headline</th>
                              <th className="py-2">CTA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {active.fashionVariants.map((v, i) => (
                              <tr key={i} className="border-b border-zinc-800/60">
                                <td className="py-2 pr-2 font-mono text-zinc-600">{i}</td>
                                <td className="py-2 pr-2 text-violet-400/90">{v.family}</td>
                                <td className="py-2 pr-2">{v.headline.slice(0, 48)}</td>
                                <td className="py-2">{v.cta.slice(0, 36)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                  ) : null}
                  {active.exportDeckSections && active.exportDeckSections.length > 0 ? (
                    <Panel title="Presentation — deck sections">
                      <ul className="space-y-1 text-xs text-zinc-400">
                        {active.exportDeckSections.map((s, i) => (
                          <li key={s.id}>
                            <span className="font-mono text-zinc-600">{i}</span> — {s.title}
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  ) : null}
                  {active.compositionPlanDocument.identityLayout ? (
                    <Panel title="Identity — route layout">
                      <JsonBlock value={active.compositionPlanDocument.identityLayout} />
                    </Panel>
                  ) : null}
                  {active.compositionPlanDocument.fashionLayout ? (
                    <Panel title="Fashion — layout rects">
                      <JsonBlock value={active.compositionPlanDocument.fashionLayout} />
                    </Panel>
                  ) : null}
                  {active.compositionPlanDocument.exportLayout ? (
                    <Panel title="Presentation — slide rects">
                      <JsonBlock value={active.compositionPlanDocument.exportLayout} />
                    </Panel>
                  ) : null}
                </>
              )}
            </>
          )}

          {tab === "review" && (
            <>
              {!active ? (
                <Panel title="Review" subtitle="Evaluation">
                  <p className="text-xs text-zinc-500">Valid inputs required.</p>
                </Panel>
              ) : (
                <>
                  <Panel title="Verdict" subtitle="Deterministic checklist + mode narrative">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <VerdictPill verdict={active.review.verdict} />
                      <p className="text-sm text-zinc-400">{active.review.summary}</p>
                    </div>
                    {active.review.modeReviewSummary ? (
                      <div className="mb-4 rounded-lg border border-zinc-800 bg-amber-950/10 p-3">
                        <p className="mb-2 text-xs font-semibold text-amber-200/90">
                          Mode review
                        </p>
                        <Bullets items={active.review.modeReviewSummary} />
                      </div>
                    ) : null}
                    <p className="mb-2 text-xs font-medium text-zinc-500">Checklist</p>
                    <ul className="space-y-2 text-xs">
                      {active.review.checklist.map((c) => (
                        <li
                          key={c.id}
                          className="flex gap-2 rounded border border-zinc-800/60 bg-zinc-950/40 p-2"
                        >
                          <span
                            className={
                              c.ok ? "text-emerald-400" : "text-red-400/90"
                            }
                          >
                            {c.ok ? "✓" : "✗"}
                          </span>
                          <span className="text-zinc-300">{c.label}</span>
                          {c.note ? (
                            <span className="text-zinc-600">— {c.note}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs text-zinc-500">
                        Raw review JSON
                      </summary>
                      <JsonBlock className="mt-2" value={active.review} />
                    </details>
                  </Panel>
                </>
              )}
            </>
          )}

          {tab === "handoff" && (
            <>
              {!active ? (
                <Panel title="Handoff & export" subtitle="Agency bundle metadata">
                  <p className="text-xs text-zinc-500">Valid inputs required.</p>
                </Panel>
              ) : (
                <>
                  <Panel
                    title="Export profile"
                    subtitle="Mode-aware preset — dimensions, DPI, formats, delivery notes"
                  >
                    <div className="space-y-2 text-xs text-zinc-400">
                      <p>
                        <span className="text-zinc-500">Preset</span>{" "}
                        <span className="font-mono text-emerald-400/90">
                          {active.handoff.exportProfile.presetId}
                        </span>{" "}
                        — {active.handoff.exportProfile.label}
                      </p>
                      <p>
                        {active.handoff.exportProfile.canvasPx.width}×
                        {active.handoff.exportProfile.canvasPx.height}px · screen{" "}
                        {active.handoff.exportProfile.logicalDpiScreen} DPI
                        {active.handoff.exportProfile.printDpiRecommended
                          ? ` · print ${active.handoff.exportProfile.printDpiRecommended} DPI`
                          : ""}
                      </p>
                      <p>
                        {active.handoff.exportProfile.primaryFormats.join(", ")} ·{" "}
                        {active.handoff.exportProfile.colorSpace}
                        {active.handoff.exportProfile.allowUpscaleMaster
                          ? " · upscale OK"
                          : ""}
                      </p>
                      <p className="text-zinc-500">
                        {active.handoff.exportProfile.mediaSpecHint}
                      </p>
                      <Bullets items={active.handoff.exportProfile.deliveryNotes} />
                    </div>
                  </Panel>
                  <Panel title="Package manifest" subtitle="Logical paths for ZIP / DAM export">
                    <div className="max-h-64 overflow-auto text-xs">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-500">
                            <th className="py-2 pr-2">Kind</th>
                            <th className="py-2 pr-2">Path</th>
                            <th className="py-2">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-zinc-400">
                          {active.handoff.items.map((item, i) => (
                            <tr key={i} className="border-b border-zinc-800/50">
                              <td className="py-2 pr-2 font-mono text-violet-400/80">
                                {item.kind}
                              </td>
                              <td className="py-2 pr-2 font-mono text-[10px] text-zinc-600">
                                {item.path}
                              </td>
                              <td className="py-2">{item.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-600">
                      Bundle:{" "}
                      <span className="font-mono text-zinc-500">{active.handoff.bundleName}</span>
                    </p>
                  </Panel>
                  <Panel title="Structured layer manifest (excerpt)" subtitle="PSD/Figma-ready fields">
                    <JsonBlock
                      value={{
                        ...active.handoff.layerManifestStructured,
                        layers: active.handoff.layerManifestStructured.layers.slice(0, 8),
                      }}
                      maxHeight="max-h-80"
                      size="text-[10px]"
                    />
                  </Panel>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Panel title="Copy metadata">
                      <JsonBlock value={active.handoff.copyMetadata} size="text-[10px]" />
                    </Panel>
                    <Panel title="Brand metadata">
                      <JsonBlock value={active.handoff.brandMetadata} size="text-[10px]" />
                    </Panel>
                  </div>
                  <Panel title="Source visuals & notes">
                    <JsonBlock
                      value={active.handoff.sourceVisuals}
                      maxHeight="max-h-40"
                      size="text-[10px]"
                    />
                    <p className="mb-2 mt-4 text-xs font-medium text-zinc-500">
                      Production notes
                    </p>
                    <Bullets items={active.handoff.productionNotes} />
                  </Panel>
                  <Panel title="README" subtitle="Human-readable bundle index">
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-zinc-500">
                      {active.handoff.readme}
                    </pre>
                  </Panel>
                </>
              )}
            </>
          )}

          {tab === "output" && (
            <>
              <Panel
                title="Rendered output"
                subtitle="Server-side Sharp compose — use image URLs in JSON for full stack"
              >
                {composePreview?.preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${composePreview.preview.mimeType};base64,${composePreview.preview.dataBase64}`}
                      alt="Composed output"
                      className="max-h-[min(520px,65vh)] w-auto rounded-lg border border-zinc-700 shadow-md"
                    />
                    <p className="mt-3 text-xs text-zinc-500">
                      {composePreview.preview.width}×{composePreview.preview.height}px
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">
                    No render yet. Click <strong className="text-zinc-400">Render preview</strong>{" "}
                    in the input panel.
                  </p>
                )}
              </Panel>

              {(composePreview?.socialSlot ||
                composePreview?.fashionSlot ||
                composePreview?.exportDeckSection ||
                composePreview?.packagingVariantSpec) && (
                <Panel title="Active variant context" subtitle="Slot used for this render">
                  <div className="space-y-3 text-xs">
                    {composePreview.socialSlot ? (
                      <JsonBlock value={composePreview.socialSlot} maxHeight="max-h-32" />
                    ) : null}
                    {composePreview.fashionSlot ? (
                      <JsonBlock value={composePreview.fashionSlot} maxHeight="max-h-32" />
                    ) : null}
                    {composePreview.exportDeckSection ? (
                      <JsonBlock value={composePreview.exportDeckSection} maxHeight="max-h-40" />
                    ) : null}
                    {composePreview.packagingVariantSpec ? (
                      <JsonBlock
                        value={composePreview.packagingVariantSpec}
                        maxHeight="max-h-32"
                      />
                    ) : null}
                  </div>
                </Panel>
              )}

              {composePreview?.review?.modeReviewSummary ? (
                <Panel title="Compose-time review notes">
                  <Bullets items={composePreview.review.modeReviewSummary} />
                </Panel>
              ) : null}

              {composePreview?.handoffPackage ? (
                <Panel title="Handoff snapshot (this render)" subtitle="Same schema as pipeline">
                  <JsonBlock value={composePreview.handoffPackage} maxHeight="max-h-96" size="text-[10px]" />
                </Panel>
              ) : null}

              {composePreview?.handoffLayerManifest != null ? (
                <details className="rounded-xl border border-zinc-800/80 bg-zinc-900/30">
                  <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-zinc-400">
                    Full structured layer manifest (compose response)
                  </summary>
                  <div className="border-t border-zinc-800/80 p-4">
                    <JsonBlock
                      value={composePreview.handoffLayerManifest}
                      maxHeight="max-h-[480px]"
                      size="text-[10px]"
                    />
                  </div>
                </details>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
