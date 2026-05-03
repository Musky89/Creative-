import { randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { editDecisionListSchema, type VideoSourceId } from "@/lib/video-editor/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

function runFfmpeg(args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { cwd });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

function sanitizeName(name: string) {
  return name.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "final-cut";
}

export async function POST(request: NextRequest) {
  const workDir = path.join(tmpdir(), `video-editor-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  try {
    const formData = await request.formData();
    const fileA = formData.get("videoA");
    const fileB = formData.get("videoB");
    const rawPlan = formData.get("plan");

    if (!(fileA instanceof File) || !(fileB instanceof File) || typeof rawPlan !== "string") {
      return NextResponse.json(
        { error: "Upload two videos and a valid edit decision list." },
        { status: 400 },
      );
    }

    if (fileA.size > MAX_UPLOAD_BYTES || fileB.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Each uploaded video must be 500 MB or smaller." },
        { status: 413 },
      );
    }

    const parsed = editDecisionListSchema.safeParse(JSON.parse(rawPlan));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid edit decision list.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const sourcePaths: Record<VideoSourceId, string> = {
      a: path.join(workDir, "source-a"),
      b: path.join(workDir, "source-b"),
    };
    await Promise.all([
      writeFile(sourcePaths.a, Buffer.from(await fileA.arrayBuffer())),
      writeFile(sourcePaths.b, Buffer.from(await fileB.arrayBuffer())),
    ]);

    const concatList: string[] = [];
    for (const [index, segment] of parsed.data.segments.entries()) {
      const output = path.join(workDir, `segment-${String(index).padStart(3, "0")}.mp4`);
      await runFfmpeg(
        [
          "-y",
          "-ss",
          String(segment.start),
          "-to",
          String(segment.end),
          "-i",
          sourcePaths[segment.sourceId],
          "-vf",
          "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p",
          "-af",
          "aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11",
          "-r",
          "30",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "20",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-movflags",
          "+faststart",
          output,
        ],
        workDir,
      );
      concatList.push(`file '${output.replaceAll("'", "'\\''")}'`);
    }

    const listPath = path.join(workDir, "concat.txt");
    const finalPath = path.join(workDir, `${sanitizeName(parsed.data.projectName)}.mp4`);
    await writeFile(listPath, concatList.join("\n"));
    await runFfmpeg(
      ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", finalPath],
      workDir,
    );

    const video = await readFile(finalPath);
    return new NextResponse(video, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${path.basename(finalPath)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}
