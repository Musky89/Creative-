import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { analyseTranscript, defaultTimelineForClip } from "@/lib/video-editor/cleaner";
import type { Clip, VideoProject } from "@/lib/video-editor/types";
import {
  extractAudio16k,
  extractPoster,
  makeProxy,
  probeMedia,
} from "./ffmpeg";
import { mutateProject, projectAbsolutePath, projectDir } from "./storage";
import { transcribeAudio } from "./transcribe";

const ALLOWED_EXT = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"]);

/** Persist an uploaded video file into the project and queue processing. */
export async function ingestUpload(
  projectId: string,
  filename: string,
  data: Uint8Array,
  opts?: { takeLabel?: string; languageHint?: string },
): Promise<Clip> {
  const ext = path.extname(filename).toLowerCase() || ".mp4";
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`Unsupported video format: ${ext}`);
  }
  const clipId = `clip_${Date.now().toString(36)}_${randomUUID().slice(0, 6)}`;
  const dir = projectDir(projectId);
  await mkdir(path.join(dir, "clips", clipId), { recursive: true });
  const sourceRel = path.join("clips", clipId, `source${ext}`);
  const sourceAbs = projectAbsolutePath(projectId, sourceRel);
  await writeFile(sourceAbs, data);

  const now = new Date().toISOString();
  const baseClip: Clip = {
    id: clipId,
    projectId,
    name: path.basename(filename, ext),
    originalFilename: filename,
    sourcePath: sourceRel,
    status: "probing",
    takeLabel: opts?.takeLabel,
    createdAt: now,
    updatedAt: now,
  };
  await mutateProject(projectId, (p) => {
    p.clips.push(baseClip);
    return p;
  });

  // Kick off processing without blocking the response. We still await the
  // first probe so the response carries a richer clip; transcription is
  // background.
  try {
    await processNewClip(projectId, clipId, opts?.languageHint);
  } catch (e) {
    await mutateProject(projectId, (p) => {
      const c = p.clips.find((x) => x.id === clipId);
      if (c) {
        c.status = "failed";
        c.errorMessage = (e as Error).message;
      }
      return p;
    });
    throw e;
  }

  // Re-load latest version of clip
  const proj = await mutateProject(projectId, (p) => p);
  return proj.clips.find((c) => c.id === clipId)!;
}

async function processNewClip(
  projectId: string,
  clipId: string,
  languageHint?: string,
): Promise<void> {
  const dir = projectDir(projectId);
  const proj = await mutateProject(projectId, (p) => p);
  const clip = proj.clips.find((c) => c.id === clipId);
  if (!clip) throw new Error("Clip vanished from project.");
  const sourceAbs = path.join(dir, clip.sourcePath);

  // Probe.
  const probe = await probeMedia(sourceAbs);
  if (!probe.hasVideo) throw new Error("Uploaded file has no video stream.");

  // Proxy + poster.
  const proxyRel = path.join("clips", clipId, "proxy.mp4");
  const posterRel = path.join("clips", clipId, "poster.jpg");
  const audioRel = path.join("clips", clipId, "audio.wav");
  const proxyAbs = projectAbsolutePath(projectId, proxyRel);
  const posterAbs = projectAbsolutePath(projectId, posterRel);
  const audioAbs = projectAbsolutePath(projectId, audioRel);

  await Promise.all([
    makeProxy(sourceAbs, proxyAbs, { targetHeight: 720 }),
    extractPoster(sourceAbs, posterAbs, Math.min(1, probe.durationSec / 2)),
    probe.hasAudio
      ? extractAudio16k(sourceAbs, audioAbs)
      : Promise.resolve(),
  ]);

  await mutateProject(projectId, (p) => {
    const c = p.clips.find((x) => x.id === clipId);
    if (!c) return p;
    c.proxyPath = proxyRel;
    c.posterPath = posterRel;
    if (probe.hasAudio) c.audioPath = audioRel;
    c.durationSec = probe.durationSec;
    c.width = probe.width;
    c.height = probe.height;
    c.fps = probe.fps;
    c.status = probe.hasAudio ? "transcribing" : "ready";
    c.updatedAt = new Date().toISOString();
    return p;
  });

  if (probe.hasAudio) {
    const transcriptRaw = await transcribeAudio(audioAbs, {
      totalDurationSec: probe.durationSec,
      languageHint,
    });
    const analysed = analyseTranscript(transcriptRaw);
    await mutateProject(projectId, (p) => {
      const c = p.clips.find((x) => x.id === clipId);
      if (!c) return p;
      c.transcript = analysed;
      c.status = "ready";
      c.updatedAt = new Date().toISOString();
      // Auto-append default kept windows for this clip to the timeline so
      // the editor lands on a usable starting state.
      const segs = defaultTimelineForClip(c);
      p.timeline.push(...segs);
      return p;
    });
  } else {
    await mutateProject(projectId, (p) => {
      const c = p.clips.find((x) => x.id === clipId);
      if (!c) return p;
      const segs = defaultTimelineForClip(c);
      p.timeline.push(...segs);
      return p;
    });
  }
}

/** Re-run analyser only (after fillers list change). */
export async function reanalyseClip(
  projectId: string,
  clipId: string,
  extraFillers: ReadonlySet<string> = new Set(),
): Promise<VideoProject> {
  return mutateProject(projectId, (p) => {
    const c = p.clips.find((x) => x.id === clipId);
    if (!c || !c.transcript) return p;
    c.transcript = analyseTranscript(c.transcript, extraFillers);
    return p;
  });
}
