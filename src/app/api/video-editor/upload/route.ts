import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import {
  ensureStorageDir,
  getStoragePath,
  probeVideo,
  generateThumbnail,
  generateWaveform,
} from "@/lib/video-editor/ffmpeg";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await ensureStorageDir();

    const formData = await req.formData();
    const file = formData.get("video") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No video file" }, { status: 400 });
    }

    const id = randomUUID();
    const ext = file.name.split(".").pop() || "mp4";
    const filename = `${id}.${ext}`;
    const filePath = getStoragePath("uploads", filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const probe = await probeVideo(filePath);

    const thumbnailFilename = `${id}.jpg`;
    const thumbnailPath = getStoragePath("thumbnails", thumbnailFilename);
    await generateThumbnail(filePath, thumbnailPath).catch(() => {});

    const waveformFilename = `${id}.png`;
    const waveformPath = getStoragePath("waveforms", waveformFilename);
    await generateWaveform(filePath, waveformPath).catch(() => {});

    return NextResponse.json({
      id,
      name: file.name,
      path: filePath,
      duration: probe.duration,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      codec: probe.codec,
      size: probe.size,
      thumbnailUrl: `/api/video-editor/files?path=${encodeURIComponent(thumbnailPath)}`,
      waveformUrl: `/api/video-editor/files?path=${encodeURIComponent(waveformPath)}`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed", details: String(err) },
      { status: 500 }
    );
  }
}
