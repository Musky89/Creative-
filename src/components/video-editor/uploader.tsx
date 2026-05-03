"use client";

import { useCallback, useRef, useState } from "react";
import type { Clip } from "@/lib/video-editor/types";

interface Props {
  projectId: string;
  onUploaded: (clips: Clip[]) => void | Promise<void>;
}

/**
 * Accepts multiple files at once. Each upload runs probe + transcript on the
 * server before responding, so by the time `onUploaded` fires the clip is
 * editable. Drag-and-drop is supported.
 */
export function Uploader({ projectId, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [takeLabel, setTakeLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setBusy(true);
      setError(null);
      const accepted: Clip[] = [];
      try {
        for (let i = 0; i < list.length; i += 1) {
          const f = list[i];
          setProgress(`Uploading ${i + 1}/${list.length}: ${f.name} — extracting + transcribing`);
          const fd = new FormData();
          fd.append("file", f);
          if (takeLabel) fd.append("takeLabel", takeLabel);
          const res = await fetch(
            `/api/video-editor/projects/${projectId}/clips`,
            { method: "POST", body: fd },
          );
          const json = await res.json();
          if (!json.ok) {
            setError(json.error?.message ?? "Upload failed");
            break;
          }
          for (const r of json.data) {
            if (r.ok) accepted.push(r.clip as Clip);
            else setError(r.error ?? "Upload failed");
          }
        }
        if (accepted.length > 0) await onUploaded(accepted);
      } finally {
        setBusy(false);
        setProgress(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onUploaded, projectId, takeLabel],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-xl border ${
        dragOver ? "border-zinc-400 bg-zinc-800/50" : "border-dashed border-zinc-700 bg-zinc-900/40"
      } p-3 transition-colors`}
    >
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Upload takes
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">
        Drop multiple files (e.g. take 1 + take 2). MP4, MOV, WebM, MKV, AVI.
      </p>
      <div className="mt-3 space-y-2">
        <input
          type="text"
          value={takeLabel}
          onChange={(e) => setTakeLabel(e.target.value)}
          placeholder="Take label (optional, applied to all)"
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-zinc-950 hover:file:bg-white disabled:opacity-50"
          disabled={busy}
        />
      </div>
      {progress ? (
        <p className="mt-2 text-[11px] text-zinc-400">{progress}</p>
      ) : null}
      {error ? <p className="mt-2 text-[11px] text-rose-400">{error}</p> : null}
    </div>
  );
}
