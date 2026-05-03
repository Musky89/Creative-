"use client";

import { useMemo } from "react";
import type { TimelineSegment, VideoProject } from "@/lib/video-editor/types";
import { timelineDurationSec } from "@/lib/video-editor/cleaner";

interface Props {
  project: VideoProject;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<TimelineSegment>) => void;
}

const COLOR_POOL = [
  "bg-sky-500/70",
  "bg-emerald-500/70",
  "bg-amber-500/70",
  "bg-violet-500/70",
  "bg-rose-500/70",
  "bg-lime-500/70",
  "bg-fuchsia-500/70",
];

export function TimelineStrip({ project, onMove, onRemove, onUpdate }: Props) {
  const total = useMemo(
    () => timelineDurationSec(project.timeline),
    [project.timeline],
  );
  // Map clip id -> color so each take is visually consistent on the strip.
  const colorByClip = useMemo(() => {
    const m = new Map<string, string>();
    project.clips.forEach((c, i) => {
      m.set(c.id, COLOR_POOL[i % COLOR_POOL.length]);
    });
    return m;
  }, [project.clips]);

  const clipById = useMemo(
    () => new Map(project.clips.map((c) => [c.id, c])),
    [project.clips],
  );

  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Timeline
        </p>
        <p className="text-[11px] text-zinc-500">
          {project.timeline.length} segments · {formatDur(total)}
        </p>
      </div>

      {project.timeline.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">
          Empty. Use a clip&apos;s transcript to send segments here.
        </p>
      ) : (
        <>
          <div className="mt-3 flex h-6 w-full overflow-hidden rounded bg-zinc-950">
            {project.timeline.map((seg) => {
              const dur = Math.max(0, seg.end - seg.start);
              const pct = total > 0 ? (dur / total) * 100 : 0;
              return (
                <div
                  key={seg.id}
                  className={`${colorByClip.get(seg.clipId) ?? "bg-zinc-700"} h-full`}
                  style={{ width: `${pct}%` }}
                  title={`${clipById.get(seg.clipId)?.name ?? seg.clipId}: ${seg.start.toFixed(2)}–${seg.end.toFixed(2)}s`}
                />
              );
            })}
          </div>

          <ul className="mt-3 max-h-[260px] space-y-1.5 overflow-auto">
            {project.timeline.map((seg, idx) => {
              const clip = clipById.get(seg.clipId);
              return (
                <li
                  key={seg.id}
                  className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1.5 text-[11px] text-zinc-200"
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded ${
                      colorByClip.get(seg.clipId) ?? "bg-zinc-700"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {idx + 1}. {clip?.takeLabel ? `${clip.takeLabel} · ` : ""}
                    {clip?.name ?? seg.clipId}{" "}
                    <span className="text-zinc-500">
                      {seg.start.toFixed(2)}–{seg.end.toFixed(2)}s
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    max={2}
                    value={seg.transitionInSec ?? 0}
                    onChange={(e) =>
                      onUpdate(seg.id, {
                        transitionInSec: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-12 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-zinc-100"
                    title="Crossfade in seconds (from previous segment)"
                  />
                  <button
                    type="button"
                    onClick={() => onMove(seg.id, -1)}
                    disabled={idx === 0}
                    className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 disabled:opacity-30 hover:border-zinc-500"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(seg.id, 1)}
                    disabled={idx === project.timeline.length - 1}
                    className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 disabled:opacity-30 hover:border-zinc-500"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(seg.id)}
                    className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300 hover:border-rose-500 hover:text-rose-300"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function formatDur(s: number): string {
  const m = Math.floor(s / 60);
  const r = (s % 60).toFixed(1);
  return `${m}:${r.padStart(4, "0")}`;
}
