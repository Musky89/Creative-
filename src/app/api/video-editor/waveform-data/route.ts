import { NextRequest, NextResponse } from "next/server";
import { generateWaveformData } from "@/lib/video-editor/ffmpeg";
import { stat } from "fs/promises";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoPath, samples = 500 } = body;

    if (!videoPath) {
      return NextResponse.json(
        { error: "Missing videoPath" },
        { status: 400 }
      );
    }

    await stat(videoPath);

    const data = await generateWaveformData(videoPath, samples);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Waveform data error:", err);
    return NextResponse.json(
      { error: "Waveform generation failed", details: String(err) },
      { status: 500 }
    );
  }
}
