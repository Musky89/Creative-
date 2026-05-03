"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MuteSpan, TimelineSegment, TrackId } from "./types";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec)) return "—";
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, "0")}`;
}

type LoadedVideo = {
  file: File;
  url: string;
  duration: number;
};

function pickVideoRecorderMime(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return undefined;
}

function pickAudioRecorderMime(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return undefined;
}

async function waitSeeked(video: HTMLVideoElement) {
  await new Promise<void>((resolve) => {
    video.addEventListener("seeked", () => resolve(), { once: true });
  });
}

type AudioGraph = {
  ctx: AudioContext;
  gainA: GainNode;
  gainB: GainNode;
  dest: MediaStreamAudioDestinationNode;
};

export function VideoStudioApp() {
  const aInputId = useId();
  const bInputId = useId();

  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioGraphRef = useRef<AudioGraph | null>(null);

  const [videoA, setVideoA] = useState<LoadedVideo | null>(null);
  const [videoB, setVideoB] = useState<LoadedVideo | null>(null);

  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [mutesBySegment, setMutesBySegment] = useState<Record<string, MuteSpan[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [scrubA, setScrubA] = useState(0);
  const [scrubB, setScrubB] = useState(0);

  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [exportPct, setExportPct] = useState(0);

  const bothLoaded = Boolean(videoA?.url && videoB?.url);

  const totalDuration = useMemo(
    () => segments.reduce((acc, s) => acc + (s.sourceOut - s.sourceIn), 0),
    [segments],
  );

  const selectedSegment = segments.find((s) => s.id === selectedId) ?? null;
  const selectedMutes = selectedId ? (mutesBySegment[selectedId] ?? []) : [];

  useLayoutEffect(() => {
    const va = videoARef.current;
    const vb = videoBRef.current;
    if (!va || !vb || !videoA?.url || !videoB?.url) {
      if (audioGraphRef.current) {
        void audioGraphRef.current.ctx.close();
        audioGraphRef.current = null;
      }
      return;
    }
    if (audioGraphRef.current) {
      void audioGraphRef.current.ctx.close();
      audioGraphRef.current = null;
    }
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const gainA = ctx.createGain();
    const gainB = ctx.createGain();
    gainA.gain.value = 0;
    gainB.gain.value = 0;
    const srcA = ctx.createMediaElementSource(va);
    const srcB = ctx.createMediaElementSource(vb);
    srcA.connect(gainA).connect(dest);
    srcB.connect(gainB).connect(dest);
    audioGraphRef.current = { ctx, gainA, gainB, dest };
    return () => {
      void ctx.close();
      if (audioGraphRef.current?.ctx === ctx) {
        audioGraphRef.current = null;
      }
    };
  }, [videoA?.url, videoB?.url]);

  const onPickA = useCallback((f: File | null) => {
    if (!f || !f.type.startsWith("video/")) return;
    setVideoA((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file: f, url: URL.createObjectURL(f), duration: 0 };
    });
  }, []);

  const onPickB = useCallback((f: File | null) => {
    if (!f || !f.type.startsWith("video/")) return;
    setVideoB((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file: f, url: URL.createObjectURL(f), duration: 0 };
    });
  }, []);

  useEffect(() => {
    return () => {
      if (videoA) URL.revokeObjectURL(videoA.url);
      if (videoB) URL.revokeObjectURL(videoB.url);
    };
  }, [videoA, videoB]);

  const onMetaA = useCallback(() => {
    const el = videoARef.current;
    if (!el || !videoA) return;
    setVideoA((prev) =>
      prev ? { ...prev, duration: el.duration || prev.duration } : prev,
    );
  }, [videoA]);

  const onMetaB = useCallback(() => {
    const el = videoBRef.current;
    if (!el || !videoB) return;
    setVideoB((prev) =>
      prev ? { ...prev, duration: el.duration || prev.duration } : prev,
    );
  }, [videoB]);

  const addSegment = useCallback(
    (track: TrackId, sourceIn: number, sourceOut: number) => {
      const durA = videoA?.duration ?? 0;
      const durB = videoB?.duration ?? 0;
      const cap = track === "A" ? durA : durB;
      if (cap <= 0) return;
      const a = Math.max(0, Math.min(sourceIn, cap));
      let b = Math.max(0, Math.min(sourceOut, cap));
      if (b - a < 0.05) b = Math.min(cap, a + 0.1);
      if (b <= a) return;
      const id = uid();
      setSegments((prev) => [...prev, { id, track, sourceIn: a, sourceOut: b }]);
      setMutesBySegment((prev) => ({ ...prev, [id]: [] }));
      setSelectedId(id);
    },
    [videoA?.duration, videoB?.duration],
  );

  const addFromScrubbers = useCallback(() => {
    if (videoA && videoA.duration > 0) {
      const t = scrubA;
      const end = Math.min(videoA.duration, Math.max(t + 0.5, t + 2));
      addSegment("A", t, end);
    }
  }, [addSegment, scrubA, videoA]);

  const addFromScrubbersB = useCallback(() => {
    if (videoB && videoB.duration > 0) {
      const t = scrubB;
      const end = Math.min(videoB.duration, Math.max(t + 0.5, t + 2));
      addSegment("B", t, end);
    }
  }, [addSegment, scrubB, videoB]);

  const removeSegment = useCallback((id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    setMutesBySegment((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const moveSegment = useCallback((index: number, dir: -1 | 1) => {
    setSegments((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }, []);

  const updateSegment = useCallback(
    (id: string, patch: Partial<Pick<TimelineSegment, "track" | "sourceIn" | "sourceOut">>) => {
      setSegments((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const track = patch.track ?? s.track;
          const cap2 = track === "B" ? videoB?.duration ?? 0 : videoA?.duration ?? 0;
          let sourceIn = patch.sourceIn ?? s.sourceIn;
          let sourceOut = patch.sourceOut ?? s.sourceOut;
          sourceIn = Math.max(0, Math.min(sourceIn, cap2));
          sourceOut = Math.max(0, Math.min(sourceOut, cap2));
          if (sourceOut - sourceIn < 0.04) sourceOut = Math.min(cap2, sourceIn + 0.05);
          return { ...s, ...patch, track, sourceIn, sourceOut };
        }),
      );
    },
    [videoA?.duration, videoB?.duration],
  );

  const addMuteToSelected = useCallback(() => {
    if (!selectedId || !selectedSegment) return;
    const len = selectedSegment.sourceOut - selectedSegment.sourceIn;
    setMutesBySegment((prev) => {
      const list = [...(prev[selectedId] ?? [])];
      const from = Math.min(len * 0.2, len - 0.1);
      const to = Math.min(from + 0.5, len);
      list.push({ from: Math.max(0, from), to: Math.max(from + 0.05, to) });
      return { ...prev, [selectedId]: list };
    });
  }, [selectedId, selectedSegment]);

  const updateMute = useCallback(
    (segId: string, idx: number, patch: Partial<MuteSpan>) => {
      setMutesBySegment((prev) => {
        const list = [...(prev[segId] ?? [])];
        const cur = list[idx];
        if (!cur) return prev;
        list[idx] = { ...cur, ...patch };
        return { ...prev, [segId]: list };
      });
    },
    [],
  );

  const removeMute = useCallback((segId: string, idx: number) => {
    setMutesBySegment((prev) => {
      const list = [...(prev[segId] ?? [])];
      list.splice(idx, 1);
      return { ...prev, [segId]: list };
    });
  }, []);

  const runExport = useCallback(
    async (mode: "video" | "audio") => {
      if (segments.length === 0) {
        setExportNote("Add at least one timeline segment before export.");
        return;
      }
      const mime =
        mode === "video" ? pickVideoRecorderMime() : pickAudioRecorderMime();
      if (!mime) {
        setExportNote("Recording is not supported in this browser.");
        return;
      }

      const va = videoARef.current;
      const vb = videoBRef.current;
      const graph = audioGraphRef.current;
      if (!va || !vb || !graph) {
        setExportNote("Load both takes (A and B) before exporting.");
        return;
      }

      setExporting(true);
      setExportNote(null);
      setExportPct(0);

      const { ctx, gainA, gainB, dest } = graph;
      await ctx.resume().catch(() => {});

      const canvas = document.createElement("canvas");
      const w = Math.max(2, Math.floor(va.videoWidth || vb.videoWidth || 1280));
      const h = Math.max(2, Math.floor(va.videoHeight || vb.videoHeight || 720));
      canvas.width = w;
      canvas.height = h;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) {
        setExportNote("Canvas unavailable.");
        setExporting(false);
        return;
      }

      const vStream =
        mode === "video" ? canvas.captureStream(30) : new MediaStream();
      const merged =
        mode === "video"
          ? new MediaStream([
              ...vStream.getVideoTracks(),
              ...dest.stream.getAudioTracks(),
            ])
          : new MediaStream([...dest.stream.getAudioTracks()]);

      const chunks: Blob[] = [];
      const rec = new MediaRecorder(merged, {
        mimeType: mime,
        ...(mode === "video" ? { videoBitsPerSecond: 8_000_000 } : {}),
      });
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };

      const stopped = new Promise<void>((resolve, reject) => {
        rec.onerror = () => reject(new Error("Recorder error"));
        rec.onstop = () => resolve();
      });

      const total = segments.reduce((acc, s) => acc + (s.sourceOut - s.sourceIn), 0);
      let done = 0;

      rec.start(250);

      va.muted = true;
      vb.muted = true;
      va.volume = 0;
      vb.volume = 0;

      const drawFrame = (video: HTMLVideoElement) => {
        ctx2d.fillStyle = "#000";
        ctx2d.fillRect(0, 0, w, h);
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw > 0 && vh > 0) {
          const scale = Math.min(w / vw, h / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          const ox = (w - dw) / 2;
          const oy = (h - dh) / 2;
          ctx2d.drawImage(video, ox, oy, dw, dh);
        }
      };

      try {
        for (let si = 0; si < segments.length; si++) {
          const seg = segments[si]!;
          const video = seg.track === "A" ? va : vb;
          const gActive = seg.track === "A" ? gainA : gainB;
          const gOther = seg.track === "A" ? gainB : gainA;
          gOther.gain.value = 0;
          gActive.gain.value = 1;

          const t0 = seg.sourceIn;
          const t1 = seg.sourceOut;
          const segDur = t1 - t0;
          const mutes = mutesBySegment[seg.id] ?? [];

          video.pause();
          video.currentTime = t0;
          await waitSeeked(video);
          await video.play();

          await new Promise<void>((resolveSeg) => {
            const startWall = performance.now();

            const tick = () => {
              const cur = video.currentTime;
              const local = cur - t0;
              const elapsed = performance.now() - startWall;

              let silent = false;
              for (const m of mutes) {
                if (local >= m.from && local < m.to) {
                  silent = true;
                  break;
                }
              }
              gActive.gain.value = silent ? 0 : 1;

              if (mode === "video") {
                drawFrame(video);
              }

              if (cur >= t1 - 0.04 || video.ended) {
                video.pause();
                done += segDur;
                setExportPct(Math.min(99, Math.round((done / total) * 100)));
                resolveSeg();
                return;
              }

              if (elapsed > segDur * 1000 + 5000) {
                video.pause();
                done += segDur;
                setExportPct(Math.min(99, Math.round((done / total) * 100)));
                resolveSeg();
                return;
              }

              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });
        }

        rec.stop();
        await stopped;

        const blob = new Blob(chunks, { type: mime.split(";")[0] });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download =
          mode === "video"
            ? `edit-${Date.now()}.webm`
            : `edit-audio-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(a.href);
        setExportPct(100);
        setExportNote(
          mode === "video"
            ? "Exported video (WebM)."
            : "Exported audio only (WebM Opus). Remux with ffmpeg if you need WAV/MP4.",
        );
      } catch (e) {
        setExportNote(e instanceof Error ? e.message : "Export failed");
      } finally {
        va.muted = false;
        vb.muted = false;
        va.volume = 1;
        vb.volume = 1;
        gainA.gain.value = 0;
        gainB.gain.value = 0;
        setExporting(false);
      }
    },
    [segments, mutesBySegment],
  );

  const exportWebm = useCallback(() => void runExport("video"), [runExport]);
  const exportAudioOnly = useCallback(() => void runExport("audio"), [runExport]);

  const [previewSegId, setPreviewSegId] = useState<string | null>(null);

  useEffect(() => {
    if (!previewSegId) return;
    const seg = segments.find((s) => s.id === previewSegId);
    if (!seg) return;
    const canvas = previewCanvasRef.current;
    const va = videoARef.current;
    const vb = videoBRef.current;
    if (!canvas || !va || !vb) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const video = seg.track === "A" ? va : vb;
    let raf = 0;
    const loop = () => {
      const cw = canvas.width;
      const ch = canvas.height;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, cw, ch);
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw > 0 && vh > 0) {
        const scale = Math.min(cw / vw, ch / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [previewSegId, segments]);

  return (
    <div className="space-y-10 text-zinc-200">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Video studio
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Load two takes (A and B), build an ordered timeline from either source, trim
          in and out, add mute spans to remove stray words or bad audio, then export WebM
          (video + audio) or audio-only WebM for remuxing elsewhere.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-violet-400">
              Take A
            </span>
            <label
              htmlFor={aInputId}
              className="cursor-pointer rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
            >
              Choose file
            </label>
            <input
              id={aInputId}
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => onPickA(e.target.files?.[0] ?? null)}
            />
          </div>
          <video
            key={videoA?.url ?? "a-empty"}
            ref={videoARef}
            src={videoA?.url}
            className="aspect-video w-full rounded-lg bg-black"
            controls
            onLoadedMetadata={onMetaA}
            onTimeUpdate={() => setScrubA(videoARef.current?.currentTime ?? 0)}
          />
          {videoA ? (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                Duration {formatTime(videoA.duration)} · playhead {formatTime(scrubA)}
              </p>
              <button
                type="button"
                className="mt-2 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                onClick={addFromScrubbers}
              >
                Add segment from A at playhead
              </button>
            </>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">No file loaded</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-amber-400">
              Take B
            </span>
            <label
              htmlFor={bInputId}
              className="cursor-pointer rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
            >
              Choose file
            </label>
            <input
              id={bInputId}
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => onPickB(e.target.files?.[0] ?? null)}
            />
          </div>
          <video
            key={videoB?.url ?? "b-empty"}
            ref={videoBRef}
            src={videoB?.url}
            className="aspect-video w-full rounded-lg bg-black"
            controls
            onLoadedMetadata={onMetaB}
            onTimeUpdate={() => setScrubB(videoBRef.current?.currentTime ?? 0)}
          />
          {videoB ? (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                Duration {formatTime(videoB.duration)} · playhead {formatTime(scrubB)}
              </p>
              <button
                type="button"
                className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
                onClick={addFromScrubbersB}
              >
                Add segment from B at playhead
              </button>
            </>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">No file loaded</p>
          )}
        </div>
      </div>

      {!bothLoaded ? (
        <p className="text-xs text-amber-200/80">
          Load both takes to enable export; you can still build segments from whichever
          file is loaded.
        </p>
      ) : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Timeline</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={exporting || segments.length === 0 || !bothLoaded}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
              onClick={exportWebm}
            >
              Export WebM
            </button>
            <button
              type="button"
              disabled={exporting || segments.length === 0 || !bothLoaded}
              className="rounded-md border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
              onClick={exportAudioOnly}
            >
              Export audio WebM
            </button>
          </div>
        </div>
        {exportNote ? (
          <p className="mt-2 text-xs text-zinc-400">{exportNote}</p>
        ) : null}
        {exporting ? (
          <p className="mt-1 text-xs text-zinc-500">Progress {exportPct}%</p>
        ) : null}
        <p className="mt-2 text-xs text-zinc-500">
          Output length ≈ {formatTime(totalDuration)} · export runs at real-time playback
          (one pass through the timeline).
        </p>

        <ul className="mt-4 space-y-2">
          {segments.map((s, index) => (
            <li
              key={s.id}
              className={`rounded-lg border p-3 text-sm ${
                selectedId === s.id
                  ? "border-violet-500/60 bg-violet-950/20"
                  : "border-zinc-800 bg-zinc-950/50"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-zinc-400 hover:text-white"
                  onClick={() => setSelectedId(s.id)}
                >
                  Select
                </button>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    s.track === "A" ? "bg-violet-900 text-violet-200" : "bg-amber-900 text-amber-100"
                  }`}
                >
                  {s.track}
                </span>
                <select
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                  value={s.track}
                  onChange={(e) =>
                    updateSegment(s.id, { track: e.target.value as TrackId })
                  }
                >
                  <option value="A">Source A</option>
                  <option value="B">Source B</option>
                </select>
                <label className="flex items-center gap-1 text-xs text-zinc-400">
                  In
                  <input
                    type="number"
                    step={0.01}
                    className="w-24 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-100"
                    value={Number(s.sourceIn.toFixed(3))}
                    onChange={(e) =>
                      updateSegment(s.id, { sourceIn: parseFloat(e.target.value) || 0 })
                    }
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-zinc-400">
                  Out
                  <input
                    type="number"
                    step={0.01}
                    className="w-24 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-100"
                    value={Number(s.sourceOut.toFixed(3))}
                    onChange={(e) =>
                      updateSegment(s.id, { sourceOut: parseFloat(e.target.value) || 0 })
                    }
                  />
                </label>
                <span className="text-xs text-zinc-500">
                  len {formatTime(s.sourceOut - s.sourceIn)}
                </span>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800"
                    onClick={() => moveSegment(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800"
                    onClick={() => moveSegment(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-900/50 px-2 py-0.5 text-xs text-red-300 hover:bg-red-950/40"
                    onClick={() => removeSegment(s.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {segments.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            Use the buttons under each take to append a clip at the current playhead. Edit
            in/out to drop bad endings or random extra takes.
          </p>
        ) : null}
      </div>

      {selectedSegment ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Audio cuts (selected segment)</h2>
            <button
              type="button"
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs hover:bg-zinc-700"
              onClick={addMuteToSelected}
            >
              Add mute span
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Seconds from the start of this segment (0 = segment in-point). Those ranges
            are silent in the exported mix.
          </p>
          <ul className="mt-3 space-y-2">
            {selectedMutes.map((m, idx) => (
              <li key={idx} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-zinc-500">#{idx + 1}</span>
                <label className="text-zinc-400">
                  from
                  <input
                    type="number"
                    step={0.01}
                    className="ml-1 w-20 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5"
                    value={m.from}
                    onChange={(e) =>
                      updateMute(selectedSegment.id, idx, {
                        from: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label className="text-zinc-400">
                  to
                  <input
                    type="number"
                    step={0.01}
                    className="ml-1 w-20 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5"
                    value={m.to}
                    onChange={(e) =>
                      updateMute(selectedSegment.id, idx, {
                        to: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="text-red-400 hover:underline"
                  onClick={() => removeMute(selectedSegment.id, idx)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <h3 className="text-xs font-medium text-zinc-400">Segment preview canvas</h3>
            <button
              type="button"
              className="mt-2 rounded border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800"
              onClick={() =>
                setPreviewSegId((cur) =>
                  cur === selectedSegment.id ? null : selectedSegment.id,
                )
              }
            >
              {previewSegId === selectedSegment.id
                ? "Stop preview draw"
                : "Mirror this segment to canvas"}
            </button>
            <canvas
              ref={previewCanvasRef}
              width={1280}
              height={720}
              className="mt-2 w-full max-w-xl rounded border border-zinc-800 bg-black"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
