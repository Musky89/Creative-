import { NextRequest, NextResponse } from "next/server";
import { detectSilence } from "@/lib/video-editor/ffmpeg";
import { stat } from "fs/promises";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoPath, threshold = -30, minDuration = 0.5 } = body;

    if (!videoPath) {
      return NextResponse.json(
        { error: "Missing videoPath" },
        { status: 400 }
      );
    }

    await stat(videoPath);

    const regions = await detectSilence(videoPath, threshold, minDuration);

    return NextResponse.json({ regions });
  } catch (err) {
    console.error("Silence detection error:", err);
    return NextResponse.json(
      { error: "Detection failed", details: String(err) },
      { status: 500 }
    );
  }
}
