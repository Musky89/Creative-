"use client";

import { useState, useCallback } from "react";
import type { TimelineSegment, VideoFile } from "@/lib/video-editor/types";
import { formatDuration } from "@/lib/video-editor/utils";

interface ExportPanelProps {
  timeline: TimelineSegment[];
  videos: VideoFile[];
}

export function ExportPanel({ timeline, videos }: ExportPanelProps) {
  const [format, setFormat] = useState<"mp4" | "webm" | "mov">("mp4");
  const [resolution, setResolution] = useState<
    "original" | "1080p" | "720p" | "480p"
  >("original");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    url: string;
    downloadUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...timeline].sort((a, b) => a.orderIndex - b.orderIndex);
  const totalDuration = sorted.reduce(
    (sum, s) => sum + (s.endTime - s.startTime),
    0
  );

  const videoMap: Record<string, string> = {};
  for (const v of videos) {
    videoMap[v.id] = v.path;
  }

  const handleExport = useCallback(async () => {
    if (!sorted.length) return;

    setExporting(true);
    setError(null);
    setResult(null);
    setProgress(20);

    try {
      const res = await fetch("/api/video-editor/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: sorted,
          videoMap,
          format,
          resolution,
        }),
      });

      setProgress(90);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      const data = await res.json();
      setProgress(100);
      setResult({ url: data.url, downloadUrl: data.downloadUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [sorted, videoMap, format, resolution]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Format</label>
          <select
            value={format}
            onChange={(e) =>
              setFormat(e.target.value as "mp4" | "webm" | "mov")
            }
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="mp4">MP4 (H.264)</option>
            <option value="webm">WebM (VP9)</option>
            <option value="mov">MOV (QuickTime)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            Resolution
          </label>
          <select
            value={resolution}
            onChange={(e) =>
              setResolution(
                e.target.value as "original" | "1080p" | "720p" | "480p"
              )
            }
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="original">Original</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Segments</span>
          <span className="text-zinc-300">{sorted.length}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-zinc-400">Total Duration</span>
          <span className="text-zinc-300">{formatDuration(totalDuration)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-zinc-400">Source Videos</span>
          <span className="text-zinc-300">
            {new Set(sorted.map((s) => s.videoId)).size}
          </span>
        </div>
      </div>

      {exporting && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">
            Exporting... {progress}% — This may take a while for long videos
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-950/20 p-3">
          <p className="text-xs text-emerald-400">Export complete!</p>
          <div className="mt-2 flex gap-2">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Preview
            </a>
            <a
              href={result.downloadUrl}
              download
              className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-600"
            >
              Download
            </a>
          </div>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={exporting || !sorted.length}
        className="w-full rounded-md bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting ? "Exporting..." : `Export ${sorted.length} Segments`}
      </button>
    </div>
  );
}
