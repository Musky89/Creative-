import { spawn } from "node:child_process";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Spawn a binary and capture stdout/stderr. Resolves regardless of exit code. */
export function run(
  bin: string,
  args: string[],
  opts?: { timeoutMs?: number; cwd?: string },
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd: opts?.cwd });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let killed = false;
    const timer = opts?.timeoutMs
      ? setTimeout(() => {
          killed = true;
          child.kill("SIGKILL");
        }, opts.timeoutMs)
      : null;
    child.stdout.on("data", (c: Buffer) => stdoutChunks.push(c));
    child.stderr.on("data", (c: Buffer) => stderrChunks.push(c));
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (killed) {
        reject(new Error(`${bin} timed out after ${opts?.timeoutMs}ms`));
        return;
      }
      resolve({
        code: code ?? -1,
        stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
      });
    });
  });
}

export async function ffmpeg(args: string[], opts?: { timeoutMs?: number }) {
  return run(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", ...args], opts);
}

export async function ffprobeJson(filePath: string): Promise<unknown> {
  const res = await run(
    FFPROBE,
    [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ],
    { timeoutMs: 60_000 },
  );
  if (res.code !== 0) {
    throw new Error(`ffprobe failed (${res.code}): ${res.stderr.slice(0, 500)}`);
  }
  return JSON.parse(res.stdout);
}

export interface ProbeInfo {
  durationSec: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio: boolean;
  hasVideo: boolean;
}

export async function probeMedia(filePath: string): Promise<ProbeInfo> {
  const data = (await ffprobeJson(filePath)) as {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      width?: number;
      height?: number;
      r_frame_rate?: string;
      avg_frame_rate?: string;
      duration?: string;
    }>;
  };
  const streams = data.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  const audio = streams.find((s) => s.codec_type === "audio");
  const fps = video ? parseFraction(video.r_frame_rate) ?? parseFraction(video.avg_frame_rate) : undefined;
  const duration = Number(data.format?.duration ?? video?.duration ?? audio?.duration ?? "0");
  return {
    durationSec: Number.isFinite(duration) ? duration : 0,
    width: video?.width,
    height: video?.height,
    fps,
    hasAudio: Boolean(audio),
    hasVideo: Boolean(video),
  };
}

function parseFraction(s?: string): number | undefined {
  if (!s) return undefined;
  const [a, b] = s.split("/").map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return undefined;
  const v = a / b;
  return Number.isFinite(v) ? v : undefined;
}

/**
 * Build a web-streamable proxy MP4 (h264/aac, faststart). We re-encode rather
 * than stream-copy because we cannot trust uploaded files (HEVC, prores, vp9
 * etc. won't play in <video>). Quality is set high enough for editing review.
 */
export async function makeProxy(
  inputPath: string,
  outputPath: string,
  opts?: { targetHeight?: number },
): Promise<void> {
  const targetH = opts?.targetHeight ?? 720;
  // scale=-2 keeps width even and preserves aspect.
  const vfChain = [
    `scale=-2:${targetH}:flags=bicubic`,
  ].join(",");
  const res = await ffmpeg(
    [
      "-i",
      inputPath,
      "-vf",
      vfChain,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    { timeoutMs: 30 * 60 * 1000 },
  );
  if (res.code !== 0) {
    throw new Error(`ffmpeg proxy failed: ${res.stderr.slice(0, 800)}`);
  }
}

export async function extractPoster(
  inputPath: string,
  outputPath: string,
  atSec = 1,
): Promise<void> {
  const res = await ffmpeg(
    [
      "-ss",
      String(atSec),
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=-2:480",
      outputPath,
    ],
    { timeoutMs: 60_000 },
  );
  if (res.code !== 0) {
    throw new Error(`ffmpeg poster failed: ${res.stderr.slice(0, 500)}`);
  }
}

/** Extract mono 16kHz wav (whisper-friendly) for transcription / VAD. */
export async function extractAudio16k(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  const res = await ffmpeg(
    [
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      outputPath,
    ],
    { timeoutMs: 30 * 60 * 1000 },
  );
  if (res.code !== 0) {
    throw new Error(`ffmpeg audio extract failed: ${res.stderr.slice(0, 500)}`);
  }
}

/**
 * Detect silence intervals using ffmpeg's `silencedetect` filter. Returns
 * loud (non-silent) windows, which is what the editor actually wants.
 */
export interface LoudWindow {
  start: number;
  end: number;
}

export async function detectLoudWindows(
  audioPath: string,
  opts?: { noiseDb?: number; minSilenceSec?: number; totalDurationSec: number },
): Promise<LoudWindow[]> {
  const noiseDb = opts?.noiseDb ?? -32;
  const minSil = opts?.minSilenceSec ?? 0.4;
  const total = opts?.totalDurationSec ?? 0;
  const res = await ffmpeg(
    [
      "-i",
      audioPath,
      "-af",
      `silencedetect=noise=${noiseDb}dB:d=${minSil}`,
      "-f",
      "null",
      "-",
    ],
    { timeoutMs: 10 * 60 * 1000 },
  );
  // silencedetect logs to stderr at info level — but we set loglevel=error in
  // ffmpeg(). Re-run with -loglevel info parsing instead.
  const res2 = await run(
    process.env.FFMPEG_PATH || "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "info",
      "-i",
      audioPath,
      "-af",
      `silencedetect=noise=${noiseDb}dB:d=${minSil}`,
      "-f",
      "null",
      "-",
    ],
    { timeoutMs: 10 * 60 * 1000 },
  );
  void res; // first call exists only to validate
  const stderr = res2.stderr;
  const silences: { start: number; end: number }[] = [];
  let pendingStart: number | null = null;
  for (const line of stderr.split("\n")) {
    const startM = line.match(/silence_start:\s*(-?\d+(?:\.\d+)?)/);
    const endM = line.match(/silence_end:\s*(-?\d+(?:\.\d+)?)/);
    if (startM) {
      pendingStart = Math.max(0, parseFloat(startM[1]));
    } else if (endM && pendingStart !== null) {
      silences.push({ start: pendingStart, end: parseFloat(endM[1]) });
      pendingStart = null;
    }
  }
  if (pendingStart !== null && total > 0) {
    silences.push({ start: pendingStart, end: total });
  }
  // Invert to loud windows.
  const loud: LoudWindow[] = [];
  let cursor = 0;
  for (const sil of silences) {
    if (sil.start > cursor) loud.push({ start: cursor, end: sil.start });
    cursor = Math.max(cursor, sil.end);
  }
  if (total > cursor) loud.push({ start: cursor, end: total });
  return loud.filter((w) => w.end - w.start > 0.05);
}
