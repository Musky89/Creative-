"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VideoSlot = "primary" | "alternate";

type LoadedVideo = {
  id: VideoSlot;
  label: string;
  fileName: string;
  url: string;
  duration: number | null;
};

type ClipIntent = "keep" | "cut";

type ClipRange = {
  id: string;
  source: VideoSlot;
  intent: ClipIntent;
  label: string;
  start: number;
  end: number;
};

type TranscriptHit = {
  id: string;
  word: string;
  reason: string;
  line: number;
  timecode?: string;
};

type EditPlan = {
  projectName: string;
  generatedAt: string;
  sources: Array<{
    id: VideoSlot;
    label: string;
    fileName: string;
    durationSeconds: number | null;
  }>;
  timeline: ClipRange[];
  transcriptCleanup: {
    removedWords: TranscriptHit[];
    cleanedTranscript: string;
  };
  ffmpegNotes: string[];
};

const DEFAULT_FILLERS = [
  "um",
  "uh",
  "erm",
  "ah",
  "like",
  "basically",
  "literally",
  "actually",
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "okay",
  "right",
];

const NOISE_TOKENS = ["[noise]", "[breath]", "[laugh]", "[cough]", "[pause]", "[silence]"];

const TIMECODE_PATTERN =
  /(?:\[(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)\]|^(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?))/;

function formatTime(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return "--:--";
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 10);
  const hh = hours > 0 ? `${hours}:` : "";
  return `${hh}${String(minutes).padStart(hours > 0 ? 2 : 1, "0")}:${String(secs).padStart(2, "0")}.${ms}`;
}

function normalizeToken(token: string) {
  return token.toLowerCase().replace(/^[^\w[]+|[^\w\]]+$/g, "");
}

function extractTimecode(line: string) {
  const match = line.match(TIMECODE_PATTERN);
  return match?.[1] ?? match?.[2];
}

function transcriptAnalysis(transcript: string, bannedWords: string[]) {
  const fillerSet = new Set([...DEFAULT_FILLERS, ...bannedWords.map((w) => w.trim().toLowerCase()).filter(Boolean)]);
  const noiseSet = new Set(NOISE_TOKENS);
  const hits: TranscriptHit[] = [];
  const normalizedTranscript = transcript.replace(/\\n/g, "\n");
  const cleanedLines = normalizedTranscript.split(/\r?\n/).map((line, lineIndex) => {
    const timecode = extractTimecode(line);
    const tokens = line.split(/(\s+)/);
    const output: string[] = [];
    let previousKept = "";

    for (let index = 0; index < tokens.length; index += 1) {
      const part = tokens[index];
      if (/^\s+$/.test(part)) {
        output.push(part);
        continue;
      }

      const normalized = normalizeToken(part);
      const nextToken = tokens.slice(index + 1).find((token) => token.trim().length > 0);
      const normalizedPair = nextToken ? `${normalized} ${normalizeToken(nextToken)}` : "";
      const isNoise = noiseSet.has(normalized);
      const isSingleFiller = fillerSet.has(normalized);
      const isPhraseStart = fillerSet.has(normalizedPair);
      const isRepeat = normalized.length > 1 && normalized === previousKept;
      const remove = isNoise || isSingleFiller || isPhraseStart || isRepeat;

      if (remove) {
        hits.push({
          id: `${lineIndex}-${hits.length}-${normalized}`,
          word: isPhraseStart && nextToken ? `${part.trim()} ${nextToken.trim()}` : part.trim(),
          reason: isNoise ? "noise marker" : isRepeat ? "repeated word" : "filler phrase",
          line: lineIndex + 1,
          timecode,
        });
        if (isPhraseStart && nextToken) {
          const nextIndex = tokens.indexOf(nextToken, index + 1);
          if (nextIndex > index) index = nextIndex;
        }
        continue;
      }

      if (normalized) previousKept = normalized;
      output.push(part);
    }

    return output
      .join("")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();
  });

  return {
    hits,
    cleanedTranscript: cleanedLines.filter(Boolean).join("\n"),
  };
}

function buildFfmpegNotes(plan: EditPlan) {
  const keepRanges = plan.timeline.filter((range) => range.intent === "keep");
  if (keepRanges.length === 0) {
    return [
      "No keep ranges have been marked yet. Add keep ranges from the primary or alternate take before rendering.",
    ];
  }
  return keepRanges
    .map((range, index) => {
      const sourceName = range.source === "primary" ? "primary.mp4" : "alternate.mp4";
      const segmentName = `segment_${String(index + 1).padStart(2, "0")}.mp4`;
      return `Segment ${index + 1}: ffmpeg -i ${sourceName} -ss ${formatTime(range.start)} -to ${formatTime(range.end)} -c:v libx264 -c:a aac ${segmentName}`;
    })
    .concat("Then concatenate the rendered segments with ffmpeg concat demuxer in the listed order.");
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadText(filename: string, value: string) {
  const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AdvancedVideoEditor() {
  const [videos, setVideos] = useState<Record<VideoSlot, LoadedVideo | null>>({
    primary: null,
    alternate: null,
  });
  const [activeSource, setActiveSource] = useState<VideoSlot>("primary");
  const [ranges, setRanges] = useState<ClipRange[]>([]);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeLabel, setRangeLabel] = useState("Best delivery");
  const [rangeIntent, setRangeIntent] = useState<ClipIntent>("keep");
  const [tailStart, setTailStart] = useState("");
  const [transcript, setTranscript] = useState("");
  const [bannedWords, setBannedWords] = useState("basically, um, uh, you know");
  const [projectName, setProjectName] = useState("two-take-clean-edit");
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  const analysis = useMemo(
    () => transcriptAnalysis(transcript, bannedWords.split(",")),
    [bannedWords, transcript],
  );

  const activeVideo = videos[activeSource];
  const sortedRanges = useMemo(
    () => [...ranges].sort((a, b) => a.start - b.start || a.source.localeCompare(b.source)),
    [ranges],
  );

  const plan: EditPlan = useMemo(() => {
    const basePlan: EditPlan = {
      projectName,
      generatedAt: new Date().toISOString(),
      sources: (["primary", "alternate"] as VideoSlot[]).map((slot) => ({
        id: slot,
        label: slot === "primary" ? "Main take" : "Alternate / random takes",
        fileName: videos[slot]?.fileName ?? "not loaded",
        durationSeconds: videos[slot]?.duration ?? null,
      })),
      timeline: sortedRanges,
      transcriptCleanup: {
        removedWords: analysis.hits,
        cleanedTranscript: analysis.cleanedTranscript,
      },
      ffmpegNotes: [],
    };
    return { ...basePlan, ffmpegNotes: buildFfmpegNotes(basePlan) };
  }, [analysis.cleanedTranscript, analysis.hits, projectName, sortedRanges, videos]);

  function onVideoSelected(slot: VideoSlot, file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    setVideos((current) => {
      if (current[slot]) {
        URL.revokeObjectURL(current[slot].url);
        objectUrlsRef.current.delete(current[slot].url);
      }
      return {
        ...current,
        [slot]: {
          id: slot,
          label: slot === "primary" ? "Main take" : "Alternate / random takes",
          fileName: file.name,
          url,
          duration: null,
        },
      };
    });
    setActiveSource(slot);
  }

  function updateDuration(slot: VideoSlot, duration: number) {
    setVideos((current) => ({
      ...current,
      [slot]: current[slot] ? { ...current[slot], duration } : null,
    }));
  }

  function markStart() {
    setRangeStart(videoRef.current?.currentTime ?? 0);
  }

  function addRange() {
    const current = videoRef.current?.currentTime ?? 0;
    const start = rangeStart ?? Math.max(0, current - 5);
    const end = Math.max(start + 0.1, current);
    setRanges((existing) => [
      ...existing,
      {
        id: crypto.randomUUID(),
        source: activeSource,
        intent: rangeIntent,
        label: rangeLabel.trim() || (rangeIntent === "keep" ? "Keep" : "Cut"),
        start,
        end,
      },
    ]);
    setRangeStart(null);
  }

  function markTailCut() {
    const duration = videos.primary?.duration;
    const start = Number(tailStart);
    if (!duration || Number.isNaN(start) || start <= 0 || start >= duration) return;
    setRanges((existing) => [
      ...existing,
      {
        id: crypto.randomUUID(),
        source: "primary",
        intent: "cut",
        label: "Remove random takes at end",
        start,
        end: duration,
      },
    ]);
  }

  async function copyPlan() {
    await navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-violet-500/20 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_34%),rgba(24,24,27,0.72)] p-6 shadow-2xl shadow-violet-950/10">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-violet-200 uppercase">
              Two-take editorial command center
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Upload both takes, isolate the strongest delivery, and cut filler before render.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
              This tool creates a practical edit plan: source timing, keep/cut ranges,
              transcript cleanup, tail cleanup for extra takes, and render instructions you can
              hand to FFmpeg or a human editor.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-700/70 bg-zinc-950/55 p-4">
            <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase" htmlFor="project-name">
              Project slug
            </label>
            <input
              id="project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400"
            />
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-xl bg-zinc-900/80 p-3">
                <p className="text-lg font-semibold text-zinc-50">{Object.values(videos).filter(Boolean).length}/2</p>
                <p className="text-zinc-500">videos</p>
              </div>
              <div className="rounded-xl bg-zinc-900/80 p-3">
                <p className="text-lg font-semibold text-zinc-50">{ranges.length}</p>
                <p className="text-zinc-500">ranges</p>
              </div>
              <div className="rounded-xl bg-zinc-900/80 p-3">
                <p className="text-lg font-semibold text-zinc-50">{analysis.hits.length}</p>
                <p className="text-zinc-500">word cuts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {(["primary", "alternate"] as VideoSlot[]).map((slot) => (
          <label
            key={slot}
            className={`block rounded-2xl border p-5 transition ${
              activeSource === slot ? "border-violet-400 bg-violet-950/20" : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium text-zinc-100">
                  {slot === "primary" ? "Main video" : "Second video / extra takes"}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {videos[slot]?.fileName ?? "Upload MP4, MOV, WebM, or any browser-playable file"}
                </span>
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
                {formatTime(videos[slot]?.duration)}
              </span>
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={(event) => onVideoSelected(slot, event.target.files?.[0])}
              className="mt-4 block w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 text-sm text-zinc-300 file:mr-4 file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-950"
            />
            <button
              type="button"
              onClick={() => setActiveSource(slot)}
              className="mt-3 text-xs font-medium text-violet-200 hover:text-violet-100"
            >
              Edit this source
            </button>
          </label>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Preview and range marking</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Scrub to a moment, mark a start, scrub to the end, then save as keep or cut.
              </p>
            </div>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
              {activeVideo?.label ?? "No source selected"}
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            {activeVideo ? (
              <video
                ref={videoRef}
                src={activeVideo.url}
                controls
                className="aspect-video w-full bg-black"
                onLoadedMetadata={(event) => updateDuration(activeSource, event.currentTarget.duration)}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-zinc-500">
                Upload a video to begin.
              </div>
            )}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <input
              value={rangeLabel}
              onChange={(event) => setRangeLabel(event.target.value)}
              placeholder="Range label"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400"
            />
            <select
              value={rangeIntent}
              onChange={(event) => setRangeIntent(event.target.value as ClipIntent)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400"
            >
              <option value="keep">Keep in final</option>
              <option value="cut">Remove from source</option>
            </select>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
              Start: {formatTime(rangeStart)}
            </div>
            <button
              type="button"
              onClick={markStart}
              disabled={!activeVideo}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark start
            </button>
            <button
              type="button"
              onClick={addRange}
              disabled={!activeVideo}
              className="rounded-xl bg-violet-300 px-4 py-2 text-sm font-semibold text-violet-950 hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save range
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-100">Tail cleanup</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            If the main video has random takes at the end, enter the second where the final usable
            take ends. The tool adds a hard cut through the end of the source.
          </p>
          <div className="mt-4 flex gap-3">
            <input
              value={tailStart}
              onChange={(event) => setTailStart(event.target.value)}
              inputMode="decimal"
              placeholder="e.g. 84.5"
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400"
            />
            <button
              type="button"
              onClick={markTailCut}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
            >
              Cut tail
            </button>
          </div>
          <div className="mt-5 rounded-xl bg-zinc-950/70 p-4 text-xs text-zinc-400">
            Main duration: <span className="text-zinc-200">{formatTime(videos.primary?.duration)}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-100">Transcript cleanup</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Paste a transcript with optional timecodes. Fillers, repeated words, and noise markers
            are removed from the clean script and logged as edit targets.
          </p>
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="[00:02.1] Um I basically think this is the best take&#10;[00:06.8] right right let's remove the noisy ending [noise]"
            className="mt-4 min-h-48 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none focus:border-violet-400"
          />
          <label className="mt-4 block text-xs font-medium text-zinc-500" htmlFor="banned-words">
            Extra words or phrases to remove
          </label>
          <input
            id="banned-words"
            value={bannedWords}
            onChange={(event) => setBannedWords(event.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400"
          />
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-100">Clean script</h2>
            <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
              {analysis.hits.length} removals
            </span>
          </div>
          <pre className="mt-4 max-h-48 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs leading-5 whitespace-pre-wrap text-zinc-300">
            {analysis.cleanedTranscript || "Clean transcript appears here."}
          </pre>
          <div className="mt-4 max-h-44 overflow-auto rounded-xl border border-zinc-800">
            {analysis.hits.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No filler or noise words detected yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-800 text-xs">
                {analysis.hits.slice(0, 40).map((hit) => (
                  <li key={hit.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span className="text-zinc-200">{hit.word}</span>
                    <span className="text-zinc-500">
                      {hit.timecode ? `${hit.timecode} · ` : ""}line {hit.line} · {hit.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Edit decision list</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Review every keep/cut decision before exporting the plan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyPlan}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
            >
              Copy plan
            </button>
            <button
              type="button"
              onClick={() => downloadText(`${projectName || "video-edit"}-clean-transcript.txt`, analysis.cleanedTranscript)}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
            >
              Download transcript
            </button>
            <button
              type="button"
              onClick={() => downloadJson(`${projectName || "video-edit"}-edl.json`, plan)}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-white"
            >
              Export EDL
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
          {sortedRanges.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No ranges yet. Mark your first keep or cut from the preview.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Intent</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Range</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {sortedRanges.map((range) => (
                  <tr key={range.id}>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 font-medium ${range.intent === "keep" ? "bg-emerald-400/10 text-emerald-200" : "bg-red-400/10 text-red-200"}`}>
                        {range.intent}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{range.source}</td>
                    <td className="px-4 py-3 text-zinc-100">{range.label}</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      {formatTime(range.start)} → {formatTime(range.end)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setRanges((existing) => existing.filter((item) => item.id !== range.id))}
                        className="text-zinc-500 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Render notes</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-5 text-zinc-300">
            {plan.ffmpegNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
