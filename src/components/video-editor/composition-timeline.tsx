"use client";

import { useCallback, useState, useRef } from "react";
import type { TimelineSegment, VideoFile } from "@/lib/video-editor/types";
import { formatTime, formatDuration } from "@/lib/video-editor/utils";

interface CompositionTimelineProps {
  segments: TimelineSegment[];
  videos: VideoFile[];
  onReorder: (segments: TimelineSegment[]) => void;
  onRemove: (id: string) => void;
  onPreview: (segment: TimelineSegment) => void;
}

export function CompositionTimeline({
  segments,
  videos,
  onReorder,
  onRemove,
  onPreview,
}: CompositionTimelineProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const sorted = [...segments].sort((a, b) => a.orderIndex - b.orderIndex);
  const totalDuration = sorted.reduce(
    (sum, s) => sum + (s.endTime - s.startTime),
    0
  );

  const getVideoLabel = (videoId: string) => {
    const idx = videos.findIndex((v) => v.id === videoId);
    return idx >= 0 ? `Video ${idx + 1}` : "Unknown";
  };

  const getVideoColor = (videoId: string) => {
    const idx = videos.findIndex((v) => v.id === videoId);
    return idx === 0
      ? "bg-violet-600/20 border-violet-500/40"
      : "bg-sky-600/20 border-sky-500/40";
  };

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragRef.current = idx;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      setOverIdx(idx);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIdx: number) => {
      e.preventDefault();
      const fromIdx = dragRef.current;
      if (fromIdx === null || fromIdx === dropIdx) {
        setDragIdx(null);
        setOverIdx(null);
        return;
      }

      const newSorted = [...sorted];
      const [moved] = newSorted.splice(fromIdx, 1);
      newSorted.splice(dropIdx, 0, moved);

      const reindexed = newSorted.map((s, i) => ({ ...s, orderIndex: i }));
      onReorder(reindexed);

      setDragIdx(null);
      setOverIdx(null);
    },
    [sorted, onReorder]
  );

  const moveSegment = useCallback(
    (idx: number, direction: -1 | 1) => {
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= sorted.length) return;

      const newSorted = [...sorted];
      [newSorted[idx], newSorted[newIdx]] = [newSorted[newIdx], newSorted[idx]];
      const reindexed = newSorted.map((s, i) => ({ ...s, orderIndex: i }));
      onReorder(reindexed);
    },
    [sorted, onReorder]
  );

  if (!sorted.length) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700/50 bg-zinc-900/40 p-8 text-center">
        <p className="text-sm text-zinc-500">
          No segments in the composition timeline yet.
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Select segments from the source videos above, then click &quot;Add to
          Timeline&quot; to build your edit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          {sorted.length} segment{sorted.length !== 1 ? "s" : ""} ·{" "}
          {formatDuration(totalDuration)} total
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2">
        {sorted.map((seg, idx) => {
          const segDuration = seg.endTime - seg.startTime;
          const widthPercent = Math.max(
            (segDuration / Math.max(totalDuration, 1)) * 100,
            8
          );

          return (
            <div
              key={seg.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={() => {
                setDragIdx(null);
                setOverIdx(null);
              }}
              className={`group relative flex-shrink-0 cursor-grab rounded border p-2 transition-all ${getVideoColor(
                seg.videoId
              )} ${dragIdx === idx ? "opacity-40" : ""} ${
                overIdx === idx && dragIdx !== idx
                  ? "ring-2 ring-violet-400"
                  : ""
              }`}
              style={{ width: `${widthPercent}%`, minWidth: "100px" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-300">
                  {seg.label || `Segment ${idx + 1}`}
                </span>
                <span className="rounded bg-zinc-800/80 px-1 text-[9px] text-zinc-500">
                  {getVideoLabel(seg.videoId)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">
                {formatTime(seg.startTime)} → {formatTime(seg.endTime)}
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-600">
                {formatDuration(segDuration)}
              </div>

              <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => moveSegment(idx, -1)}
                  disabled={idx === 0}
                  className="rounded bg-zinc-800 p-0.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                  title="Move left"
                >
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => onPreview(seg)}
                  className="rounded bg-zinc-800 p-0.5 text-zinc-400 hover:text-zinc-200"
                  title="Preview"
                >
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => onRemove(seg.id)}
                  className="rounded bg-zinc-800 p-0.5 text-red-400 hover:text-red-300"
                  title="Remove"
                >
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => moveSegment(idx, 1)}
                  disabled={idx === sorted.length - 1}
                  className="rounded bg-zinc-800 p-0.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                  title="Move right"
                >
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
