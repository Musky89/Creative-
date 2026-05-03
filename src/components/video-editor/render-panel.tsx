"use client";

import { useState } from "react";
import type { VideoProject } from "@/lib/video-editor/types";

interface Props {
  project: VideoProject;
  busy: boolean;
  onRender: (settings: {
    targetHeight?: 1080 | 720 | 480;
    defaultCrossfadeSec?: number;
    crf?: number;
  }) => Promise<void>;
}

export function RenderPanel({ project, busy, onRender }: Props) {
  const [height, setHeight] = useState<1080 | 720 | 480>(1080);
  const [crf, setCrf] = useState(20);
  const [crossfade, setCrossfade] = useState(0);
  const renders = [...project.renders].reverse();
  const canRender = project.timeline.length > 0 && !busy;

  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-3">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Render
      </p>
      <div className="mt-3 grid gap-2 text-xs">
        <label className="flex items-center justify-between gap-2 text-zinc-300">
          Resolution
          <select
            value={height}
            onChange={(e) =>
              setHeight(parseInt(e.target.value, 10) as 1080 | 720 | 480)
            }
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
          >
            <option value={1080}>1080p</option>
            <option value={720}>720p</option>
            <option value={480}>480p</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2 text-zinc-300">
          Quality (CRF)
          <input
            type="number"
            min={14}
            max={28}
            value={crf}
            onChange={(e) => setCrf(parseInt(e.target.value, 10) || 20)}
            className="w-16 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-zinc-300">
          Default crossfade (s)
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={crossfade}
            onChange={(e) =>
              setCrossfade(Math.max(0, parseFloat(e.target.value) || 0))
            }
            className="w-16 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() =>
          onRender({
            targetHeight: height,
            crf,
            defaultCrossfadeSec: crossfade,
          })
        }
        disabled={!canRender}
        className="mt-3 w-full rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
      >
        {busy ? "Rendering…" : project.timeline.length === 0 ? "Build a timeline first" : "Render final cut"}
      </button>

      {renders.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
            Renders
          </p>
          <ul className="space-y-1.5">
            {renders.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1.5 text-[11px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-zinc-200">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                  <span className="text-zinc-500">
                    {r.settings.targetHeight ?? 1080}p · CRF {r.settings.crf ?? 20}
                  </span>
                </span>
                <a
                  href={`/api/video-editor/projects/${project.id}/renders/${r.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-200 hover:border-zinc-500"
                >
                  Preview
                </a>
                <a
                  href={`/api/video-editor/projects/${project.id}/renders/${r.id}?download=1`}
                  className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-950 hover:bg-white"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
