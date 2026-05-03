"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  VideoFile,
  Segment,
  SilenceRegion,
  TimelineSegment,
} from "@/lib/video-editor/types";
import { generateId } from "@/lib/video-editor/utils";
import { VideoUpload } from "@/components/video-editor/video-upload";
import { VideoPlayer } from "@/components/video-editor/video-player";
import { WaveformTimeline } from "@/components/video-editor/waveform-timeline";
import { SegmentList } from "@/components/video-editor/segment-list";
import { CompositionTimeline } from "@/components/video-editor/composition-timeline";
import { ExportPanel } from "@/components/video-editor/export-panel";

interface VideoState {
  file: VideoFile | null;
  currentTime: number;
  waveformData: number[];
  silenceRegions: SilenceRegion[];
  segments: Segment[];
  inPoint: number | null;
}

export default function VideoEditorPage() {
  const [videos, setVideos] = useState<[VideoState, VideoState]>([
    {
      file: null,
      currentTime: 0,
      waveformData: [],
      silenceRegions: [],
      segments: [],
      inPoint: null,
    },
    {
      file: null,
      currentTime: 0,
      waveformData: [],
      silenceRegions: [],
      segments: [],
      inPoint: null,
    },
  ]);

  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [timeline, setTimeline] = useState<TimelineSegment[]>([]);
  const [activeTab, setActiveTab] = useState<
    "segments" | "timeline" | "export"
  >("segments");
  const [silenceThreshold, setSilenceThreshold] = useState(-30);
  const [silenceMinDuration, setSilenceMinDuration] = useState(0.5);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [autoSegmentMode, setAutoSegmentMode] = useState<
    "silence" | "speech"
  >("speech");

  const keyboardRef = useRef<HTMLDivElement>(null);

  const updateVideoState = useCallback(
    (idx: number, update: Partial<VideoState>) => {
      setVideos((prev) => {
        const next = [...prev] as [VideoState, VideoState];
        next[idx] = { ...next[idx], ...update };
        return next;
      });
    },
    []
  );

  const handleVideoUploaded = useCallback(
    (idx: number, video: VideoFile) => {
      updateVideoState(idx, { file: video });
      setActiveVideoIdx(idx);

      fetch("/api/video-editor/waveform-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoPath: video.path, samples: 800 }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.data) updateVideoState(idx, { waveformData: data.data });
        })
        .catch(() => {});
    },
    [updateVideoState]
  );

  const handleDetectSilence = useCallback(
    async (idx: number) => {
      const v = videos[idx];
      if (!v.file) return;

      setAnalyzing(idx);
      try {
        const res = await fetch("/api/video-editor/detect-silence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoPath: v.file.path,
            threshold: silenceThreshold,
            minDuration: silenceMinDuration,
          }),
        });
        const data = await res.json();
        if (data.regions) {
          updateVideoState(idx, { silenceRegions: data.regions });
        }
      } catch {
        // Silence detection failed silently
      }
      setAnalyzing(null);
    },
    [videos, silenceThreshold, silenceMinDuration, updateVideoState]
  );

  const handleAutoSegment = useCallback(
    (idx: number) => {
      const v = videos[idx];
      if (!v.file || !v.silenceRegions.length) return;

      const dur = v.file.duration;
      const segments: Segment[] = [];

      if (autoSegmentMode === "speech") {
        let cursor = 0;
        const sortedSilence = [...v.silenceRegions].sort(
          (a, b) => a.start - b.start
        );

        for (const region of sortedSilence) {
          if (region.start - cursor > 0.3) {
            segments.push({
              id: generateId(),
              videoId: v.file.id,
              label: `Take ${segments.length + 1}`,
              startTime: cursor,
              endTime: region.start,
              isMuted: false,
              isSelected: true,
            });
          }
          cursor = region.end;
        }

        if (dur - cursor > 0.3) {
          segments.push({
            id: generateId(),
            videoId: v.file.id,
            label: `Take ${segments.length + 1}`,
            startTime: cursor,
            endTime: dur,
            isMuted: false,
            isSelected: true,
          });
        }
      } else {
        for (let i = 0; i < v.silenceRegions.length; i++) {
          const r = v.silenceRegions[i];
          segments.push({
            id: generateId(),
            videoId: v.file.id,
            label: `Silence ${i + 1}`,
            startTime: r.start,
            endTime: r.end,
            isMuted: true,
            isSelected: false,
          });
        }
      }

      updateVideoState(idx, { segments });
    },
    [videos, autoSegmentMode, updateVideoState]
  );

  const handleSegmentCreate = useCallback(
    (idx: number, start: number, end: number) => {
      const v = videos[idx];
      if (!v.file) return;

      const newSeg: Segment = {
        id: generateId(),
        videoId: v.file.id,
        label: `Segment ${v.segments.length + 1}`,
        startTime: start,
        endTime: end,
        isMuted: false,
        isSelected: false,
      };

      updateVideoState(idx, { segments: [...v.segments, newSeg] });
    },
    [videos, updateVideoState]
  );

  const handleSegmentUpdate = useCallback(
    (idx: number, segId: string, start: number, end: number) => {
      const v = videos[idx];
      updateVideoState(idx, {
        segments: v.segments.map((s) =>
          s.id === segId ? { ...s, startTime: start, endTime: end } : s
        ),
      });
    },
    [videos, updateVideoState]
  );

  const handleSegmentRemove = useCallback(
    (idx: number, segId: string) => {
      const v = videos[idx];
      updateVideoState(idx, {
        segments: v.segments.filter((s) => s.id !== segId),
      });
      setTimeline((prev) => prev.filter((t) => t.id !== segId));
    },
    [videos, updateVideoState]
  );

  const handleSegmentToggleSelect = useCallback(
    (idx: number, segId: string) => {
      const v = videos[idx];
      updateVideoState(idx, {
        segments: v.segments.map((s) =>
          s.id === segId ? { ...s, isSelected: !s.isSelected } : s
        ),
      });
    },
    [videos, updateVideoState]
  );

  const handleSegmentLabelChange = useCallback(
    (idx: number, segId: string, label: string) => {
      const v = videos[idx];
      updateVideoState(idx, {
        segments: v.segments.map((s) =>
          s.id === segId ? { ...s, label } : s
        ),
      });
    },
    [videos, updateVideoState]
  );

  const handleSetInPoint = useCallback(
    (idx: number) => {
      updateVideoState(idx, { inPoint: videos[idx].currentTime });
    },
    [videos, updateVideoState]
  );

  const handleSetOutPoint = useCallback(
    (idx: number) => {
      const v = videos[idx];
      if (v.inPoint !== null && v.file) {
        const start = Math.min(v.inPoint, v.currentTime);
        const end = Math.max(v.inPoint, v.currentTime);
        if (end - start >= 0.1) {
          handleSegmentCreate(idx, start, end);
        }
        updateVideoState(idx, { inPoint: null });
      }
    },
    [videos, handleSegmentCreate, updateVideoState]
  );

  const addSelectedToTimeline = useCallback(() => {
    const allSelected: TimelineSegment[] = [];

    for (const v of videos) {
      for (const seg of v.segments) {
        if (seg.isSelected && !timeline.find((t) => t.id === seg.id)) {
          allSelected.push({
            ...seg,
            orderIndex: timeline.length + allSelected.length,
          });
        }
      }
    }

    if (allSelected.length) {
      setTimeline((prev) => [...prev, ...allSelected]);
      setActiveTab("timeline");
    }
  }, [videos, timeline]);

  const handleTimelineRemove = useCallback((id: string) => {
    setTimeline((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      return filtered.map((t, i) => ({ ...t, orderIndex: i }));
    });
  }, []);

  const handlePreviewSegment = useCallback(
    (seg: TimelineSegment) => {
      const vidIdx = videos.findIndex((v) => v.file?.id === seg.videoId);
      if (vidIdx >= 0) {
        setActiveVideoIdx(vidIdx);
        updateVideoState(vidIdx, { currentTime: seg.startTime });
      }
    },
    [videos, updateVideoState]
  );

  const handleSeekTo = useCallback(
    (videoId: string, time: number) => {
      const idx = videos.findIndex((v) => v.file?.id === videoId);
      if (idx >= 0) {
        setActiveVideoIdx(idx);
        updateVideoState(idx, { currentTime: time });
      }
    },
    [videos, updateVideoState]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const v = videos[activeVideoIdx];
      if (!v.file) return;

      switch (e.key.toLowerCase()) {
        case "i":
          handleSetInPoint(activeVideoIdx);
          e.preventDefault();
          break;
        case "o":
          handleSetOutPoint(activeVideoIdx);
          e.preventDefault();
          break;
        case " ":
          e.preventDefault();
          break;
        case "1":
          if (videos[0].file) setActiveVideoIdx(0);
          e.preventDefault();
          break;
        case "2":
          if (videos[1].file) setActiveVideoIdx(1);
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVideoIdx, videos, handleSetInPoint, handleSetOutPoint]);

  const allSegments = [...videos[0].segments, ...videos[1].segments];
  const selectedCount = allSegments.filter((s) => s.isSelected).length;
  const allVideos = [videos[0].file, videos[1].file].filter(
    Boolean
  ) as VideoFile[];

  return (
    <div ref={keyboardRef} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">
            Video Editor
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Upload two takes, mark segments, arrange in timeline, export the
            final cut
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono">
            I
          </kbd>
          <span>In point</span>
          <kbd className="ml-2 rounded border border-zinc-700 px-1.5 py-0.5 font-mono">
            O
          </kbd>
          <span>Out point</span>
          <kbd className="ml-2 rounded border border-zinc-700 px-1.5 py-0.5 font-mono">
            1
          </kbd>
          /
          <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono">
            2
          </kbd>
          <span>Switch video</span>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-2 gap-4">
        <VideoUpload
          label="Video A — Primary Take"
          slotIndex={0}
          video={videos[0].file}
          onVideoUploaded={(v) => handleVideoUploaded(0, v)}
          onRemove={() => {
            updateVideoState(0, {
              file: null,
              currentTime: 0,
              waveformData: [],
              silenceRegions: [],
              segments: [],
              inPoint: null,
            });
            setTimeline((prev) =>
              prev.filter((t) => t.videoId !== videos[0].file?.id)
            );
          }}
        />
        <VideoUpload
          label="Video B — Alternate Take"
          slotIndex={1}
          video={videos[1].file}
          onVideoUploaded={(v) => handleVideoUploaded(1, v)}
          onRemove={() => {
            updateVideoState(1, {
              file: null,
              currentTime: 0,
              waveformData: [],
              silenceRegions: [],
              segments: [],
              inPoint: null,
            });
            setTimeline((prev) =>
              prev.filter((t) => t.videoId !== videos[1].file?.id)
            );
          }}
        />
      </div>

      {/* Video Players */}
      {(videos[0].file || videos[1].file) && (
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((idx) => {
            const v = videos[idx];
            if (!v.file) return <div key={idx} />;

            const fileUrl = `/api/video-editor/files?path=${encodeURIComponent(v.file.path)}`;
            return (
              <div key={idx} onClick={() => setActiveVideoIdx(idx)}>
                <VideoPlayer
                  src={fileUrl}
                  label={idx === 0 ? "Video A" : "Video B"}
                  currentTime={v.currentTime}
                  onTimeUpdate={(t) => updateVideoState(idx, { currentTime: t })}
                  isActive={activeVideoIdx === idx}
                  onSetInPoint={() => handleSetInPoint(idx)}
                  onSetOutPoint={() => handleSetOutPoint(idx)}
                />
                {v.inPoint !== null && (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-emerald-400">
                      IN: {v.inPoint.toFixed(2)}s
                    </span>
                    <span className="text-zinc-600">
                      → Press O or click OUT to create segment
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Waveform Timelines */}
      {[0, 1].map((idx) => {
        const v = videos[idx];
        if (!v.file || !v.waveformData.length) return null;

        return (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-300">
                {idx === 0 ? "Video A" : "Video B"} — Waveform &amp; Segments
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDetectSilence(idx)}
                  disabled={analyzing === idx}
                  className="rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
                >
                  {analyzing === idx
                    ? "Analyzing..."
                    : "Detect Silence"}
                </button>
                {v.silenceRegions.length > 0 && (
                  <>
                    <select
                      value={autoSegmentMode}
                      onChange={(e) =>
                        setAutoSegmentMode(
                          e.target.value as "silence" | "speech"
                        )
                      }
                      className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400"
                    >
                      <option value="speech">Speech segments</option>
                      <option value="silence">Silence segments</option>
                    </select>
                    <button
                      onClick={() => handleAutoSegment(idx)}
                      className="rounded-md bg-violet-600 px-3 py-1 text-xs text-white transition-colors hover:bg-violet-500"
                    >
                      Auto-Segment
                    </button>
                  </>
                )}
              </div>
            </div>

            <WaveformTimeline
              videoId={v.file.id}
              duration={v.file.duration}
              waveformData={v.waveformData}
              silenceRegions={v.silenceRegions}
              segments={v.segments}
              currentTime={v.currentTime}
              onSeek={(t) => updateVideoState(idx, { currentTime: t })}
              onSegmentCreate={(s, e) => handleSegmentCreate(idx, s, e)}
              onSegmentUpdate={(id, s, e) =>
                handleSegmentUpdate(idx, id, s, e)
              }
              onSegmentRemove={(id) => handleSegmentRemove(idx, id)}
              onSegmentToggleSelect={(id) =>
                handleSegmentToggleSelect(idx, id)
              }
            />
          </div>
        );
      })}

      {/* Silence Detection Settings */}
      {(videos[0].file || videos[1].file) && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <summary className="cursor-pointer px-4 py-2 text-xs text-zinc-400 hover:text-zinc-300">
            Silence Detection Settings
          </summary>
          <div className="flex gap-6 px-4 pb-3 pt-1">
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">
                Threshold (dB)
              </label>
              <input
                type="range"
                min={-60}
                max={-10}
                step={1}
                value={silenceThreshold}
                onChange={(e) => setSilenceThreshold(Number(e.target.value))}
                className="w-32 accent-violet-500"
              />
              <span className="ml-2 text-xs text-zinc-400">
                {silenceThreshold}dB
              </span>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">
                Min Duration (s)
              </label>
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={silenceMinDuration}
                onChange={(e) => setSilenceMinDuration(Number(e.target.value))}
                className="w-32 accent-violet-500"
              />
              <span className="ml-2 text-xs text-zinc-400">
                {silenceMinDuration}s
              </span>
            </div>
          </div>
        </details>
      )}

      {/* Bottom Panel: Segments / Timeline / Export */}
      {(videos[0].file || videos[1].file) && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60">
          <div className="flex border-b border-zinc-800">
            {(
              [
                { key: "segments", label: `Segments (${allSegments.length})` },
                { key: "timeline", label: `Timeline (${timeline.length})` },
                { key: "export", label: "Export" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === key
                    ? "border-b-2 border-violet-500 text-violet-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}

            {activeTab === "segments" && selectedCount > 0 && (
              <div className="ml-auto flex items-center px-3">
                <button
                  onClick={addSelectedToTimeline}
                  className="rounded-md bg-violet-600 px-3 py-1 text-xs text-white transition-colors hover:bg-violet-500"
                >
                  Add {selectedCount} to Timeline →
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {activeTab === "segments" && (
              <SegmentList
                segments={allSegments}
                videos={allVideos}
                onToggleSelect={(id) => {
                  const idx = videos[0].segments.find((s) => s.id === id)
                    ? 0
                    : 1;
                  handleSegmentToggleSelect(idx, id);
                }}
                onRemove={(id) => {
                  const idx = videos[0].segments.find((s) => s.id === id)
                    ? 0
                    : 1;
                  handleSegmentRemove(idx, id);
                }}
                onSeekTo={handleSeekTo}
                onLabelChange={(id, label) => {
                  const idx = videos[0].segments.find((s) => s.id === id)
                    ? 0
                    : 1;
                  handleSegmentLabelChange(idx, id, label);
                }}
              />
            )}
            {activeTab === "timeline" && (
              <CompositionTimeline
                segments={timeline}
                videos={allVideos}
                onReorder={setTimeline}
                onRemove={handleTimelineRemove}
                onPreview={handlePreviewSegment}
              />
            )}
            {activeTab === "export" && (
              <ExportPanel timeline={timeline} videos={allVideos} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
