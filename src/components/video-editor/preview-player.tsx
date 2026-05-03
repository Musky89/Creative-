"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TimelineSegment, VideoProject } from "@/lib/video-editor/types";
import { timelineDurationSec } from "@/lib/video-editor/cleaner";

interface Props {
  project: VideoProject;
  previewSegments: TimelineSegment[];
}

/**
 * In-browser preview that stitches segments by switching `<video>` source +
 * seeking. Each segment has its own clip's proxy mp4. We use a single video
 * element and listen for `timeupdate`; when the playhead reaches the segment
 * end we advance to the next one.
 *
 * This is approximate — there is a small seek gap between segments when they
 * span different clips — but it gives a fast, dependency-free preview.
 */
export function PreviewPlayer({ project, previewSegments }: Props) {
  const segments = previewSegments;
  const total = useMemo(() => timelineDurationSec(segments), [segments]);
  const [segIdx, setSegIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const clipById = useMemo(
    () => new Map(project.clips.map((c) => [c.id, c])),
    [project.clips],
  );
  const currentSeg = segments[segIdx];
  const currentClip = currentSeg ? clipById.get(currentSeg.clipId) : null;

  // When the segment changes, set the video src/seek to start.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !currentSeg || !currentClip) return;
    const url = `/api/video-editor/projects/${project.id}/clips/${currentClip.id}/file?asset=proxy`;
    if (!v.src.endsWith(url)) {
      v.src = url;
    }
    const onLoaded = () => {
      v.currentTime = currentSeg.start;
      if (playing) void v.play();
    };
    v.addEventListener("loadedmetadata", onLoaded, { once: true });
    // If already loaded same src, just seek.
    if (v.readyState >= 1) {
      v.currentTime = currentSeg.start;
      if (playing) void v.play();
    }
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [currentSeg, currentClip, project.id, playing]);

  // Advance segments based on time.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !currentSeg) return;
    const handler = () => {
      if (v.currentTime >= currentSeg.end - 0.02) {
        if (segIdx + 1 < segments.length) {
          setSegIdx(segIdx + 1);
        } else {
          v.pause();
          setPlaying(false);
        }
      }
    };
    v.addEventListener("timeupdate", handler);
    return () => v.removeEventListener("timeupdate", handler);
  }, [currentSeg, segIdx, segments.length]);

  const reset = useCallback(() => {
    setSegIdx(0);
    setPlaying(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
    }
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      void v.play();
      setPlaying(true);
    }
  }, [playing]);

  // Compute "elapsed" in cut time for the progress bar.
  const elapsedCutSec = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < segIdx; i += 1) {
      acc += segments[i].end - segments[i].start;
    }
    if (currentSeg) {
      const v = videoRef.current;
      const t = v?.currentTime ?? currentSeg.start;
      acc += Math.max(0, Math.min(currentSeg.end, t) - currentSeg.start);
    }
    return acc;
  }, [segIdx, segments, currentSeg]);

  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-3">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Preview
      </p>
      {segments.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">
          Build a timeline to preview the cut.
        </p>
      ) : (
        <>
          <video
            ref={videoRef}
            className="mt-2 aspect-video w-full rounded-lg bg-black"
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded bg-zinc-100 px-3 py-1 font-medium text-zinc-950 hover:bg-white"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded border border-zinc-700 px-3 py-1 text-zinc-200 hover:border-zinc-500"
            >
              Restart
            </button>
            <span className="ml-auto tabular-nums text-zinc-400">
              {formatDur(elapsedCutSec)} / {formatDur(total)} · seg {Math.min(segIdx + 1, segments.length)}/{segments.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function formatDur(s: number): string {
  if (!Number.isFinite(s)) return "0:00.0";
  const m = Math.floor(s / 60);
  const r = (s % 60).toFixed(1);
  return `${m}:${r.padStart(4, "0")}`;
}
