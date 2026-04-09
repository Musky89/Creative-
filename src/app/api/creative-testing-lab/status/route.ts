import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    falKeyConfigured: !!process.env.FAL_KEY?.trim(),
  });
}
