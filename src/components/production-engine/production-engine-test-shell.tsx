"use client";

import { useMemo, useState } from "react";
import {
  PRODUCTION_MODES,
  listProductionModes,
  productionEngineInputSchema,
  runProductionEngineStub,
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

export function ProductionEngineTestShell() {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(DEFAULT_INPUT, null, 2),
  );
  const [apiResult, setApiResult] = useState<ProductionEngineRunResult | null>(
    null,
  );
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
            <span className="text-xs text-zinc-500 self-center">
              Local preview updates as you type (when valid).
            </span>
          </div>
          {apiError && (
            <pre className="max-h-40 overflow-auto rounded border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-200">
              {apiError}
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

          <Section title="Mode config (selected)">
            {preview ? (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-400">
                {JSON.stringify(
                  listProductionModes().find((x) => x.id === preview.input.mode),
                  null,
                  2,
                )}
              </pre>
            ) : (
              <p className="text-amber-400/90 text-xs">
                Fix JSON to see mode config.
                {"error" in localPreview && localPreview.error
                  ? ` — ${localPreview.error}`
                  : ""}
              </p>
            )}
          </Section>
        </div>
      </div>

      {(preview || apiResult) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Production plan">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(
                (apiResult ?? preview)!.plan,
                null,
                2,
              )}
            </pre>
          </Section>
          <Section title="FAL routing (stub)">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(
                (apiResult ?? preview)!.falRouting,
                null,
                2,
              )}
            </pre>
          </Section>
          <Section title="Jobs (stub)">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(
                (apiResult ?? preview)!.jobs,
                null,
                2,
              )}
            </pre>
          </Section>
          <Section title="Composition plan">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(
                (apiResult ?? preview)!.compositionPlan,
                null,
                2,
              )}
            </pre>
          </Section>
          <Section title="Deterministic composer output (stub)">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(
                (apiResult ?? preview)!.composed,
                null,
                2,
              )}
            </pre>
          </Section>
          <Section title="Review / evaluation">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(
                (apiResult ?? preview)!.review,
                null,
                2,
              )}
            </pre>
          </Section>
          <Section title="Handoff package (stub)">
            <pre className="max-h-56 overflow-auto font-mono text-xs text-zinc-400">
              {JSON.stringify(
                (apiResult ?? preview)!.handoff,
                null,
                2,
              )}
            </pre>
          </Section>
        </div>
      )}

      <p className="text-xs text-zinc-600">
        Valid mode strings: {PRODUCTION_MODES.join(", ")}
      </p>
    </div>
  );
}
