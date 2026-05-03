"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Clip,
  TimelineSegment,
  VideoProject,
  Word,
} from "@/lib/video-editor/types";
import {
  defaultKeptWordIndexes,
  defaultTimelineForClip,
  timelineDurationSec,
  wordIndexesToKeepWindows,
} from "@/lib/video-editor/cleaner";
import { Uploader } from "./uploader";
import { TranscriptPanel } from "./transcript-panel";
import { TimelineStrip } from "./timeline-strip";
import { PreviewPlayer } from "./preview-player";
import { RenderPanel } from "./render-panel";

interface Props {
  initialProject: VideoProject;
}

/**
 * Top-level editor. Owns project state, polls the server while clips are
 * being processed, and orchestrates the panes:
 *   - left:   uploader + clip list (with takes)
 *   - center: transcript editor for the focused clip
 *   - right:  preview player + timeline + render controls
 */
export function Editor({ initialProject }: Props) {
  const [project, setProject] = useState<VideoProject>(initialProject);
  const [focusClipId, setFocusClipId] = useState<string | null>(
    initialProject.clips[0]?.id ?? null,
  );
  const [keptIndexesByClip, setKeptIndexesByClip] = useState<
    Record<string, number[]>
  >(() => initialKept(initialProject));
  const [bridgeSec, setBridgeSec] = useState(0.18);
  const [autoDropFillers, setAutoDropFillers] = useState(true);
  const [autoDropRepeats, setAutoDropRepeats] = useState(true);
  const [extraFillersText, setExtraFillersText] = useState("");
  const [renderBusy, setRenderBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  // Poll while any clip is still processing.
  useEffect(() => {
    const stillProcessing = project.clips.some(
      (c) => c.status === "uploading" || c.status === "probing" || c.status === "transcribing",
    );
    if (!stillProcessing) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/video-editor/projects/${project.id}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.ok) {
        setProject((prev) => mergeProject(prev, json.data));
        setKeptIndexesByClip((prev) => fillMissingKept(prev, json.data));
      }
    }, 2500);
    return () => clearInterval(t);
  }, [project.id, project.clips]);

  const focusClip = useMemo(
    () => project.clips.find((c) => c.id === focusClipId) ?? null,
    [project.clips, focusClipId],
  );

  // Auto-focus first ready clip on first load if nothing focused.
  useEffect(() => {
    if (!focusClipId && project.clips.length > 0) {
      setFocusClipId(project.clips[0].id);
    }
  }, [focusClipId, project.clips]);

  /** Recompute kept indexes for the focused clip from defaults. */
  const recomputeKept = useCallback(
    (clip: Clip) => {
      if (!clip.transcript) return;
      const next = defaultKeptWordIndexes(clip.transcript, {
        dropFillers: autoDropFillers,
        dropRepeats: autoDropRepeats,
      });
      setKeptIndexesByClip((prev) => ({ ...prev, [clip.id]: next }));
    },
    [autoDropFillers, autoDropRepeats],
  );

  /** Toggle a single word's kept state. */
  const toggleWord = useCallback((clipId: string, idx: number) => {
    setKeptIndexesByClip((prev) => {
      const set = new Set(prev[clipId] ?? []);
      if (set.has(idx)) set.delete(idx);
      else set.add(idx);
      return { ...prev, [clipId]: [...set].sort((a, b) => a - b) };
    });
  }, []);

  /** Range select [a, b] inclusive. */
  const selectRange = useCallback(
    (clipId: string, a: number, b: number, mode: "keep" | "drop") => {
      setKeptIndexesByClip((prev) => {
        const set = new Set(prev[clipId] ?? []);
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        for (let i = lo; i <= hi; i += 1) {
          if (mode === "keep") set.add(i);
          else set.delete(i);
        }
        return { ...prev, [clipId]: [...set].sort((a, b) => a - b) };
      });
    },
    [],
  );

  /** Build segments for the focused clip from current kept set. */
  const focusSegments = useMemo<TimelineSegment[]>(() => {
    if (!focusClip) return [];
    if (!focusClip.transcript) {
      return defaultTimelineForClip(focusClip);
    }
    const kept = keptIndexesByClip[focusClip.id] ?? [];
    const windows = wordIndexesToKeepWindows(focusClip.transcript, kept, {
      bridgeSec,
      maxDurationSec: focusClip.durationSec,
    });
    return windows.map((w, idx) => ({
      id: `${focusClip.id}_w_${idx}_${Math.round(w.start * 1000)}`,
      clipId: focusClip.id,
      start: w.start,
      end: w.end,
    }));
  }, [focusClip, keptIndexesByClip, bridgeSec]);

  const persistTimeline = useCallback(
    async (next: TimelineSegment[]) => {
      setError(null);
      const res = await fetch(`/api/video-editor/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: next }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? "Failed to save timeline");
        return;
      }
      setProject((prev) => ({ ...prev, ...json.data }));
    },
    [project.id],
  );

  /** Add the current focus-clip selection as new segments to the timeline. */
  const appendFocusToTimeline = useCallback(async () => {
    if (!focusClip) return;
    const next = [...project.timeline, ...focusSegments];
    await persistTimeline(next);
  }, [focusClip, focusSegments, project.timeline, persistTimeline]);

  /** Replace timeline with the focus-clip selection. */
  const replaceTimelineWithFocus = useCallback(async () => {
    if (!focusClip) return;
    await persistTimeline(focusSegments);
  }, [focusClip, focusSegments, persistTimeline]);

  const moveSegment = useCallback(
    async (id: string, dir: -1 | 1) => {
      const idx = project.timeline.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const ni = idx + dir;
      if (ni < 0 || ni >= project.timeline.length) return;
      const next = [...project.timeline];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      await persistTimeline(next);
    },
    [project.timeline, persistTimeline],
  );

  const removeSegment = useCallback(
    async (id: string) => {
      const next = project.timeline.filter((s) => s.id !== id);
      await persistTimeline(next);
    },
    [project.timeline, persistTimeline],
  );

  const updateSegment = useCallback(
    async (id: string, patch: Partial<TimelineSegment>) => {
      const next = project.timeline.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      );
      await persistTimeline(next);
    },
    [project.timeline, persistTimeline],
  );

  const handleUploaded = useCallback(async (incoming: Clip[]) => {
    setProject((prev) => {
      const nextClips = [...prev.clips];
      for (const c of incoming) {
        const i = nextClips.findIndex((x) => x.id === c.id);
        if (i >= 0) nextClips[i] = c;
        else nextClips.push(c);
      }
      return { ...prev, clips: nextClips };
    });
    // Seed kept indexes for newly-added clips and pick first as focus.
    setKeptIndexesByClip((prev) => {
      const next = { ...prev };
      for (const c of incoming) {
        if (c.transcript && next[c.id] === undefined) {
          next[c.id] = defaultKeptWordIndexes(c.transcript, {
            dropFillers: autoDropFillers,
            dropRepeats: autoDropRepeats,
          });
        }
      }
      return next;
    });
    if (incoming[0] && !focusClipId) setFocusClipId(incoming[0].id);
    // Refetch authoritative project to pick up auto-appended timeline segs.
    const res = await fetch(`/api/video-editor/projects/${project.id}`, { cache: "no-store" });
    const json = await res.json();
    if (json.ok) {
      setProject((prev) => mergeProject(prev, json.data));
      setKeptIndexesByClip((prev) => fillMissingKept(prev, json.data));
    }
  }, [autoDropFillers, autoDropRepeats, focusClipId, project.id]);

  const applyExtraFillers = useCallback(async () => {
    if (!focusClip) return;
    const tokens = extraFillersText
      .split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const res = await fetch(
      `/api/video-editor/projects/${project.id}/clips/${focusClip.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraFillers: tokens }),
      },
    );
    const json = await res.json();
    if (json.ok) {
      setProject((prev) => mergeProject(prev, json.data));
      const updated = (json.data as VideoProject).clips.find((c) => c.id === focusClip.id);
      if (updated && updated.transcript) {
        const next = defaultKeptWordIndexes(updated.transcript, {
          dropFillers: autoDropFillers,
          dropRepeats: autoDropRepeats,
        });
        setKeptIndexesByClip((prev) => ({ ...prev, [focusClip.id]: next }));
      }
    }
  }, [focusClip, extraFillersText, project.id, autoDropFillers, autoDropRepeats]);

  const renderProject = useCallback(
    async (settings: {
      targetHeight?: 1080 | 720 | 480;
      defaultCrossfadeSec?: number;
      crf?: number;
    }) => {
      setRenderBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/video-editor/projects/${project.id}/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message ?? "Render failed");
        setProject((prev) => mergeProject(prev, json.data.project));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setRenderBusy(false);
      }
    },
    [project.id],
  );

  const deleteClip = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this clip and its transcript?")) return;
      const res = await fetch(
        `/api/video-editor/projects/${project.id}/clips/${id}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (json.ok) {
        setProject((prev) => mergeProject(prev, json.data));
        setKeptIndexesByClip((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (focusClipId === id) {
          setFocusClipId(json.data.clips[0]?.id ?? null);
        }
      }
    },
    [project.id, focusClipId],
  );

  const renameProject = useCallback(async () => {
    const name = window.prompt("Project name", project.name);
    if (!name || name === project.name) return;
    setRenaming(true);
    const res = await fetch(`/api/video-editor/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (json.ok) setProject((prev) => mergeProject(prev, json.data));
    setRenaming(false);
  }, [project.id, project.name]);

  const totalDur = timelineDurationSec(project.timeline);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <Link href="/video-editor" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← All projects
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-50">
            {project.name}
            <button
              type="button"
              onClick={renameProject}
              disabled={renaming}
              className="text-xs font-normal text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              rename
            </button>
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {project.clips.length} clip{project.clips.length === 1 ? "" : "s"} ·{" "}
            {project.timeline.length} timeline segment
            {project.timeline.length === 1 ? "" : "s"} · cut length{" "}
            {formatDuration(totalDur)}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-700/60 bg-rose-950/40 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        {/* Left: clips */}
        <div className="space-y-4">
          <Uploader projectId={project.id} onUploaded={handleUploaded} />
          <ClipList
            clips={project.clips}
            focusClipId={focusClipId}
            onFocus={setFocusClipId}
            onDelete={deleteClip}
            projectId={project.id}
          />
        </div>

        {/* Center: transcript */}
        <div>
          {focusClip ? (
            <TranscriptPanel
              clip={focusClip}
              keptIndexes={keptIndexesByClip[focusClip.id] ?? []}
              onToggle={(idx) => toggleWord(focusClip.id, idx)}
              onRange={(a, b, mode) => selectRange(focusClip.id, a, b, mode)}
              onResetDefaults={() => recomputeKept(focusClip)}
              onSelectAll={() =>
                setKeptIndexesByClip((prev) => ({
                  ...prev,
                  [focusClip.id]: focusClip.transcript
                    ? focusClip.transcript.words.map((_, i) => i)
                    : [],
                }))
              }
              onClearAll={() =>
                setKeptIndexesByClip((prev) => ({
                  ...prev,
                  [focusClip.id]: [],
                }))
              }
              autoDropFillers={autoDropFillers}
              setAutoDropFillers={(v) => {
                setAutoDropFillers(v);
                if (focusClip.transcript) {
                  const next = defaultKeptWordIndexes(focusClip.transcript, {
                    dropFillers: v,
                    dropRepeats: autoDropRepeats,
                  });
                  setKeptIndexesByClip((prev) => ({ ...prev, [focusClip.id]: next }));
                }
              }}
              autoDropRepeats={autoDropRepeats}
              setAutoDropRepeats={(v) => {
                setAutoDropRepeats(v);
                if (focusClip.transcript) {
                  const next = defaultKeptWordIndexes(focusClip.transcript, {
                    dropFillers: autoDropFillers,
                    dropRepeats: v,
                  });
                  setKeptIndexesByClip((prev) => ({ ...prev, [focusClip.id]: next }));
                }
              }}
              bridgeSec={bridgeSec}
              setBridgeSec={setBridgeSec}
              extraFillersText={extraFillersText}
              setExtraFillersText={setExtraFillersText}
              applyExtraFillers={applyExtraFillers}
              focusSegments={focusSegments}
              onAppendToTimeline={appendFocusToTimeline}
              onReplaceTimeline={replaceTimelineWithFocus}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
              Upload a clip to get started.
            </div>
          )}
        </div>

        {/* Right: preview + timeline + render */}
        <div className="space-y-4">
          <PreviewPlayer
            project={project}
            previewSegments={
              project.timeline.length > 0 ? project.timeline : focusSegments
            }
          />
          <TimelineStrip
            project={project}
            onMove={moveSegment}
            onRemove={removeSegment}
            onUpdate={updateSegment}
          />
          <RenderPanel
            project={project}
            busy={renderBusy}
            onRender={renderProject}
          />
        </div>
      </div>
    </div>
  );
}

function ClipList({
  clips,
  focusClipId,
  onFocus,
  onDelete,
  projectId,
}: {
  clips: Clip[];
  focusClipId: string | null;
  onFocus: (id: string) => void;
  onDelete: (id: string) => void;
  projectId: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-3">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Clips
      </p>
      <ul className="mt-2 space-y-2">
        {clips.length === 0 ? (
          <li className="text-xs text-zinc-500">No clips yet.</li>
        ) : null}
        {clips.map((c) => {
          const focused = c.id === focusClipId;
          const ready = c.status === "ready";
          return (
            <li
              key={c.id}
              className={`group flex items-stretch gap-2 rounded-lg border p-2 transition-colors ${
                focused
                  ? "border-zinc-500 bg-zinc-800/60"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              <button
                type="button"
                onClick={() => onFocus(c.id)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <PosterThumb projectId={projectId} clipId={c.id} ready={Boolean(c.posterPath)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-zinc-100">
                    {c.takeLabel ? `${c.takeLabel} · ` : ""}
                    {c.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">
                    {ready
                      ? `${formatDuration(c.durationSec ?? 0)} · ${c.transcript?.source === "openai-whisper" ? "transcript" : c.transcript?.source === "silence-fallback" ? "silence map" : "no transcript"}`
                      : c.status === "failed"
                      ? `failed: ${c.errorMessage ?? "unknown"}`
                      : `${c.status}…`}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="rounded px-1.5 text-[11px] text-zinc-500 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                aria-label="Delete clip"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PosterThumb({
  projectId,
  clipId,
  ready,
}: {
  projectId: string;
  clipId: string;
  ready: boolean;
}) {
  if (!ready) {
    return (
      <span className="block h-10 w-16 shrink-0 animate-pulse rounded bg-zinc-800" />
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`/api/video-editor/projects/${projectId}/clips/${clipId}/file?asset=poster`}
      alt=""
      className="h-10 w-16 shrink-0 rounded object-cover"
    />
  );
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function initialKept(p: VideoProject): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const c of p.clips) {
    if (c.transcript) {
      out[c.id] = defaultKeptWordIndexes(c.transcript, {
        dropFillers: true,
        dropRepeats: true,
      });
    }
  }
  return out;
}

function fillMissingKept(
  prev: Record<string, number[]>,
  next: VideoProject,
): Record<string, number[]> {
  const out = { ...prev };
  for (const c of next.clips) {
    if (out[c.id] === undefined && c.transcript) {
      out[c.id] = defaultKeptWordIndexes(c.transcript, {
        dropFillers: true,
        dropRepeats: true,
      });
    }
  }
  return out;
}

function mergeProject(prev: VideoProject, next: VideoProject): VideoProject {
  return { ...prev, ...next };
}

// Re-export types-touch to silence noisy unused-import warnings if linter
// happens to flag any.
export type _TouchedWord = Word;
