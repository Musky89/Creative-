"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Clip, TimelineSegment, Word } from "@/lib/video-editor/types";
import { timelineDurationSec } from "@/lib/video-editor/cleaner";

interface Props {
  clip: Clip;
  keptIndexes: number[];
  onToggle: (idx: number) => void;
  onRange: (a: number, b: number, mode: "keep" | "drop") => void;
  onResetDefaults: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  autoDropFillers: boolean;
  setAutoDropFillers: (v: boolean) => void;
  autoDropRepeats: boolean;
  setAutoDropRepeats: (v: boolean) => void;
  bridgeSec: number;
  setBridgeSec: (v: number) => void;
  extraFillersText: string;
  setExtraFillersText: (v: string) => void;
  applyExtraFillers: () => Promise<void> | void;
  focusSegments: TimelineSegment[];
  onAppendToTimeline: () => void;
  onReplaceTimeline: () => void;
}

/**
 * Transcript editor: each word is a button. Click to toggle keep/drop. Shift-
 * click to range-select. Flagged words (filler / repeat) are visually muted
 * by default and excluded from the kept set.
 *
 * Also includes:
 *   - clip-scoped video preview (proxy mp4)
 *   - quick stats
 *   - bulk actions (reset, select all, clear)
 *   - extra fillers list
 *   - "send to timeline" actions (append / replace)
 */
export function TranscriptPanel(props: Props) {
  const {
    clip,
    keptIndexes,
    onToggle,
    onRange,
    onResetDefaults,
    onSelectAll,
    onClearAll,
    autoDropFillers,
    setAutoDropFillers,
    autoDropRepeats,
    setAutoDropRepeats,
    bridgeSec,
    setBridgeSec,
    extraFillersText,
    setExtraFillersText,
    applyExtraFillers,
    focusSegments,
    onAppendToTimeline,
    onReplaceTimeline,
  } = props;

  const keptSet = useMemo(() => new Set(keptIndexes), [keptIndexes]);
  const lastClickRef = useRef<{ idx: number; mode: "keep" | "drop" } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const selectedDuration = useMemo(
    () => timelineDurationSec(focusSegments),
    [focusSegments],
  );

  const wordsBySegment = clip.transcript?.segments ?? [];

  const handleWordClick = useCallback(
    (e: React.MouseEvent, idx: number) => {
      const wasKept = keptSet.has(idx);
      const mode: "keep" | "drop" = wasKept ? "drop" : "keep";
      if (e.shiftKey && lastClickRef.current) {
        onRange(lastClickRef.current.idx, idx, lastClickRef.current.mode);
      } else {
        onToggle(idx);
      }
      lastClickRef.current = { idx, mode };
    },
    [keptSet, onRange, onToggle],
  );

  const playFromWord = useCallback(
    (w: Word) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, w.start - 0.05);
      void v.play();
    },
    [],
  );

  const transcript = clip.transcript;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Transcript editor
          </p>
          <p className="mt-1 text-sm text-zinc-200">
            {clip.takeLabel ? `${clip.takeLabel} · ` : ""}
            {clip.name}
            <span className="ml-2 text-xs text-zinc-500">
              {transcript ? transcript.source.replace("openai-", "") : "no transcript"}
            </span>
          </p>
        </div>
        <div className="text-[11px] text-zinc-500">
          {transcript
            ? `${keptIndexes.length}/${transcript.words.length} words kept · ${formatDuration(selectedDuration)} selected`
            : "—"}
        </div>
      </div>

      {clip.proxyPath ? (
        <video
          ref={videoRef}
          controls
          preload="metadata"
          poster={`/api/video-editor/projects/${clip.projectId}/clips/${clip.id}/file?asset=poster`}
          src={`/api/video-editor/projects/${clip.projectId}/clips/${clip.id}/file?asset=proxy`}
          className="aspect-video w-full rounded-lg bg-black"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-zinc-950 text-xs text-zinc-500">
          {clip.status === "failed"
            ? `Processing failed: ${clip.errorMessage ?? "unknown"}`
            : "Building proxy preview…"}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={onResetDefaults}
          className="rounded border border-zinc-700 px-2 py-1 text-zinc-200 hover:border-zinc-500"
        >
          Reset to clean defaults
        </button>
        <button
          type="button"
          onClick={onSelectAll}
          className="rounded border border-zinc-700 px-2 py-1 text-zinc-200 hover:border-zinc-500"
        >
          Keep all
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="rounded border border-zinc-700 px-2 py-1 text-zinc-200 hover:border-zinc-500"
        >
          Drop all
        </button>
        <span className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={autoDropFillers}
              onChange={(e) => setAutoDropFillers(e.target.checked)}
            />
            drop fillers
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={autoDropRepeats}
              onChange={(e) => setAutoDropRepeats(e.target.checked)}
            />
            drop repeats
          </label>
          <label className="flex items-center gap-1">
            bridge gaps ≤
            <input
              type="number"
              min={0}
              max={2}
              step={0.05}
              value={bridgeSec}
              onChange={(e) => setBridgeSec(parseFloat(e.target.value) || 0)}
              className="w-14 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-zinc-100"
            />
            s
          </label>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input
          type="text"
          value={extraFillersText}
          onChange={(e) => setExtraFillersText(e.target.value)}
          placeholder="Extra filler words (comma-separated)"
          className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void applyExtraFillers()}
          className="rounded border border-zinc-700 px-2 py-1 text-zinc-200 hover:border-zinc-500"
        >
          Re-flag
        </button>
      </div>

      <div className="max-h-[360px] overflow-auto rounded-lg bg-zinc-950/60 p-3 text-[13px] leading-7">
        {!transcript ? (
          <p className="text-xs text-zinc-500">
            {clip.status === "transcribing"
              ? "Transcribing…"
              : "Transcript not available."}
          </p>
        ) : (
          wordsBySegment.map((seg) => (
            <p key={seg.id} className="mb-2">
              {seg.words.map((w) => {
                // Find this word's index in the flat array.
                const flatIdx = transcript.words.indexOf(w);
                const kept = keptSet.has(flatIdx);
                return (
                  <Token
                    key={`${seg.id}-${flatIdx}`}
                    w={w}
                    kept={kept}
                    isHover={hoverIdx === flatIdx}
                    onClick={(e) => handleWordClick(e, flatIdx)}
                    onDoubleClick={() => playFromWord(w)}
                    onMouseEnter={() => setHoverIdx(flatIdx)}
                    onMouseLeave={() =>
                      setHoverIdx((cur) => (cur === flatIdx ? null : cur))
                    }
                  />
                );
              })}
            </p>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-[11px] text-zinc-500">
          Click word to drop / restore · Shift-click for range · Double-click to
          play from here
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAppendToTimeline}
            disabled={focusSegments.length === 0}
            className="rounded border border-zinc-700 px-2 py-1 text-zinc-200 hover:border-zinc-500 disabled:opacity-50"
          >
            Append to timeline
          </button>
          <button
            type="button"
            onClick={onReplaceTimeline}
            disabled={focusSegments.length === 0}
            className="rounded bg-zinc-100 px-2 py-1 font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
          >
            Use as timeline
          </button>
        </div>
      </div>
    </div>
  );
}

function Token({
  w,
  kept,
  isHover,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
}: {
  w: Word;
  kept: boolean;
  isHover: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const flagCls =
    w.flag === "filler"
      ? "underline decoration-amber-400/70 decoration-dotted"
      : w.flag === "repeat"
      ? "underline decoration-violet-400/70 decoration-dotted"
      : "";
  const stateCls = kept
    ? "text-zinc-100"
    : "text-zinc-600 line-through decoration-zinc-700";
  const hoverCls = isHover ? "bg-zinc-800/80 rounded" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={`${w.start.toFixed(2)}–${w.end.toFixed(2)}s${w.flag ? ` · ${w.flag}` : ""}`}
      className={`mr-1 inline px-0.5 transition-colors ${flagCls} ${stateCls} ${hoverCls}`}
    >
      {w.text}
    </button>
  );
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec * 10) / 10);
  const m = Math.floor(s / 60);
  const r = (s % 60).toFixed(1);
  return `${m}:${r.padStart(4, "0")}`;
}
