import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  ensureStorageDir,
  getStoragePath,
  extractSegment,
  concatenateSegments,
} from "@/lib/video-editor/ffmpeg";
import { unlink } from "fs/promises";
import type { TimelineSegment } from "@/lib/video-editor/types";

export const runtime = "nodejs";

interface VideoMap {
  [videoId: string]: string;
}

export async function POST(req: NextRequest) {
  try {
    await ensureStorageDir();

    const body = await req.json();
    const {
      segments,
      videoMap,
      format = "mp4",
      resolution = "original",
    } = body as {
      segments: TimelineSegment[];
      videoMap: VideoMap;
      format: string;
      resolution: string;
    };

    if (!segments?.length) {
      return NextResponse.json(
        { error: "No segments to export" },
        { status: 400 }
      );
    }

    const sorted = [...segments].sort((a, b) => a.orderIndex - b.orderIndex);
    const segmentFiles: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const seg = sorted[i];
      const videoPath = videoMap[seg.videoId];
      if (!videoPath) continue;

      const segFile = getStoragePath("segments", `export_${randomUUID()}.mp4`);
      await extractSegment(videoPath, segFile, seg.startTime, seg.endTime);
      segmentFiles.push(segFile);
    }

    if (!segmentFiles.length) {
      return NextResponse.json(
        { error: "No valid segments extracted" },
        { status: 400 }
      );
    }

    const exportId = randomUUID();
    const outputPath = getStoragePath("exports", `${exportId}.${format}`);
    await concatenateSegments(segmentFiles, outputPath, resolution);

    for (const f of segmentFiles) {
      await unlink(f).catch(() => {});
    }

    const fileUrl = `/api/video-editor/files?path=${encodeURIComponent(outputPath)}`;

    return NextResponse.json({
      exportId,
      url: fileUrl,
      downloadUrl: fileUrl,
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: "Export failed", details: String(err) },
      { status: 500 }
    );
  }
}
