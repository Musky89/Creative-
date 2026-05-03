import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ClipTranscript, TranscriptSegment, Word } from "@/lib/video-editor/types";
import { detectLoudWindows } from "./ffmpeg";

const OPENAI_API = "https://api.openai.com/v1/audio/transcriptions";

/** Up to ~24MB Whisper limit; we chunk above this. */
const MAX_WHISPER_BYTES = 24 * 1024 * 1024;

interface OpenAIWord {
  word: string;
  start: number;
  end: number;
}

interface OpenAISegment {
  id?: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
}

interface OpenAIVerboseResponse {
  language?: string;
  duration?: number;
  text?: string;
  words?: OpenAIWord[];
  segments?: OpenAISegment[];
}

/**
 * Transcribe an extracted 16k mono wav. Uses OpenAI Whisper-1 via REST when
 * `OPENAI_API_KEY` is set; otherwise falls back to a deterministic
 * silence-based segmentation (no real text, but the timeline is still
 * editable).
 */
export async function transcribeAudio(
  audioPath: string,
  opts: { totalDurationSec: number; languageHint?: string },
): Promise<ClipTranscript> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return await silenceFallbackTranscript(audioPath, opts.totalDurationSec);
  }
  try {
    const sz = (await stat(audioPath)).size;
    if (sz <= MAX_WHISPER_BYTES) {
      const resp = await whisperOnce(apiKey, audioPath, opts.languageHint);
      return openAIToTranscript(resp);
    }
    // For very long files we'd chunk by silence and stitch. Most founder
    // takes are short enough for the single-file path; we degrade gracefully.
    return await silenceFallbackTranscript(audioPath, opts.totalDurationSec);
  } catch (e) {
    console.warn(
      "[video-editor] Whisper transcription failed, falling back to silence detect:",
      (e as Error).message,
    );
    return await silenceFallbackTranscript(audioPath, opts.totalDurationSec);
  }
}

async function whisperOnce(
  apiKey: string,
  filePath: string,
  language?: string,
): Promise<OpenAIVerboseResponse> {
  const buf = await readFile(filePath);
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buf)], { type: "audio/wav" });
  form.append("file", blob, path.basename(filePath));
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  if (language) form.append("language", language);
  const res = await fetch(OPENAI_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI Whisper ${res.status}: ${text.slice(0, 500)}`);
  }
  return (await res.json()) as OpenAIVerboseResponse;
}

function openAIToTranscript(r: OpenAIVerboseResponse): ClipTranscript {
  const allWords: Word[] = (r.words ?? []).map((w) => ({
    text: w.word.trim(),
    start: w.start,
    end: w.end,
  }));
  const segments: TranscriptSegment[] = (r.segments ?? []).map((s, idx) => {
    const segWords = allWords.filter(
      (w) => w.end > s.start - 1e-3 && w.start < s.end + 1e-3,
    );
    return {
      id: `s_${idx}`,
      start: s.start,
      end: s.end,
      text: s.text.trim(),
      words: segWords,
      meta: {
        avg_logprob: s.avg_logprob,
        no_speech_prob: s.no_speech_prob,
      },
    };
  });
  // If segments are missing but words exist, synthesise one segment.
  if (segments.length === 0 && allWords.length > 0) {
    segments.push({
      id: "s_0",
      start: allWords[0].start,
      end: allWords[allWords.length - 1].end,
      text: allWords.map((w) => w.text).join(" "),
      words: allWords,
    });
  }
  return {
    language: r.language,
    source: "openai-whisper",
    segments,
    words: allWords,
  };
}

/**
 * Fallback "transcript" when no OpenAI key is configured: detect loud windows
 * with ffmpeg and emit one synthetic word per window labelled `[speech]`. This
 * means transcript-driven trimming and silence removal still work.
 */
async function silenceFallbackTranscript(
  audioPath: string,
  totalDurationSec: number,
): Promise<ClipTranscript> {
  const windows = await detectLoudWindows(audioPath, {
    totalDurationSec,
    noiseDb: -34,
    minSilenceSec: 0.35,
  });
  const words: Word[] = windows.map((w, i) => ({
    text: `[speech ${i + 1}]`,
    start: w.start,
    end: w.end,
    flag: "silence",
  }));
  const segments: TranscriptSegment[] = windows.map((w, i) => ({
    id: `s_${i}`,
    start: w.start,
    end: w.end,
    text: `[speech ${i + 1}]`,
    words: [words[i]],
  }));
  return {
    source: "silence-fallback",
    segments,
    words,
  };
}
