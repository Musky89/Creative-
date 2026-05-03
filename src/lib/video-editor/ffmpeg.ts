import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const exec = promisify(execFile);

const STORAGE_ROOT = process.env.STORAGE_ROOT || "./storage";
const VIDEO_EDITOR_DIR = path.join(STORAGE_ROOT, "video-editor");

export async function ensureStorageDir() {
  await fs.mkdir(VIDEO_EDITOR_DIR, { recursive: true });
  await fs.mkdir(path.join(VIDEO_EDITOR_DIR, "uploads"), { recursive: true });
  await fs.mkdir(path.join(VIDEO_EDITOR_DIR, "waveforms"), { recursive: true });
  await fs.mkdir(path.join(VIDEO_EDITOR_DIR, "thumbnails"), {
    recursive: true,
  });
  await fs.mkdir(path.join(VIDEO_EDITOR_DIR, "exports"), { recursive: true });
  await fs.mkdir(path.join(VIDEO_EDITOR_DIR, "segments"), { recursive: true });
}

export function getStoragePath(...parts: string[]) {
  return path.join(VIDEO_EDITOR_DIR, ...parts);
}

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  size: number;
}

export async function probeVideo(filePath: string): Promise<ProbeResult> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find(
    (s: Record<string, string>) => s.codec_type === "video"
  );
  const audioStream = data.streams?.find(
    (s: Record<string, string>) => s.codec_type === "audio"
  );

  const fpsStr = videoStream?.r_frame_rate || "30/1";
  const [num, den] = fpsStr.split("/").map(Number);
  const fps = den ? num / den : 30;

  return {
    duration: parseFloat(data.format?.duration || "0"),
    width: videoStream?.width || 1920,
    height: videoStream?.height || 1080,
    fps: Math.round(fps * 100) / 100,
    codec: videoStream?.codec_name || audioStream?.codec_name || "unknown",
    size: parseInt(data.format?.size || "0", 10),
  };
}

export async function generateWaveform(
  videoPath: string,
  outputPath: string,
  width = 1800,
  height = 120
): Promise<void> {
  await exec(
    "ffmpeg",
    [
      "-i",
      videoPath,
      "-filter_complex",
      `aformat=channel_layouts=mono,showwavepic=s=${width}x${height}:colors=#a78bfa`,
      "-frames:v",
      "1",
      "-y",
      outputPath,
    ],
    { timeout: 120_000 }
  );
}

export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  time = 1
): Promise<void> {
  await exec(
    "ffmpeg",
    [
      "-ss",
      String(time),
      "-i",
      videoPath,
      "-vframes",
      "1",
      "-vf",
      "scale=320:-1",
      "-y",
      outputPath,
    ],
    { timeout: 30_000 }
  );
}

export async function detectSilence(
  videoPath: string,
  threshold = -30,
  minDuration = 0.5
): Promise<Array<{ start: number; end: number; duration: number }>> {
  try {
    const { stderr } = await exec(
      "ffmpeg",
      [
        "-i",
        videoPath,
        "-af",
        `silencedetect=noise=${threshold}dB:d=${minDuration}`,
        "-f",
        "null",
        "-",
      ],
      { timeout: 300_000 }
    );

    const regions: Array<{ start: number; end: number; duration: number }> = [];
    const lines = stderr.split("\n");
    let currentStart: number | null = null;

    for (const line of lines) {
      const startMatch = line.match(/silence_start:\s*([\d.]+)/);
      if (startMatch) {
        currentStart = parseFloat(startMatch[1]);
      }
      const endMatch = line.match(
        /silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/
      );
      if (endMatch && currentStart !== null) {
        regions.push({
          start: currentStart,
          end: parseFloat(endMatch[1]),
          duration: parseFloat(endMatch[2]),
        });
        currentStart = null;
      }
    }

    return regions;
  } catch {
    return [];
  }
}

export async function extractSegment(
  videoPath: string,
  outputPath: string,
  startTime: number,
  endTime: number
): Promise<void> {
  const duration = endTime - startTime;
  await exec(
    "ffmpeg",
    [
      "-ss",
      String(startTime),
      "-i",
      videoPath,
      "-t",
      String(duration),
      "-c",
      "copy",
      "-avoid_negative_ts",
      "make_zero",
      "-y",
      outputPath,
    ],
    { timeout: 300_000 }
  );
}

export async function concatenateSegments(
  segmentPaths: string[],
  outputPath: string,
  resolution?: string
): Promise<void> {
  const listPath = outputPath + ".list.txt";
  const listContent = segmentPaths
    .map((p) => `file '${path.resolve(p)}'`)
    .join("\n");
  await fs.writeFile(listPath, listContent);

  const args = ["-f", "concat", "-safe", "0", "-i", listPath];

  if (resolution && resolution !== "original") {
    const scaleMap: Record<string, string> = {
      "1080p": "1920:1080",
      "720p": "1280:720",
      "480p": "854:480",
    };
    const scale = scaleMap[resolution];
    if (scale) {
      args.push(
        "-vf",
        `scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale}:(ow-iw)/2:(oh-ih)/2`
      );
    }
  }

  args.push("-c:v", "libx264", "-c:a", "aac", "-y", outputPath);

  await exec("ffmpeg", args, { timeout: 600_000 });

  await fs.unlink(listPath).catch(() => {});
}

export async function generateWaveformData(
  videoPath: string,
  samples = 500
): Promise<number[]> {
  try {
    const { stdout } = await exec(
      "ffmpeg",
      [
        "-i",
        videoPath,
        "-ac",
        "1",
        "-filter:a",
        `aresample=8000,asetnsamples=n=${samples}`,
        "-f",
        "f32le",
        "-acodec",
        "pcm_f32le",
        "-",
      ],
      { timeout: 120_000, maxBuffer: 50 * 1024 * 1024 }
    );

    const buffer = Buffer.from(stdout, "binary");
    const floats: number[] = [];
    for (let i = 0; i < buffer.length - 3; i += 4) {
      floats.push(Math.abs(buffer.readFloatLE(i)));
    }

    const max = Math.max(...floats, 0.001);
    return floats.map((v) => v / max);
  } catch {
    return Array(samples).fill(0.1);
  }
}
