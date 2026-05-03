/**
 * Pure helpers for analysing transcripts and producing edit decisions.
 * No Node deps so this can also run in the browser if we ever want.
 */

import {
  DEFAULT_FILLERS,
  normaliseToken,
  type Clip,
  type ClipTranscript,
  type TimelineSegment,
  type Word,
} from "./types";

export interface FlaggedWord extends Word {
  index: number;
  flag: NonNullable<Word["flag"]>;
}

/**
 * Walk a transcript and tag tokens we'd usually want to remove:
 *   - filler words from `extraFillers ∪ DEFAULT_FILLERS`
 *   - immediate repeats of the same normalised token
 *
 * Returns a NEW transcript (input is not mutated).
 */
export function analyseTranscript(
  transcript: ClipTranscript,
  extraFillers: ReadonlySet<string> = new Set(),
): ClipTranscript {
  const fillers = new Set<string>([...DEFAULT_FILLERS, ...extraFillers]);
  const words: Word[] = transcript.words.map((w) => ({ ...w, flag: undefined }));
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w.flag === "silence") continue;
    const tok = normaliseToken(w.text);
    if (!tok) continue;
    if (fillers.has(tok)) {
      w.flag = "filler";
      continue;
    }
    if (i > 0) {
      const prev = words[i - 1];
      if (prev.flag !== "silence" && normaliseToken(prev.text) === tok) {
        w.flag = "repeat";
      }
    }
  }
  // Re-project words back into segments.
  const segments = transcript.segments.map((s) => {
    const segWords = words.filter(
      (w) => w.end > s.start - 1e-3 && w.start < s.end + 1e-3,
    );
    return { ...s, words: segWords };
  });
  return { ...transcript, words, segments };
}

export function flaggedWords(transcript: ClipTranscript): FlaggedWord[] {
  const out: FlaggedWord[] = [];
  transcript.words.forEach((w, idx) => {
    if (w.flag) out.push({ ...w, flag: w.flag, index: idx });
  });
  return out;
}

/**
 * Given a clip with a transcript, produce a default keep-set that excludes
 * flagged words AND silences > `maxGapSec`.
 *
 * Returns indexes of words to KEEP.
 */
export function defaultKeptWordIndexes(
  transcript: ClipTranscript,
  opts?: { dropFillers?: boolean; dropRepeats?: boolean },
): number[] {
  const dropFillers = opts?.dropFillers ?? true;
  const dropRepeats = opts?.dropRepeats ?? true;
  const out: number[] = [];
  transcript.words.forEach((w, idx) => {
    if (w.flag === "silence") return;
    if (dropFillers && w.flag === "filler") return;
    if (dropRepeats && w.flag === "repeat") return;
    out.push(idx);
  });
  return out;
}

/**
 * Convert a sorted array of kept word indexes into contiguous time windows
 * within the clip. We also bridge gaps shorter than `bridgeSec` so we don't
 * produce micro-cuts on tiny silences between adjacent kept words.
 */
export interface KeepWindow {
  start: number;
  end: number;
}

export function wordIndexesToKeepWindows(
  transcript: ClipTranscript,
  keptIndexes: number[],
  opts?: { bridgeSec?: number; padSec?: number; maxDurationSec?: number },
): KeepWindow[] {
  const bridge = opts?.bridgeSec ?? 0.18;
  const pad = opts?.padSec ?? 0.06;
  const max = opts?.maxDurationSec;
  if (keptIndexes.length === 0) return [];
  const sorted = [...keptIndexes].sort((a, b) => a - b);
  const windows: KeepWindow[] = [];
  for (const idx of sorted) {
    const w = transcript.words[idx];
    if (!w) continue;
    const start = Math.max(0, w.start - pad);
    const end = (max !== undefined ? Math.min(max, w.end + pad) : w.end + pad);
    const last = windows[windows.length - 1];
    if (last && start - last.end <= bridge) {
      last.end = Math.max(last.end, end);
    } else {
      windows.push({ start, end });
    }
  }
  return windows;
}

/**
 * Build a default timeline for a single clip by keeping only the
 * non-flagged words. Used when a clip is first added.
 */
export function defaultTimelineForClip(
  clip: Clip,
  opts?: { dropFillers?: boolean; dropRepeats?: boolean; bridgeSec?: number },
): TimelineSegment[] {
  if (!clip.transcript) {
    if (clip.durationSec === undefined) return [];
    return [
      {
        id: `${clip.id}_full`,
        clipId: clip.id,
        start: 0,
        end: clip.durationSec,
      },
    ];
  }
  const kept = defaultKeptWordIndexes(clip.transcript, opts);
  const windows = wordIndexesToKeepWindows(clip.transcript, kept, {
    bridgeSec: opts?.bridgeSec,
    maxDurationSec: clip.durationSec,
  });
  return windows.map((w, idx) => ({
    id: `${clip.id}_seg_${idx}_${Math.round(w.start * 1000)}`,
    clipId: clip.id,
    start: w.start,
    end: w.end,
  }));
}

export function timelineDurationSec(
  segments: TimelineSegment[],
): number {
  let total = 0;
  segments.forEach((s, idx) => {
    const dur = Math.max(0, s.end - s.start);
    const xfade = idx > 0 ? Math.min(s.transitionInSec ?? 0, dur) : 0;
    total += dur - xfade;
  });
  return total;
}
