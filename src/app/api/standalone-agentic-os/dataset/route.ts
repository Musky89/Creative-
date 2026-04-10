import { NextResponse } from "next/server";
import { isStandaloneAgenticOsEnabled } from "@/lib/standalone-agentic-os/flags";
import { getDatasetMeta } from "@/lib/standalone-agentic-os/store";

export async function GET() {
  if (!isStandaloneAgenticOsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(getDatasetMeta());
}
