import { NextResponse } from "next/server";
import { isStandaloneAgenticOsEnabled } from "@/lib/standalone-agentic-os/flags";
import { channelSpecSchema } from "@/lib/standalone-agentic-os/schemas";
import { listChannels, putChannel } from "@/lib/standalone-agentic-os/store";

export async function GET() {
  if (!isStandaloneAgenticOsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ channels: listChannels() });
}

export async function POST(req: Request) {
  if (!isStandaloneAgenticOsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = channelSpecSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  putChannel(parsed.data);
  return NextResponse.json({ channel: parsed.data });
}
