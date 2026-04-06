"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  generateVisualAssetAction,
  rejectVisualAssetAction,
  selectPreferredVisualAssetAction,
} from "@/app/actions/visual-assets";

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
  founderRejected: boolean;
  regenerationAttempt: number;
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
  return (
    <div className="mt-2 rounded-md border border-amber-500/25 bg-amber-950/30 px-2 py-1.5 text-[11px] text-amber-100/90">
      <span className="font-semibold">{review.qualityVerdict}</span>
      {slop ? <span className="ml-2">· Slop: {slop}</span> : null}
      {avoid ? <span className="ml-2">· Avoid list: {avoid}</span> : null}
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
  critiqueRegenLimit,
  packageAssetLimit,
  panelTitle = "Visual variants",
  compact = false,
}: {
  clientId: string;
  briefId: string;
  promptPackageArtifactId: string;
  assets: AssetRow[];
  critiqueRegenLimit: number;
  packageAssetLimit: number;
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

  const critiqueCount = taskAssets.filter((a) => a.regenerationAttempt > 0).length;
  const canCritiqueRegen = critiqueCount < critiqueRegenLimit;
  const canAddMore = taskAssets.length < packageAssetLimit;

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
        {taskAssets.length}/{packageAssetLimit} variants · compare and pick one
      </p>

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
            <option value="GENERIC">Auto (first available)</option>
            <option value="GPT_IMAGE">OpenAI</option>
            <option value="GEMINI_IMAGE">Google Imagen</option>
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
          {pending ? "Working…" : critique.trim() ? "Regenerate" : "Generate"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {taskAssets.length === 0 ? (
          <li className="col-span-full text-sm text-zinc-500">
            No variants yet — generate to compare side by side.
          </li>
        ) : (
          taskAssets.map((a) => (
            <li
              key={a.id}
              className={`rounded-xl border p-4 ${
                a.isPreferred
                  ? "border-emerald-500/40 bg-emerald-950/25 ring-1 ring-emerald-500/20"
                  : a.founderRejected
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
                    {a.isPreferred ? (
                      <span className="text-xs font-medium text-emerald-300">
                        Selected
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
                  {a.status === "COMPLETED" ? (
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
