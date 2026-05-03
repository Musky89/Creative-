"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { formatTime } from "@/lib/video-editor/utils";

interface VideoPlayerProps {
  src: string;
  label: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationReady?: (duration: number) => void;
  isActive: boolean;
  onSetInPoint?: () => void;
  onSetOutPoint?: () => void;
}

export function VideoPlayer({
  src,
  label,
  currentTime,
  onTimeUpdate,
  onDurationReady,
  isActive,
  onSetInPoint,
  onSetOutPoint,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (Math.abs(vid.currentTime - currentTime) > 0.3) {
      vid.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (vid) onTimeUpdate(vid.currentTime);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (vid) {
      setDuration(vid.duration);
      onDurationReady?.(vid.duration);
    }
  }, [onDurationReady]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setPlaying(true);
    } else {
      vid.pause();
      setPlaying(false);
    }
  }, []);

  const skipFrames = useCallback(
    (frames: number) => {
      const vid = videoRef.current;
      if (!vid) return;
      vid.pause();
      setPlaying(false);
      const fps = 30;
      vid.currentTime = Math.max(
        0,
        Math.min(vid.duration, vid.currentTime + frames / fps)
      );
    },
    []
  );

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
      vid.volume = volume;
      vid.playbackRate = playbackRate;
    }
  }, [volume, playbackRate]);

  return (
    <div
      className={`rounded-lg border ${
        isActive
          ? "border-violet-500/50 bg-zinc-900"
          : "border-zinc-800/50 bg-zinc-900/60"
      } overflow-hidden`}
    >
      <div className="flex items-center justify-between border-b border-zinc-800/50 px-3 py-1.5">
        <span className="text-xs font-medium text-zinc-300">{label}</span>
        <span className="text-[10px] text-zinc-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setPlaying(false)}
          playsInline
        />
      </div>

      <div className="flex items-center gap-1 border-t border-zinc-800/50 px-2 py-1.5">
        <button
          onClick={() => skipFrames(-10)}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Back 10 frames"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" />
          </svg>
        </button>
        <button
          onClick={() => skipFrames(-1)}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Back 1 frame"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          onClick={togglePlay}
          className="rounded bg-zinc-800 p-1.5 text-zinc-200 transition-colors hover:bg-zinc-700"
        >
          {playing ? (
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
        <button
          onClick={() => skipFrames(1)}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Forward 1 frame"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          onClick={() => skipFrames(10)}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Forward 10 frames"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0zm6 0a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" />
          </svg>
        </button>

        <div className="mx-2 h-4 border-l border-zinc-700" />

        {onSetInPoint && (
          <button
            onClick={onSetInPoint}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-emerald-400 transition-colors hover:bg-zinc-800"
            title="Set In Point [I]"
          >
            IN
          </button>
        )}
        {onSetOutPoint && (
          <button
            onClick={onSetOutPoint}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-amber-400 transition-colors hover:bg-zinc-800"
            title="Set Out Point [O]"
          >
            OUT
          </button>
        )}

        <div className="flex-1" />

        <select
          value={playbackRate}
          onChange={(e) => setPlaybackRate(Number(e.target.value))}
          className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
        >
          <option value={0.25}>0.25x</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-16 accent-violet-500"
          title={`Volume: ${Math.round(volume * 100)}%`}
        />
      </div>
    </div>
  );
}
