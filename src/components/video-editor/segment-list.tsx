"use client";

import type { Segment, VideoFile } from "@/lib/video-editor/types";
import { formatTime, formatDuration } from "@/lib/video-editor/utils";

interface SegmentListProps {
  segments: Segment[];
  videos: VideoFile[];
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onSeekTo: (videoId: string, time: number) => void;
  onLabelChange: (id: string, label: string) => void;
}

export function SegmentList({
  segments,
  videos,
  onToggleSelect,
  onRemove,
  onSeekTo,
  onLabelChange,
}: SegmentListProps) {
  const getVideoLabel = (videoId: string) => {
    const idx = videos.findIndex((v) => v.id === videoId);
    return idx >= 0 ? `Video ${idx + 1}` : "Unknown";
  };

  const getVideoColor = (videoId: string) => {
    const idx = videos.findIndex((v) => v.id === videoId);
    return idx === 0 ? "text-violet-400" : "text-sky-400";
  };

  if (!segments.length) {
    return (
      <p className="py-4 text-center text-xs text-zinc-600">
        No segments created yet. Shift+drag on the waveform timeline to create
        segments, or use the silence detection tool.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {segments.map((seg) => {
        const duration = seg.endTime - seg.startTime;
        return (
          <div
            key={seg.id}
            className={`group flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
              seg.isSelected
                ? "border-violet-500/30 bg-violet-950/20"
                : "border-zinc-800/50 bg-zinc-900/40 hover:border-zinc-700/50"
            }`}
          >
            <button
              onClick={() => onToggleSelect(seg.id)}
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                seg.isSelected
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-zinc-600 text-transparent hover:border-zinc-500"
              }`}
            >
              ✓
            </button>

            <input
              type="text"
              value={seg.label}
              onChange={(e) => onLabelChange(seg.id, e.target.value)}
              className="w-28 rounded bg-transparent px-1 text-xs text-zinc-300 outline-none focus:bg-zinc-800"
              placeholder="Label..."
            />

            <span className={`text-[10px] font-medium ${getVideoColor(seg.videoId)}`}>
              {getVideoLabel(seg.videoId)}
            </span>

            <button
              onClick={() => onSeekTo(seg.videoId, seg.startTime)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              {formatTime(seg.startTime)} → {formatTime(seg.endTime)}
            </button>

            <span className="text-[10px] text-zinc-600">
              {formatDuration(duration)}
            </span>

            <div className="flex-1" />

            <button
              onClick={() => onRemove(seg.id)}
              className="rounded p-0.5 text-zinc-600 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
            >
              <svg
                className="h-3.5 w-3.5"
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
          </div>
        );
      })}
    </div>
  );
}
