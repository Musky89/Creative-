import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import type {
  Clip,
  RenderOutput,
  RenderSettings,
  VideoProject,
} from "@/lib/video-editor/types";
import { ffmpeg } from "./ffmpeg";
import { projectAbsolutePath, projectDir } from "./storage";

/**
 * Render a project's timeline into a single MP4. The strategy:
 *
 *  1. For each timeline segment, declare an `-i SOURCE -ss S -to E` slice.
 *     We use input-level seek so ffmpeg can decode efficiently.
 *  2. For each input, scale + sar-normalise + setpts/asetpts so the streams
 *     are compatible regardless of source resolution / framerate.
 *  3. Concat segments in order. If `defaultCrossfadeSec` > 0 OR any segment
 *     has `transitionInSec > 0`, we use successive `xfade` / `acrossfade`
 *     pairs over the boundaries; otherwise we just `concat`.
 *
 * Output is written to `<project>/renders/<id>.mp4` and the project's
 * `renders` array is appended (newest last).
 */
export async function renderProject(
  project: VideoProject,
  settings: RenderSettings = {},
): Promise<{ project: VideoProject; render: RenderOutput }> {
  if (project.timeline.length === 0) {
    throw new Error("Timeline is empty — add at least one segment.");
  }

  const renderId = `r_${Date.now().toString(36)}_${randomUUID().slice(0, 6)}`;
  const renderRel = path.join("renders", `${renderId}.mp4`);
  const renderAbs = projectAbsolutePath(project.id, renderRel);
  await mkdir(path.dirname(renderAbs), { recursive: true });

  const targetH = settings.targetHeight ?? 720;
  const fpsTarget = settings.fps ?? guessFps(project.clips);
  const crf = String(settings.crf ?? 20);
  const audioBitrate = settings.audioBitrate ?? "192k";
  const defaultXfade = Math.max(0, settings.defaultCrossfadeSec ?? 0);

  const dir = projectDir(project.id);
  const clipById = new Map(project.clips.map((c) => [c.id, c]));

  const inputs: string[] = [];
  const filterParts: string[] = [];
  const segLabels: { v: string; a: string; durationSec: number; xfade: number }[] = [];

  project.timeline.forEach((seg, idx) => {
    const clip = clipById.get(seg.clipId);
    if (!clip || !clip.sourcePath) {
      throw new Error(`Timeline references missing clip ${seg.clipId}.`);
    }
    const src = path.join(dir, clip.sourcePath);
    const start = Math.max(0, seg.start);
    const end = Math.max(start + 0.05, seg.end);
    const segDur = end - start;
    inputs.push(
      "-ss",
      start.toFixed(3),
      "-to",
      end.toFixed(3),
      "-i",
      src,
    );
    const inIdx = idx;
    const vIn = `[${inIdx}:v:0]`;
    const vLabel = `v${idx}`;
    const aLabel = `a${idx}`;
    // settb=1/1000 normalises timebase so xfade/concat don't barf on
    // mixed-input timebases (h264 in mp4 reports 1/1000000 after seek).
    filterParts.push(
      `${vIn}scale=-2:${targetH}:flags=bicubic,setsar=1,fps=${fpsTarget},format=yuv420p,setpts=PTS-STARTPTS,settb=1/${fpsTarget}[${vLabel}]`,
    );
    if (clip.audioPath) {
      const aIn = `[${inIdx}:a:0]`;
      filterParts.push(
        `${aIn}aresample=48000,aformat=channel_layouts=stereo:sample_fmts=fltp,asetpts=PTS-STARTPTS[${aLabel}]`,
      );
    } else {
      // Inject silent stereo audio matching this segment's duration so the
      // downstream concat / xfade graph sees a uniform AV pair per input.
      filterParts.push(
        `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${segDur.toFixed(3)},asetpts=PTS-STARTPTS[${aLabel}]`,
      );
    }
    const xfade = idx === 0 ? 0 : Math.max(0, Math.min(seg.transitionInSec ?? defaultXfade, segDur));
    segLabels.push({ v: vLabel, a: aLabel, durationSec: segDur, xfade });
  });

  const useXfade = segLabels.some((s) => s.xfade > 0);
  let outV: string;
  let outA: string;

  if (segLabels.length === 1) {
    outV = segLabels[0].v;
    outA = segLabels[0].a;
  } else if (!useXfade) {
    const concatInputs = segLabels.map((s) => `[${s.v}][${s.a}]`).join("");
    filterParts.push(
      `${concatInputs}concat=n=${segLabels.length}:v=1:a=1[outv][outa]`,
    );
    outV = "outv";
    outA = "outa";
  } else {
    // xfade requires absolute offsets within the merged timeline.
    let prevV = segLabels[0].v;
    let prevA = segLabels[0].a;
    let cumDur = segLabels[0].durationSec;
    for (let i = 1; i < segLabels.length; i += 1) {
      const cur = segLabels[i];
      const xfade = cur.xfade;
      const offset = cumDur - xfade;
      const vOut = i === segLabels.length - 1 ? "outv" : `vx${i}`;
      const aOut = i === segLabels.length - 1 ? "outa" : `ax${i}`;
      // Pin timebase on every intermediate label — xfade is strict about
      // first/second input timebases matching, and concat output inherits
      // the source which may not be 1/fps.
      const tbV = `,settb=1/${fpsTarget}`;
      if (xfade > 0) {
        filterParts.push(
          `[${prevV}][${cur.v}]xfade=transition=fade:duration=${xfade.toFixed(3)}:offset=${offset.toFixed(3)}${tbV}[${vOut}]`,
        );
        filterParts.push(
          `[${prevA}][${cur.a}]acrossfade=d=${xfade.toFixed(3)}:c1=tri:c2=tri[${aOut}]`,
        );
        cumDur = cumDur + cur.durationSec - xfade;
      } else {
        filterParts.push(
          `[${prevV}][${cur.v}]concat=n=2:v=1:a=0${tbV}[${vOut}]`,
        );
        filterParts.push(
          `[${prevA}][${cur.a}]concat=n=2:v=0:a=1[${aOut}]`,
        );
        cumDur += cur.durationSec;
      }
      prevV = vOut;
      prevA = aOut;
    }
    outV = "outv";
    outA = "outa";
  }

  const filterComplex = filterParts.join(";");

  const args: string[] = [
    ...inputs,
    "-filter_complex",
    filterComplex,
    "-map",
    `[${outV}]`,
    "-map",
    `[${outA}]`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    crf,
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fpsTarget),
    "-c:a",
    "aac",
    "-b:a",
    audioBitrate,
    "-movflags",
    "+faststart",
    renderAbs,
  ];

  const res = await ffmpeg(args, { timeoutMs: 60 * 60 * 1000 });
  if (res.code !== 0) {
    await rm(renderAbs, { force: true });
    throw new Error(
      `ffmpeg render failed (${res.code}): ${res.stderr.slice(-2000)}`,
    );
  }

  const render: RenderOutput = {
    id: renderId,
    path: renderRel,
    createdAt: new Date().toISOString(),
    settings,
  };
  return { project, render };
}

function guessFps(clips: Clip[]): number {
  for (const c of clips) {
    if (c.fps && Number.isFinite(c.fps) && c.fps >= 12 && c.fps <= 120) {
      return Math.round(c.fps);
    }
  }
  return 30;
}
