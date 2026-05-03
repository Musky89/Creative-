/**
 * Shared video editor types. Used by both server (Node) and browser code.
 *
 * The editor is intentionally **file-backed**: a project lives entirely in
 *   <STORAGE_ROOT>/video-editor/<projectId>/
 * with `project.json` as the source of truth. This means the editor functions
 * even when Postgres / Prisma is unavailable.
 */

export type ProjectStatus = "draft" | "ready" | "rendering" | "rendered";

export type ClipStatus =
  | "uploading"
  | "probing"
  | "transcribing"
  | "ready"
  | "failed";

export interface Word {
  /** Cleaned token (no leading whitespace). */
  text: string;
  /** Seconds from clip start. */
  start: number;
  /** Seconds from clip start. */
  end: number;
  /** Whisper confidence (0-1) when available. */
  confidence?: number;
  /**
   * Optional classification flag set by post-processing:
   *  - `filler`  — um, uh, like, you know, etc.
   *  - `repeat`  — duplicate of preceding word
   *  - `silence` — synthetic word inserted from VAD when no transcript
   */
  flag?: "filler" | "repeat" | "silence";
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: Word[];
  /** Whisper avg_logprob, no_speech_prob etc — opaque to UI. */
  meta?: Record<string, unknown>;
}

export interface ClipTranscript {
  language?: string;
  /** Source: real Whisper transcript, or silence-detect fallback. */
  source: "openai-whisper" | "silence-fallback" | "manual";
  segments: TranscriptSegment[];
  /** Flat words array (cached projection of segments[].words for fast UI). */
  words: Word[];
}

export interface Clip {
  id: string;
  projectId: string;
  /** Display label (filename or user-set take name). */
  name: string;
  status: ClipStatus;
  /** Optional human label e.g. "Take 1". */
  takeLabel?: string;
  /** Original uploaded filename. */
  originalFilename: string;
  /** Path relative to project dir. */
  sourcePath: string;
  /** Path relative to project dir; web-streamable proxy (mp4 h264/aac). */
  proxyPath?: string;
  /** Path relative to project dir; poster image. */
  posterPath?: string;
  /** Path relative to project dir; mono 16k wav for whisper / VAD. */
  audioPath?: string;
  /** Probe results. */
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  /** Server timestamps (ISO). */
  createdAt: string;
  updatedAt: string;
  /** Transcript (may be undefined while transcribing). */
  transcript?: ClipTranscript;
  /** Last error message if status === "failed". */
  errorMessage?: string;
}

/**
 * A single segment of the final timeline. Each segment refers back to the
 * source clip + a [start, end] window in *clip* time. The renderer will
 * trim and concat in order.
 */
export interface TimelineSegment {
  id: string;
  clipId: string;
  start: number;
  end: number;
  /**
   * Seconds of crossfade *into* this segment from the previous one.
   * 0 = hard cut. The renderer applies an audio+video xfade over the boundary.
   */
  transitionInSec?: number;
  /** Optional label for UI. */
  label?: string;
}

export interface RenderOutput {
  id: string;
  /** Path relative to project dir. */
  path: string;
  createdAt: string;
  durationSec?: number;
  /** Settings used. */
  settings: RenderSettings;
}

export interface RenderSettings {
  /** Output resolution height (width auto from first clip). */
  targetHeight?: 1080 | 720 | 480;
  /** Target FPS (omit = use first clip). */
  fps?: number;
  /** CRF (lower = higher quality). */
  crf?: number;
  /** Audio bitrate, e.g. "192k". */
  audioBitrate?: string;
  /** Default crossfade applied between segments with no explicit value. */
  defaultCrossfadeSec?: number;
}

export interface VideoProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  clips: Clip[];
  timeline: TimelineSegment[];
  /** Most recent render output(s); newest first. */
  renders: RenderOutput[];
  /** Free-form notes. */
  notes?: string;
}

/** Default English filler tokens used by the cleaner. */
export const DEFAULT_FILLERS: ReadonlySet<string> = new Set([
  "um",
  "uh",
  "uhh",
  "umm",
  "erm",
  "ah",
  "hmm",
  "like",
  "y'know",
  "you-know",
  "actually",
  "basically",
  "literally",
  "kinda",
  "sorta",
  "right?",
  "okay",
  "ok",
  "so",
]);

/** Lower-case + strip trailing punctuation for filler / repeat matching. */
export function normaliseToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[\s"'(\[{]+/, "")
    .replace(/[\s"'.,!?;:)\]}]+$/, "")
    .trim();
}
