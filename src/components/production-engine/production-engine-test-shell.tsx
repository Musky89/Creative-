"use client";

import { useMemo, useState } from "react";
import {
  PRODUCTION_MODES,
  listProductionModes,
  productionEngineInputSchema,
  runProductionEngineStub,
  splitProductionPlanForDisplay,
  type ProductionEngineInput,
  type ProductionEngineRunResult,
} from "@/lib/production-engine";

const DEFAULT_INPUT: ProductionEngineInput = {
  mode: "SOCIAL",
  briefSummary: "Spring campaign for a premium home textiles line — light, drape, designer trade.",
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
  supportingCopy: "Limited-run yardage and made-to-order drapery for design-led homes.",
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      <div className="text-sm text-zinc-300">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-inside list-disc space-y-1 text-xs text-zinc-400">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

type ComposePreviewPayload = {
  compositionPlanDocument: unknown;
  layerManifest: unknown;
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
  preview?: { mimeType: string; width: number; height: number; dataBase64: string };
  error?: string;
  message?: string;
};

export function ProductionEngineTestShell() {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(DEFAULT_INPUT, null, 2),
  );
  const [apiResult, setApiResult] = useState<ProductionEngineRunResult | null>(
    null,
  );
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [composePreview, setComposePreview] = useState<ComposePreviewPayload | null>(
    null,
  );
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const localPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      const r = productionEngineInputSchema.safeParse(parsed);
      if (!r.success) {
        return {
          error: "Invalid input for local preview",
          issues: r.error.flatten(),
        };
      }
      return { result: runProductionEngineStub(r.data) };
    } catch {
      return { error: "JSON parse error" };
    }
  }, [jsonText]);

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
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : String(e));
    } finally {
      setComposeLoading(false);
    }
  }

  async function runViaApi() {
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

  const preview =
    "result" in localPreview && localPreview.result
      ? localPreview.result
      : null;

  const active = apiResult ?? preview;
  const modeCfg = active
    ? listProductionModes().find((x) => x.id === active.input.mode)
    : null;
  const planSplit = active
    ? splitProductionPlanForDisplay(active.productionPlan)
    : null;

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-400">
        Standalone Creative Production Engine — not wired to Studio or orchestrator.
        Edit JSON inputs, preview locally, or POST the same payload via API.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-zinc-200">
            Normalized input (JSON)
          </label>
          <textarea
            className="h-[min(520px,50vh)] w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runViaApi}
              disabled={loading}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {loading ? "Running…" : "Run via API"}
            </button>
            <button
              type="button"
              onClick={runComposePreview}
              disabled={composeLoading}
              className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
            >
              {composeLoading ? "Composing…" : "Compose preview (Sharp)"}
            </button>
            <span className="self-center text-xs text-zinc-500">
              Optional JSON:{" "}
              <code className="text-zinc-400">heroImageUrl</code>,{" "}
              <code className="text-zinc-400">layoutArchetype</code>, SOCIAL:{" "}
              <code className="text-zinc-400">socialBatchPreset</code> (1|7|15|30),{" "}
              <code className="text-zinc-400">socialVariantIndex</code>,{" "}
              <code className="text-zinc-400">socialContentFamilies</code>.
            </span>
          </div>
          {apiError && (
            <pre className="max-h-40 overflow-auto rounded border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-200">
              {apiError}
            </pre>
          )}
          {composeError && (
            <pre className="max-h-40 overflow-auto rounded border border-amber-900/50 bg-amber-950/30 p-2 text-xs text-amber-200">
              {composeError}
            </pre>
          )}
        </div>

        <div className="space-y-4">
          <Section title="Registered modes">
            <ul className="list-inside list-disc space-y-1 text-zinc-400">
              {listProductionModes().map((m) => (
                <li key={m.id}>
                  <span className="text-zinc-200">{m.id}</span> — {m.label}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Active mode">
            {modeCfg ? (
              <div className="space-y-2">
                <p className="font-mono text-sm text-emerald-400">{modeCfg.id}</p>
                <p className="text-xs text-zinc-400">{modeCfg.label}</p>
              </div>
            ) : (
              <p className="text-xs text-amber-400/90">
                Fix JSON to select a mode.
                {"error" in localPreview && localPreview.error
                  ? ` — ${localPreview.error}`
                  : ""}
              </p>
            )}
          </Section>

          <Section title="Mode config summary">
            {modeCfg ? (
              <div className="max-h-[min(480px,55vh)] space-y-3 overflow-y-auto text-xs">
                <div>
                  <p className="font-semibold text-zinc-300">Objective</p>
                  <p className="text-zinc-500">{modeCfg.objective}</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-300">Success criteria</p>
                  <Bullets items={modeCfg.successCriteria} />
                </div>
                <div>
                  <p className="font-semibold text-zinc-300">Composition priorities</p>
                  <Bullets items={modeCfg.compositionPriorities} />
                </div>
                <div>
                  <p className="font-semibold text-zinc-300">Text tolerance</p>
                  <p className="text-zinc-500">{modeCfg.textTolerance}</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-300">Image expectations</p>
                  <Bullets items={modeCfg.imageExpectations} />
                </div>
                <div>
                  <p className="font-semibold text-zinc-300">Layout expectations</p>
                  <Bullets items={modeCfg.layoutExpectations} />
                </div>
                <div>
                  <p className="font-semibold text-zinc-300">Review focus</p>
                  <Bullets items={modeCfg.reviewFocus} />
                </div>
                <div>
                  <p className="font-semibold text-zinc-300">Export expectations</p>
                  <Bullets items={modeCfg.exportExpectations} />
                </div>
                <p className="text-zinc-600">
                  Technical: {modeCfg.typicalAspectRatios.join(", ")} ·{" "}
                  {modeCfg.defaultFalEndpointId}
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">—</p>
            )}
          </Section>
        </div>
      </div>

      {active?.socialVariants && active.socialVariants.length > 0 && (
        <Section title="SOCIAL batch plan (variants)">
          <div className="max-h-64 overflow-auto text-xs">
            <table className="w-full border-collapse text-left text-zinc-400">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Family</th>
                  <th className="py-1 pr-2">Headline</th>
                  <th className="py-1">CTA</th>
                </tr>
              </thead>
              <tbody>
                {active.socialVariants.map((v, i) => (
                  <tr key={i} className="border-b border-zinc-800/80">
                    <td className="py-1 pr-2 font-mono text-zinc-500">{i}</td>
                    <td className="py-1 pr-2 text-emerald-400/90">{v.family}</td>
                    <td className="py-1 pr-2">{v.headline.slice(0, 56)}</td>
                    <td className="py-1">{v.cta.slice(0, 40)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {active && planSplit && (
        <div className="space-y-4">
          <Section title="Production Plan — shared fields">
            <pre className="max-h-64 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(planSplit.common, null, 2)}
            </pre>
          </Section>
          <Section title="Production Plan — mode-specific fields">
            <pre className="max-h-64 overflow-auto font-mono text-xs text-amber-200/80">
              {JSON.stringify(planSplit.modeSpecific, null, 2)}
            </pre>
          </Section>
        </div>
      )}

      {active && (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="FAL visual layer — quality tier">
            <p className="mb-2 font-mono text-sm text-cyan-400/90">
              {active.visualExecution.qualityTier}
            </p>
            <p className="text-xs text-zinc-500">
              Set <code className="text-zinc-400">visualQualityTier</code> in input JSON:
              draft | standard | high
            </p>
          </Section>
          <Section title="FAL routing summary (legacy)">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(active.falRouting, null, 2)}
            </pre>
          </Section>

          <Section title="Derived generation targets">
            <ul className="space-y-3 text-xs">
              {active.visualExecution.targets.map((t) => (
                <li
                  key={t.id}
                  className="rounded border border-zinc-800 bg-zinc-950/60 p-2"
                >
                  <span className="font-mono text-emerald-400">{t.targetType}</span>
                  <span className="text-zinc-500"> · {t.id}</span>
                  <p className="mt-1 text-zinc-400">{t.roleInOutput}</p>
                  <p className="mt-1 text-zinc-600">
                    batch {t.desiredBatchSize} · realism {t.realismBias}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Per-target FAL route + why">
            <div className="space-y-4">
              {active.visualExecution.routedExecutions.map((r) => (
                <div
                  key={r.target.id}
                  className="rounded border border-zinc-800 bg-zinc-950/60 p-3"
                >
                  <p className="font-mono text-sm text-amber-200/90">
                    {r.route.pathId}
                  </p>
                  <p className="text-xs text-zinc-500">
                    kind: {r.route.kind} · target: {r.target.id}
                  </p>
                  <Bullets items={r.route.reasons} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Execution request previews (FAL contract)">
            <div className="space-y-3">
              {active.visualExecution.routedExecutions.map((r) => (
                <pre
                  key={`req-${r.request.requestId}`}
                  className="max-h-48 overflow-auto rounded border border-zinc-800 bg-black/40 p-2 font-mono text-[10px] text-zinc-400"
                >
                  {JSON.stringify(r.request, null, 2)}
                </pre>
              ))}
            </div>
          </Section>

          <Section title="Execution response previews (stub)">
            <div className="space-y-3">
              {active.visualExecution.routedExecutions.map((r) => (
                <pre
                  key={`res-${r.response.requestId}`}
                  className="max-h-48 overflow-auto rounded border border-zinc-800 bg-black/40 p-2 font-mono text-[10px] text-zinc-400"
                >
                  {JSON.stringify(r.response, null, 2)}
                </pre>
              ))}
            </div>
          </Section>

          <Section title="Operational plan (execution checklist)">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(active.operationalPlan, null, 2)}
            </pre>
          </Section>
          <Section title="Jobs (aligned with FAL routes)">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(active.jobs, null, 2)}
            </pre>
          </Section>
          <Section title="Composition Plan (schema)">
            <p className="mb-2 font-mono text-sm text-violet-300">
              Layout archetype:{" "}
              <span className="text-violet-100">
                {active.compositionPlanDocument.layoutArchetype}
              </span>
            </p>
            <pre className="max-h-64 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(active.compositionPlanDocument, null, 2)}
            </pre>
          </Section>
          <Section title="Layer manifest (handoff)">
            <pre className="max-h-64 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(active.layerManifest, null, 2)}
            </pre>
          </Section>
          <Section title="How assembly works">
            <Bullets items={active.assemblyExplanation} />
          </Section>
          <Section title="Composed artifact stubs">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(active.composed, null, 2)}
            </pre>
          </Section>
          <Section title="Review / evaluation">
            {active.review.modeReviewSummary && (
              <div className="mb-3 rounded border border-zinc-700 bg-zinc-950/80 p-2">
                <p className="mb-1 text-xs font-semibold text-amber-200/90">
                  Mode-specific review
                </p>
                <Bullets items={active.review.modeReviewSummary} />
              </div>
            )}
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(active.review, null, 2)}
            </pre>
          </Section>
          <Section title="Handoff package (stub)">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(active.handoff, null, 2)}
            </pre>
          </Section>
        </div>
      )}

      {composePreview?.socialSlot && (
        <Section title="Compose API — SOCIAL slot used">
          <pre className="max-h-40 overflow-auto font-mono text-xs text-zinc-400">
            {JSON.stringify(composePreview.socialSlot, null, 2)}
          </pre>
        </Section>
      )}

      {composePreview?.review?.modeReviewSummary && (
        <Section title="Compose API — mode review">
          <Bullets items={composePreview.review.modeReviewSummary} />
        </Section>
      )}

      {composePreview?.preview && (
        <Section title="Server compose preview (PNG)">
          {/* Base64 preview — next/image not applicable */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${composePreview.preview.mimeType};base64,${composePreview.preview.dataBase64}`}
            alt="Composed preview"
            className="max-h-[min(480px,60vh)] w-auto rounded border border-zinc-700"
          />
          <p className="mt-2 text-xs text-zinc-500">
            {composePreview.preview.width}×{composePreview.preview.height} — platform
            layout + text + logo; FAL hero if{" "}
            <code className="text-zinc-400">heroImageUrl</code> set.
          </p>
        </Section>
      )}

      <p className="text-xs text-zinc-600">
        Valid mode strings: {PRODUCTION_MODES.join(", ")}
      </p>
    </div>
  );
}
