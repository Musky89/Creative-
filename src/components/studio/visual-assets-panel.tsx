"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  composeCampaignAssetAction,
  generateVisualAssetAction,
  rejectVisualAssetAction,
  selectPreferredVisualAssetAction,
} from "@/app/actions/visual-assets";
import { VISUAL_VARIANTS_PER_RUN_MIN } from "@/lib/visual/visual-variant-thresholds";

type ReviewRow = {
  qualityVerdict: string;
  regenerationRecommended: boolean;
  evaluator: string;
  evaluation: Record<string, unknown> | null;
};

type AssetRow = {
  id: string;
  status: string;
  providerTarget: string;
  providerName: string;
  modelName: string;
  resultUrl: string | null;
  sourceArtifactId: string;
  generationNotes: string | null;
  createdAt: string;
  isPreferred: boolean;
  isSecondary: boolean;
  autoRejected: boolean;
  founderRejected: boolean;
  cdDirectorPick?: boolean;
  regenerationAttempt: number;
  variantLabel: string | null;
  composed: boolean;
  review: ReviewRow | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function QualitySummary({ review }: { review: ReviewRow | null }) {
  if (!review) {
    return (
      <p className="mt-2 text-[11px] text-zinc-500">
        Quality evaluation pending or unavailable.
      </p>
    );
  }
  const ev = review.evaluation;
  const slop = isRecord(ev) && typeof ev.slopRisk === "string" ? ev.slopRisk : null;
  const avoid =
    isRecord(ev) && typeof ev.avoidListRespected === "string"
      ? ev.avoidListRespected
      : null;
  const rs = isRecord(ev) && typeof ev.realismScore === "number" ? ev.realismScore : null;
  const cs = isRecord(ev) && typeof ev.compositionScore === "number" ? ev.compositionScore : null;
  const bf = isRecord(ev) && typeof ev.brandFitScore === "number" ? ev.brandFitScore : null;
  const ss = isRecord(ev) && typeof ev.slopScore === "number" ? ev.slopScore : null;
  return (
    <div className="mt-2 rounded-md border border-amber-500/25 bg-amber-950/30 px-2 py-1.5 text-[11px] text-amber-100/90">
      <span className="font-semibold">{review.qualityVerdict}</span>
      {slop ? <span className="ml-2">· Slop: {slop}</span> : null}
      {avoid ? <span className="ml-2">· Avoid list: {avoid}</span> : null}
      {rs != null ? (
        <span className="ml-2">
          · Realism {rs.toFixed(2)} / Comp {cs?.toFixed(2) ?? "—"} / Brand {bf?.toFixed(2) ?? "—"}{" "}
          / Slop {ss?.toFixed(2) ?? "—"}
        </span>
      ) : null}
      {review.regenerationRecommended ? (
        <span className="ml-2 font-medium text-amber-200">· Regen suggested</span>
      ) : null}
      <span className="ml-2 text-amber-200/60">({review.evaluator})</span>
    </div>
  );
}

export function VisualAssetsPanel({
  clientId,
  briefId,
  promptPackageArtifactId,
  assets,
  hasBrandVisualStyle = false,
  critiqueRegenLimit,
  packageAssetLimit,
  composeDefaultHeadline,
  panelTitle = "Visual variants",
  compact = false,
}: {
  clientId: string;
  briefId: string;
  promptPackageArtifactId: string;
  assets: AssetRow[];
  /** True when client has a taught style and FAL_KEY is set. */
  hasBrandVisualStyle?: boolean;
  critiqueRegenLimit: number;
  packageAssetLimit: number;
  /** First headline from COPY for compose default. */
  composeDefaultHeadline: string | null;
  /** Override section heading (e.g. when embedded in Studio hub). */
  panelTitle?: string;
  /** Less top margin when nested under another card. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string>("GENERIC");
  const [critique, setCritique] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [composeHeadline, setComposeHeadline] = useState(
    () => composeDefaultHeadline ?? "",
  );

  useEffect(() => {
    if (composeDefaultHeadline) {
      setComposeHeadline(composeDefaultHeadline);
    }
  }, [composeDefaultHeadline]);

  const taskAssets = useMemo(
    () =>
      assets
        .filter((a) => a.sourceArtifactId === promptPackageArtifactId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [assets, promptPackageArtifactId],
  );

  const rawCount = taskAssets.filter((a) => !a.composed).length;
  const critiqueCount = taskAssets.filter((a) => a.regenerationAttempt > 0).length;
  const canCritiqueRegen = critiqueCount < critiqueRegenLimit;
  const batchNeed = critique.trim() ? 1 : VISUAL_VARIANTS_PER_RUN_MIN;
  const canAddMore = rawCount + batchNeed <= packageAssetLimit;

  const composedFinal = useMemo(
    () => taskAssets.find((a) => a.variantLabel === "COMPOSED" && a.composed),
    [taskAssets],
  );

  const rawOnlyPool = useMemo(
    () => taskAssets.filter((a) => !a.composed),
    [taskAssets],
  );

  const preferredRaw = useMemo(
    () => rawOnlyPool.find((a) => a.isPreferred && a.status === "COMPLETED"),
    [rawOnlyPool],
  );

  const visibleRawAssets = useMemo(() => {
    if (showRejected) return rawOnlyPool;
    const completed = rawOnlyPool.filter((a) => a.status === "COMPLETED");
    const legacySurface =
      completed.length > 0 &&
      !completed.some((a) => a.isPreferred || a.isSecondary) &&
      !completed.some((a) => a.autoRejected);
    return rawOnlyPool.filter((a) => {
      if (a.status === "GENERATING" || a.status === "PENDING") return true;
      if (a.status === "FAILED") return true;
      if (a.status !== "COMPLETED") return true;
      if (legacySurface) return !a.founderRejected;
      if (a.founderRejected) return false;
      if (a.autoRejected) return false;
      return a.isPreferred || a.isSecondary;
    });
  }, [rawOnlyPool, showRejected]);

  const runGenerate = (critiqueText: string | null) => {
    setError(null);
    start(async () => {
      const r = await generateVisualAssetAction(
        clientId,
        briefId,
        promptPackageArtifactId,
        target,
        critiqueText,
      );
      if ("error" in r && r.error) {
        setError(r.error);
        return;
      }
      setCritique("");
      router.refresh();
    });
  };

  return (
    <div
      className={`rounded-2xl border border-zinc-700/80 bg-zinc-950/50 p-5 ${compact ? "mt-0" : "mt-6"}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {panelTitle}
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        {rawCount}/{packageAssetLimit} raw stored · each{" "}
        <strong className="font-medium text-zinc-300">Generate</strong> run produces a batch
        (default {VISUAL_VARIANTS_PER_RUN_MIN}+ variants), filters slop, surfaces top 2
      </p>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={showRejected}
          onChange={(e) => setShowRejected(e.target.checked)}
          className="rounded border-zinc-600"
        />
        Show rejected / filtered variants
      </label>

      {composedFinal && composedFinal.status === "COMPLETED" && composedFinal.resultUrl ? (
        <div className="mt-5 rounded-xl border border-teal-700/40 bg-teal-950/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-200/90">
              Final (composed)
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-400">
              <input
                type="checkbox"
                checked={showRaw}
                onChange={(e) => setShowRaw(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Show raw AI outputs
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${composedFinal.resultUrl}?clientId=${encodeURIComponent(clientId)}`}
              alt="Composed campaign"
              className="h-44 w-full max-w-[280px] rounded-lg border border-teal-800/50 object-cover"
            />
            <p className="text-xs text-zinc-500">
              Headline, brand tint, grain, and vignette applied locally — minimal layout.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-zinc-800/90 bg-zinc-950/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Finishing pass
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          Uses preferred raw variant + headline (defaults to first line from latest COPY).
        </p>
        <input
          type="text"
          value={composeHeadline}
          onChange={(e) => setComposeHeadline(e.target.value)}
          placeholder="Headline for overlay"
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
        />
        <button
          type="button"
          disabled={pending || !preferredRaw}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await composeCampaignAssetAction(
                clientId,
                briefId,
                promptPackageArtifactId,
                preferredRaw?.id ?? null,
                composeHeadline.trim() || null,
              );
              if ("error" in r && r.error) {
                setError(r.error);
                return;
              }
              router.refresh();
            });
          }}
          className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-40"
        >
          {pending ? "Composing…" : "Build finishing pass"}
        </button>
        {!preferredRaw ? (
          <p className="mt-2 text-[11px] text-amber-600/90">
            Select a preferred raw variant first.
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400">
            Provider
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
          >
            <option value="GENERIC">Auto (brand style via fal when taught, else Gemini → OpenAI)</option>
            <option value="GPT_IMAGE">OpenAI</option>
            <option value="GEMINI_IMAGE">Google Imagen</option>
            <option value="FAL_IMAGE" disabled={!hasBrandVisualStyle}>
              Brand style (fal) {!hasBrandVisualStyle ? "— teach style first" : ""}
            </option>
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-[11px] font-medium text-zinc-400">
            Direction for next variant (optional)
          </label>
          <textarea
            value={critique}
            onChange={(e) => setCritique(e.target.value)}
            rows={2}
            placeholder="Tighter crop, cooler palette, no hands…"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
          />
          <p className="mt-0.5 text-[10px] text-zinc-600">
            Critique regens: {critiqueCount}/{critiqueRegenLimit}
          </p>
        </div>
        <button
          type="button"
          disabled={pending || !canAddMore}
          onClick={() => {
            const c = critique.trim();
            if (c && !canCritiqueRegen) {
              setError("Critique regeneration limit reached for this package.");
              return;
            }
            runGenerate(c || null);
          }}
          className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
        >
          {pending
            ? "Working…"
            : critique.trim()
              ? "Regenerate (1)"
              : `Generate batch (${VISUAL_VARIANTS_PER_RUN_MIN}+)`}
        </button>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {composedFinal && !showRaw ? (
        <p className="mt-4 text-xs text-zinc-500">
          Raw variants hidden — enable <strong className="text-zinc-400">Show raw AI outputs</strong>{" "}
          above to compare.
        </p>
      ) : null}

      <ul
        className={`mt-6 grid gap-4 sm:grid-cols-2 ${composedFinal && !showRaw ? "hidden" : ""}`}
      >
        {rawOnlyPool.length === 0 ? (
          <li className="col-span-full text-sm text-zinc-500">
            No variants yet — generate to compare side by side.
          </li>
        ) : visibleRawAssets.length === 0 ? (
          <li className="col-span-full text-sm text-zinc-500">
            All variants are hidden as rejected — enable &quot;Show rejected&quot; to audit.
          </li>
        ) : (
          visibleRawAssets.map((a) => (
            <li
              key={a.id}
              className={`rounded-xl border p-4 ${
                a.isPreferred
                  ? "border-emerald-500/40 bg-emerald-950/25 ring-1 ring-emerald-500/20"
                  : a.isSecondary
                    ? "border-sky-600/35 bg-sky-950/20"
                    : a.cdDirectorPick
                      ? "border-violet-500/45 bg-violet-950/20 ring-2 ring-violet-500/30"
                    : a.autoRejected || a.founderRejected
                      ? "border-zinc-800 opacity-60"
                      : "border-zinc-700/80 bg-zinc-900/30"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                {a.status === "COMPLETED" && a.resultUrl ? (
                  <div className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${a.resultUrl}?clientId=${encodeURIComponent(clientId)}`}
                      alt="Generated visual"
                      className="h-36 w-full max-w-[200px] rounded-lg border border-zinc-700 object-cover sm:h-40 sm:w-40"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.composed ? (
                      <span className="text-xs font-medium text-teal-300">COMPOSED</span>
                    ) : null}
                    {a.cdDirectorPick ? (
                      <span className="text-xs font-medium text-violet-300">
                        CD pick
                      </span>
                    ) : null}
                    {a.isPreferred ? (
                      <span className="text-xs font-medium text-emerald-300">
                        Selected
                      </span>
                    ) : null}
                    {a.isSecondary ? (
                      <span className="text-xs font-medium text-sky-300">Runner-up</span>
                    ) : null}
                    {a.autoRejected ? (
                      <span className="text-xs font-medium text-amber-600/90">
                        Auto-filtered
                      </span>
                    ) : null}
                    {a.founderRejected ? (
                      <span className="text-xs font-medium text-zinc-500">
                        Rejected
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {a.providerTarget} · {a.providerName} / {a.modelName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    {new Date(a.createdAt).toLocaleString()}
                    {a.regenerationAttempt > 0 ? " · from critique" : ""}
                  </p>
                  <QualitySummary review={a.review} />
                  {isRecord(a.review?.evaluation) &&
                  Array.isArray(a.review.evaluation.recommendations) ? (
                    <ul className="mt-2 list-inside list-disc text-[11px] text-zinc-400">
                      {(a.review!.evaluation.recommendations as string[])
                        .slice(0, 4)
                        .map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                    </ul>
                  ) : null}
                  {a.status === "FAILED" && a.generationNotes ? (
                    <p className="mt-2 text-xs text-red-300">{a.generationNotes}</p>
                  ) : null}
                  {a.status === "COMPLETED" && !a.composed ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending || a.isPreferred}
                        onClick={() => {
                          start(async () => {
                            await selectPreferredVisualAssetAction(
                              clientId,
                              briefId,
                              a.id,
                            );
                            router.refresh();
                          });
                        }}
                        className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                      >
                        Use this
                      </button>
                      <button
                        type="button"
                        disabled={pending || a.founderRejected}
                        onClick={() => {
                          start(async () => {
                            await rejectVisualAssetAction(clientId, briefId, a.id);
                            router.refresh();
                          });
                        }}
                        className="rounded-lg border border-zinc-600 bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
