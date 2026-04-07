"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  previewBrandVisualTrainingAction,
  startBrandVisualTrainingAction,
} from "@/app/actions/brand-visual-training";
import {
  BRAND_STYLE_MAX_IMAGES,
  BRAND_STYLE_MIN_IMAGES,
} from "@/lib/visual/brand-visual-style-limits";

type TrainingAssetOption = {
  id: string;
  resultUrl: string | null;
  briefTitle: string;
  isPreferred: boolean;
};

function qualityBadgeClass(q: string) {
  if (q === "Strong") return "border-emerald-700/50 bg-emerald-950/30 text-emerald-100";
  if (q === "Medium") return "border-amber-700/50 bg-amber-950/30 text-amber-100";
  return "border-red-800/50 bg-red-950/30 text-red-100";
}

export function StudioBrandVisualStylePanel({
  clientId,
  assets,
}: {
  clientId: string;
  assets: TrainingAssetOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    trainingQuality: string;
    lines: string[];
    imageCount: number;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const usable = useMemo(() => assets.filter((a) => a.resultUrl), [assets]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < BRAND_STYLE_MAX_IMAGES) next.add(id);
      return next;
    });
    setPreview(null);
    setConfirmOpen(false);
  }

  function runPreview() {
    setError(null);
    const ids = [...selected];
    start(async () => {
      const r = await previewBrandVisualTrainingAction(clientId, ids);
      if ("error" in r && r.error) {
        setError(r.error);
        setPreview(null);
        return;
      }
      if ("ok" in r && r.ok) {
        setPreview({
          trainingQuality: r.trainingQuality,
          lines: r.lines,
          imageCount: r.imageCount,
        });
        setConfirmOpen(true);
      }
    });
  }

  function runTrain() {
    setError(null);
    const ids = [...selected];
    start(async () => {
      const r = await startBrandVisualTrainingAction(clientId, ids);
      if ("error" in r && r.error) {
        setError(r.error);
        return;
      }
      setConfirmOpen(false);
      setPreview(null);
      router.refresh();
    });
  }

  if (usable.length < BRAND_STYLE_MIN_IMAGES) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Train brand visual style
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Mark at least {BRAND_STYLE_MIN_IMAGES} campaign frames you love across your briefs (Studio →
          preferred picks). Then return here to teach the system what “good” looks like for this brand.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-200/90">
          Train brand visual style
        </p>
        <span className="text-[10px] text-indigo-200/60">
          {selected.size}/{BRAND_STYLE_MAX_IMAGES} selected · need {BRAND_STYLE_MIN_IMAGES}–
          {BRAND_STYLE_MAX_IMAGES}
        </span>
      </div>
      <p className="mt-1 text-xs text-indigo-100/75">
        Pick frames that feel on-brand. We prepare everything automatically — no files or settings to
        manage.
      </p>

      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
        {usable.map((a) => (
          <label
            key={a.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5 text-xs text-zinc-200 hover:border-zinc-600"
          >
            <input
              type="checkbox"
              checked={selected.has(a.id)}
              onChange={() => toggle(a.id)}
              className="rounded border-zinc-600"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${a.resultUrl}?clientId=${encodeURIComponent(clientId)}`}
              alt=""
              className="h-10 w-14 shrink-0 rounded object-cover"
            />
            <span className="min-w-0 flex-1 truncate">
              {a.briefTitle}
              {a.isPreferred ? (
                <span className="ml-1 text-[10px] text-emerald-400">· preferred</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || selected.size < BRAND_STYLE_MIN_IMAGES}
          onClick={runPreview}
          className="rounded-lg border border-indigo-600/60 bg-indigo-900/40 px-3 py-2 text-sm font-medium text-indigo-50 hover:bg-indigo-800/50 disabled:opacity-40"
        >
          {pending ? "Checking…" : "Review selection"}
        </button>
        <button
          type="button"
          disabled={pending || !confirmOpen || selected.size < BRAND_STYLE_MIN_IMAGES}
          onClick={runTrain}
          className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
        >
          {pending ? "Starting…" : "Teach this style"}
        </button>
      </div>

      {preview ? (
        <div className="mt-4 space-y-2 rounded-lg border border-indigo-800/40 bg-indigo-950/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-indigo-200/80">Training quality</span>
            <span
              className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${qualityBadgeClass(preview.trainingQuality)}`}
            >
              {preview.trainingQuality}
            </span>
            <span className="text-[11px] text-indigo-200/60">{preview.imageCount} images</span>
          </div>
          <ul className="list-inside list-disc space-y-1 text-[11px] text-indigo-100/85">
            {preview.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="text-[10px] text-indigo-200/55">
            Teaching runs in the background (several minutes). Check{" "}
            <span className="text-indigo-100/80">Client overview</span> for progress and a before/after
            preview when ready.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
