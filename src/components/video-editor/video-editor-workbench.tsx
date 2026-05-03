"use client";

import { useMemo, useRef, useState } from "react";
import {
  type EditDecisionList,
  type EditSegment,
  type VideoSourceId,
} from "@/lib/video-editor/contracts";

type SourceState = {
  file: File | null;
  url: string | null;
  duration: number;
};

type TranscriptLine = {
  start: number;
  end: number;
  text: string;
};

const DEFAULT_FILLERS = [
  "um",
  "uh",
  "erm",
  "like",
  "you know",
  "sort of",
  "kind of",
  "basically",
  "literally",
  "random",
];

const initialSources: Record<VideoSourceId, SourceState> = {
  a: { file: null, url: null, duration: 0 },
  b: { file: null, url: null, duration: 0 },
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00.0";
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${minutes}:${String(wholeSeconds).padStart(2, "0")}.${tenths}`;
}

function parseTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function parseTranscript(raw: string): TranscriptLine[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?|\d+(?:\.\d+)?)(?:\])?\s*(.*)$/i,
      );
      if (!match) return null;
      const start = parseTime(match[1]);
      const end = parseTime(match[2]);
      if (start === null || end === null || end <= start) return null;
      return { start, end, text: match[3].trim() };
    })
    .filter((line): line is TranscriptLine => Boolean(line));
}

function includesFiller(text: string, fillers: string[]) {
  const normalized = text.toLowerCase();
  return fillers.some((filler) => {
    const escaped = filler.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return escaped ? new RegExp(`\\b${escaped}\\b`, "i").test(normalized) : false;
  });
}

function mergeRanges(ranges: Array<{ start: number; end: number }>, maxGap = 0.25) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && range.start <= last.end + maxGap) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function invertRanges(
  removeRanges: Array<{ start: number; end: number }>,
  duration: number,
): Array<{ start: number; end: number }> {
  const keep: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const range of mergeRanges(removeRanges)) {
    if (range.start > cursor) keep.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (duration > cursor) keep.push({ start: cursor, end: duration });
  return keep.filter((range) => range.end - range.start >= 0.4);
}

function sourceLabel(sourceId: VideoSourceId) {
  return sourceId === "a" ? "Take A" : "Take B";
}

export function VideoEditorWorkbench() {
  const [projectName, setProjectName] = useState("founder-video-final-cut");
  const [sources, setSources] = useState(initialSources);
  const [activeSource, setActiveSource] = useState<VideoSourceId>("a");
  const [segments, setSegments] = useState<EditSegment[]>([]);
  const [transcript, setTranscript] = useState("");
  const [fillerText, setFillerText] = useState(DEFAULT_FILLERS.join(", "));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const videoRefs = {
    a: useRef<HTMLVideoElement | null>(null),
    b: useRef<HTMLVideoElement | null>(null),
  };

  const totalRuntime = segments.reduce((sum, segment) => sum + segment.end - segment.start, 0);
  const parsedTranscript = useMemo(() => parseTranscript(transcript), [transcript]);
  const fillers = useMemo(
    () =>
      fillerText
        .split(",")
        .map((word) => word.trim().toLowerCase())
        .filter(Boolean),
    [fillerText],
  );
  const suggestedRemovals = useMemo(
    () =>
      parsedTranscript.filter((line) => includesFiller(line.text, fillers)),
    [fillers, parsedTranscript],
  );
  const editPlan: EditDecisionList = {
    projectName,
    segments,
  };

  function setSourceFile(sourceId: VideoSourceId, file: File | null) {
    setError(null);
    setDownloadUrl(null);
    setSources((current) => {
      if (current[sourceId].url) URL.revokeObjectURL(current[sourceId].url);
      return {
        ...current,
        [sourceId]: {
          file,
          url: file ? URL.createObjectURL(file) : null,
          duration: 0,
        },
      };
    });
  }

  function addSegment(sourceId: VideoSourceId, start = 0, end = sources[sourceId].duration) {
    const safeEnd = Math.max(start + 0.5, end || start + 8);
    setSegments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sourceId,
        start: Number(start.toFixed(2)),
        end: Number(safeEnd.toFixed(2)),
        label: `${sourceLabel(sourceId)} ${current.length + 1}`,
      },
    ]);
  }

  function captureCurrentWindow(sourceId: VideoSourceId) {
    const currentTime = videoRefs[sourceId].current?.currentTime ?? 0;
    addSegment(
      sourceId,
      Math.max(0, currentTime - 2),
      Math.min(sources[sourceId].duration || currentTime + 6, currentTime + 6),
    );
  }

  function updateSegment(id: string, patch: Partial<EditSegment>) {
    setSegments((current) =>
      current.map((segment) => (segment.id === id ? { ...segment, ...patch } : segment)),
    );
  }

  function moveSegment(id: string, direction: -1 | 1) {
    setSegments((current) => {
      const index = current.findIndex((segment) => segment.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  function removeSegment(id: string) {
    setSegments((current) => current.filter((segment) => segment.id !== id));
  }

  function buildDraft(sourceId: VideoSourceId) {
    const duration = sources[sourceId].duration;
    if (!duration) {
      setError(`Upload ${sourceLabel(sourceId)} before building a draft.`);
      return;
    }
    const removalRanges = suggestedRemovals.map(({ start, end }) => ({
      start: Math.max(0, start - 0.12),
      end: Math.min(duration, end + 0.12),
    }));
    const keepRanges = invertRanges(removalRanges, duration);
    setSegments(
      keepRanges.map((range, index) => ({
        id: crypto.randomUUID(),
        sourceId,
        start: Number(range.start.toFixed(2)),
        end: Number(range.end.toFixed(2)),
        label: `Clean pass ${index + 1}`,
      })),
    );
    setActiveSource(sourceId);
    setError(null);
  }

  function seekTo(segment: EditSegment) {
    const node = videoRefs[segment.sourceId].current;
    if (!node) return;
    setActiveSource(segment.sourceId);
    node.currentTime = segment.start;
    void node.play();
  }

  async function exportVideo() {
    setError(null);
    setDownloadUrl(null);
    if (!sources.a.file || !sources.b.file) {
      setError("Upload both videos before rendering.");
      return;
    }
    const validSegments = segments.filter((segment) => segment.end > segment.start);
    if (validSegments.length === 0) {
      setError("Add at least one valid timeline segment.");
      return;
    }
    const formData = new FormData();
    formData.set("videoA", sources.a.file);
    formData.set("videoB", sources.b.file);
    formData.set("plan", JSON.stringify({ ...editPlan, segments: validSegments }));

    setExporting(true);
    try {
      const response = await fetch("/api/video-editor/render", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Render failed.");
      }
      const blob = await response.blob();
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : String(exportError));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Project name
              </label>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 sm:w-80"
              />
            </div>
            <div className="text-right text-xs text-zinc-500">
              <p>{segments.length} timeline clips</p>
              <p>{formatTime(totalRuntime)} estimated runtime</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(["a", "b"] as VideoSourceId[]).map((sourceId) => (
              <div
                key={sourceId}
                className={`rounded-xl border p-3 ${
                  activeSource === sourceId
                    ? "border-emerald-500/45 bg-emerald-950/15"
                    : "border-zinc-800 bg-zinc-950/60"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {sourceLabel(sourceId)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {sources[sourceId].file?.name ?? "Upload a video take"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSource(sourceId)}
                    className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                  >
                    Active
                  </button>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => setSourceFile(sourceId, event.target.files?.[0] ?? null)}
                  className="mb-3 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-100 hover:file:bg-zinc-600"
                />
                {sources[sourceId].url ? (
                  <video
                    ref={videoRefs[sourceId]}
                    src={sources[sourceId].url ?? undefined}
                    controls
                    onLoadedMetadata={(event) => {
                      const duration = event.currentTarget.duration;
                      setSources((current) => ({
                        ...current,
                        [sourceId]: { ...current[sourceId], duration },
                      }));
                    }}
                    className="aspect-video w-full rounded-lg bg-black object-contain"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-black/30 text-xs text-zinc-600">
                    No source loaded
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addSegment(sourceId)}
                    className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-white"
                  >
                    Add full take
                  </button>
                  <button
                    type="button"
                    onClick={() => captureCurrentWindow(sourceId)}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500"
                  >
                    Add 8s around playhead
                  </button>
                  <span className="self-center text-xs text-zinc-500">
                    {formatTime(sources[sourceId].duration)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Smart cut assistant
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Paste transcript lines as <span className="font-mono">00:01-00:04 text</span>.
            Lines containing filler words become removal ranges.
          </p>
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder={"00:00-00:05 intro\n00:05-00:08 um let me restart\n00:08-00:18 final take"}
            className="mt-4 min-h-40 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:border-zinc-500"
          />
          <label className="mt-4 block text-xs font-medium text-zinc-400">
            Remove words / phrases
          </label>
          <input
            value={fillerText}
            onChange={(event) => setFillerText(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-zinc-500"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => buildDraft(activeSource)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Build clean draft from active take
            </button>
            <span className="rounded-md border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-xs font-medium text-amber-200">
              Detected removals: {suggestedRemovals.length}
            </span>
          </div>
          {suggestedRemovals.length > 0 ? (
            <ul className="mt-4 max-h-32 space-y-1 overflow-auto text-xs text-zinc-400">
              {suggestedRemovals.slice(0, 8).map((line, index) => (
                <li key={`${line.start}-${index}`} className="rounded bg-zinc-950/70 px-2 py-1">
                  <span className="font-mono text-amber-300">
                    {formatTime(line.start)}-{formatTime(line.end)}
                  </span>{" "}
                  {line.text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Edit timeline
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Reorder takes, tighten in/out points, and jump back to source preview.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSegments([])}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
          >
            Clear timeline
          </button>
        </div>
        {segments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-center text-sm text-zinc-500">
            Add a full take, capture a playhead window, or build a clean draft.
          </div>
        ) : (
          <div className="space-y-3">
            {segments.map((segment, index) => {
              const duration = Math.max(0, segment.end - segment.start);
              const sourceDuration = sources[segment.sourceId].duration || 1;
              return (
                <div
                  key={segment.id}
                  className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 lg:grid-cols-[1fr_120px_120px_180px]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400">
                        {index + 1}
                      </span>
                      <select
                        value={segment.sourceId}
                        onChange={(event) =>
                          updateSegment(segment.id, {
                            sourceId: event.target.value as VideoSourceId,
                          })
                        }
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                      >
                        <option value="a">Take A</option>
                        <option value="b">Take B</option>
                      </select>
                      <input
                        value={segment.label ?? ""}
                        onChange={(event) =>
                          updateSegment(segment.id, { label: event.target.value })
                        }
                        className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                      />
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-emerald-500/80"
                        style={{
                          marginLeft: `${Math.min(100, (segment.start / sourceDuration) * 100)}%`,
                          width: `${Math.min(
                            100,
                            Math.max(1, (duration / sourceDuration) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {sourceLabel(segment.sourceId)} · {formatTime(duration)} clip
                    </p>
                  </div>
                  <label className="text-xs text-zinc-500">
                    Start
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={segment.start}
                      onChange={(event) =>
                        updateSegment(segment.id, { start: Number(event.target.value) })
                      }
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                    />
                    <span className="mt-1 block font-mono text-[10px] text-zinc-600">
                      {formatTime(segment.start)}
                    </span>
                  </label>
                  <label className="text-xs text-zinc-500">
                    End
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={segment.end}
                      onChange={(event) =>
                        updateSegment(segment.id, { end: Number(event.target.value) })
                      }
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                    />
                    <span className="mt-1 block font-mono text-[10px] text-zinc-600">
                      {formatTime(segment.end)}
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => seekTo(segment)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSegment(segment.id, -1)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSegment(segment.id, 1)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSegment(segment.id)}
                      className="rounded-md border border-red-900/70 px-2 py-1 text-xs text-red-200 hover:border-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Edit decision package
          </p>
          <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-black/40 p-3 font-mono text-xs text-zinc-400">
            {JSON.stringify(editPlan, null, 2)}
          </pre>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Render final cut
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Server render uses ffmpeg to trim each segment, normalize audio, standardize
            1080p/30fps, and concatenate the final MP4.
          </p>
          {error ? (
            <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-100">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={exportVideo}
            disabled={exporting}
            className="mt-4 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Rendering final cut..." : "Render downloadable MP4"}
          </button>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={`${projectName || "final-cut"}.mp4`}
              className="mt-3 block rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-center text-sm font-medium text-emerald-100 hover:border-emerald-400"
            >
              Download final cut
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
