"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  composeCampaignAssetAction,
  composeFinalOutputAction,
  generateVisualAssetAction,
  rejectVisualAssetAction,
  selectPreferredVisualAssetAction,
} from "@/app/actions/visual-assets";
import { FINAL_OUTPUT_FORMATS } from "@/lib/visual-finishing/final-output-formats";
import type { FinalOutputFormatId } from "@/lib/visual-finishing/final-output-formats";
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
  composeDefaultCta = null,
  panelTitle = "Visual variants",
  compact = false,
  /** `campaign` = larger grid, less chrome, pitch-friendly copy */
  layout = "panel",
  /** When true, omit the raw-variant grid (hero/alternates shown elsewhere). */
  hideRawGrid = false,
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
  /** First CTA from COPY for format composer. */
  composeDefaultCta?: string | null;
  /** Override section heading (e.g. when embedded in Studio hub). */
  panelTitle?: string;
  /** Less top margin when nested under another card. */
  compact?: boolean;
  layout?: "panel" | "campaign";
  hideRawGrid?: boolean;
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
  const [composeCta, setComposeCta] = useState(() => composeDefaultCta ?? "");
  const [composeLogoUrl, setComposeLogoUrl] = useState("");
  const [composeFormat, setComposeFormat] =
    useState<FinalOutputFormatId>("SOCIAL");

  useEffect(() => {
    if (composeDefaultHeadline) {
      setComposeHeadline(composeDefaultHeadline);
    }
  }, [composeDefaultHeadline]);

  useEffect(() => {
    if (composeDefaultCta) {
      setComposeCta(composeDefaultCta);
    }
  }, [composeDefaultCta]);

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

  const composedOutputs = useMemo(
    () =>
      taskAssets.filter(
        (a) =>
          a.composed &&
          a.variantLabel &&
          (a.variantLabel === "COMPOSED" ||
            a.variantLabel.startsWith("COMPOSED_")),
      ),
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

  const isCampaign = layout === "campaign";

  return (
    <div
      className={`${isCampaign ? "rounded-2xl bg-zinc-950/20 p-1 sm:p-2" : "rounded-2xl border border-zinc-700/80 bg-zinc-950/50 p-5"} ${compact ? "mt-0" : "mt-6"}`}
    >
      <p
        className={
          isCampaign
            ? "text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500"
            : "text-xs font-semibold uppercase tracking-wide text-zinc-400"
        }
      >
        {panelTitle}
      </p>
      <p className={`mt-1 text-sm ${isCampaign ? "text-zinc-500" : "text-zinc-500"}`}>
        {isCampaign ? (
          <>
            Each <strong className="font-medium text-zinc-300">Generate</strong> creates a batch
            of frames; we surface the strongest options. {rawCount}/{packageAssetLimit} in this
            package.
          </>
        ) : (
          <>
            {rawCount}/{packageAssetLimit} raw stored · each{" "}
            <strong className="font-medium text-zinc-300">Generate</strong> run produces a batch
            (default {VISUAL_VARIANTS_PER_RUN_MIN}+ variants), filters slop, surfaces top 2
          </>
        )}
      </p>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={showRejected}
          onChange={(e) => setShowRejected(e.target.checked)}
          className="rounded border-zinc-600"
        />
        Show set-aside / filtered frames
      </label>

      {composedOutputs.length > 0 ? (
        <div
          className={
            isCampaign
              ? "mt-6 rounded-2xl bg-gradient-to-b from-teal-950/15 to-transparent p-4 sm:p-6"
              : "mt-5 rounded-xl border border-teal-700/40 bg-teal-950/20 p-4"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className={
                isCampaign
                  ? "text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200/80"
                  : "text-xs font-semibold uppercase tracking-wide text-teal-200/90"
              }
            >
              {isCampaign ? "Finished ads" : "Final outputs (composed)"}
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
          <ul
            className={
              isCampaign
                ? "mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                : "mt-3 space-y-4"
            }
          >
            {composedOutputs.map((a) =>
              a.status === "COMPLETED" && a.resultUrl ? (
                <li
                  key={a.id}
                  className={
                    isCampaign
                      ? "flex flex-col gap-3"
                      : "flex flex-col gap-2 border-b border-teal-900/30 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-start"
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${a.resultUrl}?clientId=${encodeURIComponent(clientId)}`}
                    alt={a.variantLabel ?? "Composed"}
                    className={
                      isCampaign
                        ? "aspect-[4/5] w-full rounded-xl object-cover shadow-lg shadow-black/40 ring-1 ring-white/5"
                        : "h-44 w-full max-w-[280px] rounded-lg border border-teal-800/50 object-cover"
                    }
                  />
                  <div>
                    <p className="text-[11px] font-medium text-teal-200/90">
                      {a.variantLabel === "COMPOSED"
                        ? isCampaign
                          ? "Campaign layout"
                          : "Quick finish (legacy layout)"
                        : a.variantLabel?.replace(/^COMPOSED_/, "").replace(/_/g, " ") ??
                          "Composed"}
                    </p>
                    {!isCampaign ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        High-res PNG; metadata includes{" "}
                        <code className="text-zinc-400">layerManifest</code> for future PSD/FIG
                        export.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">
                        High-resolution — ready to share or export.
                      </p>
                    )}
                  </div>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      ) : null}

      <div
        className={
          isCampaign
            ? "mt-8 rounded-2xl bg-zinc-900/25 p-5 sm:p-6"
            : "mt-5 rounded-xl border border-zinc-800/90 bg-zinc-950/40 p-4"
        }
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {isCampaign ? "Build campaign layouts" : "Final output composer"}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          {isCampaign
            ? "Add headline, CTA, and logo to your selected frame — Social, OOH, or print proportions."
            : "Campaign-ready layouts: headline hierarchy, optional CTA, optional logo (URL), format canvas, 2× resolution. Quick finish keeps the previous single-canvas behavior."}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500">Headline</label>
            <input
              type="text"
              value={composeHeadline}
              onChange={(e) => setComposeHeadline(e.target.value)}
              placeholder="Headline"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500">CTA (formats)</label>
            <input
              type="text"
              value={composeCta}
              onChange={(e) => setComposeCta(e.target.value)}
              placeholder="Shop now · Learn more"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-[11px] font-medium text-zinc-500">
            Logo image URL (optional, PNG/SVG)
          </label>
          <input
            type="url"
            value={composeLogoUrl}
            onChange={(e) => setComposeLogoUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <div className="mt-3">
          <p className="text-[11px] font-medium text-zinc-500">Format</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["SOCIAL", FINAL_OUTPUT_FORMATS.SOCIAL.label],
                ["OOH", FINAL_OUTPUT_FORMATS.OOH.label],
                ["PRINT", FINAL_OUTPUT_FORMATS.PRINT.label],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setComposeFormat(id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  composeFormat === id
                    ? "border-teal-500 bg-teal-950/50 text-teal-100"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !preferredRaw}
            onClick={() => {
              setError(null);
              start(async () => {
                const r = await composeFinalOutputAction(clientId, briefId, promptPackageArtifactId, {
                  format: composeFormat,
                  sourceVisualAssetId: preferredRaw?.id ?? null,
                  headline: composeHeadline.trim() || null,
                  ctaText: composeCta.trim() || null,
                  logoUrl: composeLogoUrl.trim() || null,
                });
                if ("error" in r && r.error) {
                  setError(r.error);
                  return;
                }
                router.refresh();
              });
            }}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-40"
          >
            {pending ? "Composing…" : `Build ${composeFormat.toLowerCase()} layout`}
          </button>
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
            className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
          >
            Quick finish (legacy)
          </button>
        </div>
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

      {composedOutputs.length > 0 && !showRaw ? (
        <p className="mt-4 text-xs text-zinc-500">
          Raw variants hidden — enable <strong className="text-zinc-400">Show raw AI outputs</strong>{" "}
          above to compare.
        </p>
      ) : null}

      {!hideRawGrid ? (
      <ul
        className={`mt-6 grid gap-5 ${isCampaign ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"} ${composedOutputs.length > 0 && !showRaw ? "hidden" : ""}`}
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
                  <div className={isCampaign ? "w-full" : "shrink-0"}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${a.resultUrl}?clientId=${encodeURIComponent(clientId)}`}
                      alt="Generated visual"
                      className={
                        isCampaign
                          ? "aspect-[4/3] w-full rounded-xl object-cover shadow-md shadow-black/30 ring-1 ring-white/5"
                          : "h-36 w-full max-w-[200px] rounded-lg border border-zinc-700 object-cover sm:h-40 sm:w-40"
                      }
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.composed ? (
                      <span className="text-xs font-medium text-teal-300">
                        {a.variantLabel?.startsWith("COMPOSED_")
                          ? a.variantLabel.replace(/^COMPOSED_/, "")
                          : "COMPOSED"}
                      </span>
                    ) : null}
                    {a.cdDirectorPick ? (
                      <span className="text-xs font-medium text-violet-300">
                        CD pick
                      </span>
                    ) : null}
                    {a.isPreferred ? (
                      <span className="text-xs font-medium text-emerald-300">
                        {isCampaign ? "Hero frame" : "Selected"}
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
                        {isCampaign ? "Set aside" : "Rejected"}
                      </span>
                    ) : null}
                  </div>
                  {!isCampaign ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {a.providerTarget} · {a.providerName} / {a.modelName}
                    </p>
                  ) : null}
                  {!isCampaign ? (
                    <p className="mt-0.5 text-[11px] text-zinc-600">
                      {new Date(a.createdAt).toLocaleString()}
                      {a.regenerationAttempt > 0 ? " · from critique" : ""}
                    </p>
                  ) : null}
                  {!isCampaign ? <QualitySummary review={a.review} /> : null}
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
                        {isCampaign ? "Select" : "Use this"}
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
                        {isCampaign ? "Set aside" : "Reject"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
      ) : null}
    </div>
  );
}
