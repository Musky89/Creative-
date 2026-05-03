"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import type { Segment, SilenceRegion } from "@/lib/video-editor/types";
import { formatTime, clamp } from "@/lib/video-editor/utils";

interface WaveformTimelineProps {
  videoId: string;
  duration: number;
  waveformData: number[];
  silenceRegions: SilenceRegion[];
  segments: Segment[];
  currentTime: number;
  onSeek: (time: number) => void;
  onSegmentCreate: (start: number, end: number) => void;
  onSegmentUpdate: (id: string, start: number, end: number) => void;
  onSegmentRemove: (id: string) => void;
  onSegmentToggleSelect: (id: string) => void;
}

export function WaveformTimeline({
  duration,
  waveformData,
  silenceRegions,
  segments,
  currentTime,
  onSeek,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentRemove,
  onSegmentToggleSelect,
}: WaveformTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<null | {
    type: "seek" | "create" | "resize-start" | "resize-end";
    segId?: string;
    startX?: number;
    startTime?: number;
  }>(null);
  const [createRange, setCreateRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);

  const timeToX = useCallback(
    (time: number) => {
      if (!containerRef.current) return 0;
      const width = containerRef.current.clientWidth;
      return ((time / duration) * width * zoom) - scrollOffset;
    },
    [duration, zoom, scrollOffset]
  );

  const xToTime = useCallback(
    (x: number) => {
      if (!containerRef.current) return 0;
      const width = containerRef.current.clientWidth;
      return clamp(((x + scrollOffset) / (width * zoom)) * duration, 0, duration);
    },
    [duration, zoom, scrollOffset]
  );

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !waveformData.length) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = rect.width * zoom;
    const displayHeight = 100;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    for (const region of silenceRegions) {
      const x1 = (region.start / duration) * displayWidth;
      const x2 = (region.end / duration) * displayWidth;
      ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
      ctx.fillRect(x1, 0, x2 - x1, displayHeight);
    }

    for (const seg of segments) {
      const x1 = (seg.startTime / duration) * displayWidth;
      const x2 = (seg.endTime / duration) * displayWidth;
      ctx.fillStyle = seg.isSelected
        ? "rgba(139, 92, 246, 0.15)"
        : "rgba(113, 113, 122, 0.08)";
      ctx.fillRect(x1, 0, x2 - x1, displayHeight);

      ctx.strokeStyle = seg.isSelected
        ? "rgba(139, 92, 246, 0.6)"
        : "rgba(113, 113, 122, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, 0, x2 - x1, displayHeight);
    }

    if (createRange) {
      const x1 = (createRange.start / duration) * displayWidth;
      const x2 = (createRange.end / duration) * displayWidth;
      ctx.fillStyle = "rgba(139, 92, 246, 0.2)";
      ctx.fillRect(
        Math.min(x1, x2),
        0,
        Math.abs(x2 - x1),
        displayHeight
      );
    }

    const barWidth = displayWidth / waveformData.length;
    const midY = displayHeight / 2;

    for (let i = 0; i < waveformData.length; i++) {
      const x = i * barWidth;
      const amplitude = waveformData[i] * midY * 0.85;

      const time = (i / waveformData.length) * duration;
      const inSilence = silenceRegions.some(
        (r) => time >= r.start && time <= r.end
      );
      const inSegment = segments.find(
        (s) => time >= s.startTime && time <= s.endTime
      );

      if (inSilence) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
      } else if (inSegment?.isSelected) {
        ctx.fillStyle = "rgba(167, 139, 250, 0.9)";
      } else if (inSegment) {
        ctx.fillStyle = "rgba(161, 161, 170, 0.6)";
      } else {
        ctx.fillStyle = "rgba(161, 161, 170, 0.35)";
      }

      ctx.fillRect(x, midY - amplitude, Math.max(barWidth - 0.5, 1), amplitude * 2);
    }

    const playX = (currentTime / duration) * displayWidth;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, displayHeight);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(playX - 5, 0);
    ctx.lineTo(playX + 5, 0);
    ctx.lineTo(playX, 7);
    ctx.closePath();
    ctx.fill();
  }, [waveformData, silenceRegions, segments, currentTime, duration, createRange, zoom]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left + scrollOffset;
      const time = xToTime(e.clientX - rect.left);

      const hitSegEdge = segments.find((s) => {
        const sx = timeToX(s.startTime) + scrollOffset;
        const ex = timeToX(s.endTime) + scrollOffset;
        return Math.abs(x - sx) < 6 || Math.abs(x - ex) < 6;
      });

      if (hitSegEdge) {
        const sx = timeToX(hitSegEdge.startTime) + scrollOffset;
        const ex = timeToX(hitSegEdge.endTime) + scrollOffset;
        const isStart = Math.abs(x - sx) < Math.abs(x - ex);
        setDragging({
          type: isStart ? "resize-start" : "resize-end",
          segId: hitSegEdge.id,
        });
        return;
      }

      if (e.shiftKey) {
        setDragging({ type: "create", startX: x, startTime: time });
        setCreateRange({ start: time, end: time });
      } else {
        onSeek(time);
        setDragging({ type: "seek" });
      }
    },
    [segments, timeToX, xToTime, onSeek, scrollOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const time = xToTime(e.clientX - rect.left);

      if (dragging.type === "seek") {
        onSeek(time);
      } else if (dragging.type === "create" && dragging.startTime != null) {
        setCreateRange({
          start: Math.min(dragging.startTime, time),
          end: Math.max(dragging.startTime, time),
        });
      } else if (
        (dragging.type === "resize-start" || dragging.type === "resize-end") &&
        dragging.segId
      ) {
        const seg = segments.find((s) => s.id === dragging.segId);
        if (seg) {
          if (dragging.type === "resize-start") {
            onSegmentUpdate(seg.id, Math.min(time, seg.endTime - 0.1), seg.endTime);
          } else {
            onSegmentUpdate(seg.id, seg.startTime, Math.max(time, seg.startTime + 0.1));
          }
        }
      }
    },
    [dragging, xToTime, onSeek, segments, onSegmentUpdate]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging?.type === "create" && createRange) {
      const minDur = 0.2;
      if (createRange.end - createRange.start >= minDur) {
        onSegmentCreate(createRange.start, createRange.end);
      }
      setCreateRange(null);
    }
    setDragging(null);
  }, [dragging, createRange, onSegmentCreate]);

  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const interval = duration > 300 ? 30 : duration > 60 ? 10 : 5;
    for (let t = 0; t <= duration; t += interval) {
      markers.push(t);
    }
    return markers;
  }, [duration]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <span>
            Shift+drag to create segment · Click to seek · Drag edges to resize
          </span>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-red-500/40" />
            <span>Silence</span>
            <span className="ml-2 inline-block h-2 w-2 rounded-sm bg-violet-500/60" />
            <span>Selected</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
            className="rounded bg-zinc-800 px-2 py-0.5 hover:bg-zinc-700"
          >
            −
          </button>
          <span>{zoom.toFixed(1)}x</span>
          <button
            onClick={() => setZoom((z) => Math.min(8, z + 0.5))}
            className="rounded bg-zinc-800 px-2 py-0.5 hover:bg-zinc-700"
          >
            +
          </button>
        </div>
      </div>

      <div
        className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950"
        onScroll={(e) => setScrollOffset(e.currentTarget.scrollLeft)}
      >
        <div className="relative" style={{ width: `${100 * zoom}%` }}>
          <div className="flex h-5 border-b border-zinc-800/60">
            {timeMarkers.map((t) => (
              <div
                key={t}
                className="absolute text-[10px] text-zinc-600"
                style={{ left: `${(t / duration) * 100}%` }}
              >
                <div className="h-2 border-l border-zinc-700/50" />
                <span className="ml-0.5">{formatTime(t)}</span>
              </div>
            ))}
          </div>

          <div
            ref={containerRef}
            className="relative cursor-crosshair select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} className="w-full" />

            {segments.map((seg) => (
              <div
                key={seg.id}
                className="group absolute top-0 flex h-full items-start"
                style={{
                  left: `${(seg.startTime / duration) * 100}%`,
                  width: `${((seg.endTime - seg.startTime) / duration) * 100}%`,
                }}
              >
                <div className="pointer-events-none absolute inset-0 flex items-end justify-between px-1 pb-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded bg-black/70 px-1 text-[9px] text-zinc-300">
                    {formatTime(seg.startTime)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      className="pointer-events-auto rounded bg-violet-600/80 px-1.5 py-0.5 text-[9px] text-white hover:bg-violet-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSegmentToggleSelect(seg.id);
                      }}
                    >
                      {seg.isSelected ? "✓" : "Select"}
                    </button>
                    <button
                      className="pointer-events-auto rounded bg-red-600/80 px-1.5 py-0.5 text-[9px] text-white hover:bg-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSegmentRemove(seg.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <span className="rounded bg-black/70 px-1 text-[9px] text-zinc-300">
                    {formatTime(seg.endTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-zinc-500">
        {formatTime(currentTime)} / {formatTime(duration)}
        {segments.length > 0 && (
          <span className="ml-3">
            {segments.filter((s) => s.isSelected).length} of {segments.length}{" "}
            segments selected
          </span>
        )}
      </div>
    </div>
  );
}
