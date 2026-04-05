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
    <div className="mt-2 rounded-md border border-amber-200/70 bg-amber-50/50 px-2 py-1.5 text-[11px] text-amber-950">
      <span className="font-semibold">{review.qualityVerdict}</span>
      {slop ? <span className="ml-2">· Slop: {slop}</span> : null}
      {avoid ? <span className="ml-2">· Avoid list: {avoid}</span> : null}
      {review.regenerationRecommended ? (
        <span className="ml-2 font-medium text-amber-900">· Regen suggested</span>
      ) : null}
      <span className="ml-2 text-amber-900/70">({review.evaluator})</span>
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
}: {
  clientId: string;
  briefId: string;
  promptPackageArtifactId: string;
  assets: AssetRow[];
  critiqueRegenLimit: number;
  packageAssetLimit: number;
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
    <div className="mt-6 rounded-xl border border-sky-200/80 bg-sky-50/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">
        Generated visual assets
      </p>
      <p className="mt-1 text-xs text-sky-900/80">
        From prompt package{" "}
        <span className="font-mono">{promptPackageArtifactId.slice(0, 12)}…</span>
        <span className="ml-2 text-sky-800/80">
          ({taskAssets.length}/{packageAssetLimit} variants)
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-medium text-sky-950">
            Provider target
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-1 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            <option value="GENERIC">GENERIC (first available key)</option>
            <option value="GPT_IMAGE">GPT_IMAGE (OpenAI)</option>
            <option value="GEMINI_IMAGE">GEMINI_IMAGE (Google Imagen)</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="block text-[11px] font-medium text-sky-950">
            Critique / direction (optional, for regen)
          </label>
          <textarea
            value={critique}
            onChange={(e) => setCritique(e.target.value)}
            rows={2}
            placeholder="Tighter crop, less saturation, no human hands…"
            className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
          />
          <p className="mt-0.5 text-[10px] text-sky-900/70">
            Critique runs: {critiqueCount}/{critiqueRegenLimit} (bounded)
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
          className="rounded-lg bg-sky-900 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {pending ? "Generating…" : critique.trim() ? "Regenerate with critique" : "Generate variant"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {taskAssets.length === 0 ? (
          <li className="col-span-full text-sm text-sky-900/70">
            No generations for this package yet.
          </li>
        ) : (
          taskAssets.map((a) => (
            <li
              key={a.id}
              className={`rounded-lg border bg-white/90 p-3 ${
                a.isPreferred
                  ? "border-emerald-400 ring-2 ring-emerald-200/80"
                  : a.founderRejected
                    ? "border-zinc-300 opacity-70"
                    : "border-sky-200/90"
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  {a.status === "COMPLETED" && a.resultUrl ? (
                    <div className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${a.resultUrl}?clientId=${encodeURIComponent(clientId)}`}
                        alt="Generated visual"
                        className="h-32 w-32 rounded-md border border-zinc-200 object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {a.isPreferred ? (
                      <span className="inline-block rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        Selected
                      </span>
                    ) : null}
                    {a.founderRejected ? (
                      <span className="ml-2 inline-block rounded bg-zinc-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        Rejected
                      </span>
                    ) : null}
                    <p className="mt-1 text-xs font-medium text-zinc-500">
                      {a.providerTarget} · {a.providerName} / {a.modelName}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {new Date(a.createdAt).toLocaleString()}
                      {a.regenerationAttempt > 0 ? " · critique regen" : ""}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-zinc-400">
                      asset {a.id.slice(0, 10)}…
                    </p>
                  </div>
                </div>
                <QualitySummary review={a.review} />
                {isRecord(a.review?.evaluation) &&
                Array.isArray(a.review.evaluation.recommendations) ? (
                  <ul className="list-inside list-disc text-[11px] text-zinc-700">
                    {(a.review!.evaluation.recommendations as string[])
                      .slice(0, 4)
                      .map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                  </ul>
                ) : null}
                {a.status === "FAILED" && a.generationNotes ? (
                  <p className="text-xs text-red-800">{a.generationNotes}</p>
                ) : null}
                {a.status === "COMPLETED" ? (
                  <div className="flex flex-wrap gap-2 pt-1">
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
                      className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-40"
                    >
                      Select
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
                      className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
