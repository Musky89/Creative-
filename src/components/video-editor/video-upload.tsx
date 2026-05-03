"use client";

import { useCallback, useState } from "react";
import type { VideoFile } from "@/lib/video-editor/types";
import { formatFileSize, formatDuration } from "@/lib/video-editor/utils";

interface VideoUploadProps {
  label: string;
  slotIndex: number;
  video: VideoFile | null;
  onVideoUploaded: (video: VideoFile) => void;
  onRemove: () => void;
}

export function VideoUpload({
  label,
  slotIndex,
  video,
  onVideoUploaded,
  onRemove,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      setProgress(10);

      try {
        const formData = new FormData();
        formData.append("video", file);

        setProgress(30);

        const res = await fetch("/api/video-editor/upload", {
          method: "POST",
          body: formData,
        });

        setProgress(80);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const videoData: VideoFile = await res.json();
        setProgress(100);
        onVideoUploaded(videoData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onVideoUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("video/")) {
        handleUpload(file);
      } else {
        setError("Please drop a video file");
      }
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  if (video) {
    return (
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/80 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold">
              {slotIndex + 1}
            </span>
            <h3 className="text-sm font-medium text-zinc-200">{label}</h3>
          </div>
          <button
            onClick={onRemove}
            className="rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            Remove
          </button>
        </div>
        <div className="flex gap-3">
          {video.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt="Thumbnail"
              className="h-16 w-28 rounded object-cover"
            />
          )}
          <div className="flex flex-col gap-1 text-xs text-zinc-400">
            <span className="font-medium text-zinc-200" title={video.name}>
              {video.name.length > 30
                ? video.name.slice(0, 27) + "..."
                : video.name}
            </span>
            <span>
              {video.width}×{video.height} · {video.fps}fps · {video.codec}
            </span>
            <span>
              {formatDuration(video.duration)} · {formatFileSize(video.size)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        uploading
          ? "border-violet-500/50 bg-violet-950/20"
          : "border-zinc-700/50 bg-zinc-900/40 hover:border-zinc-600"
      }`}
    >
      <div className="flex items-center gap-2 justify-center mb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold">
          {slotIndex + 1}
        </span>
        <h3 className="text-sm font-medium text-zinc-300">{label}</h3>
      </div>

      {uploading ? (
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">
            Uploading & analyzing... {progress}%
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-500">
            Drag & drop a video file or click to browse
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Choose Video
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
