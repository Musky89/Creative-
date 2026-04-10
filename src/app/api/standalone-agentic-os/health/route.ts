import { NextResponse } from "next/server";
import { isStandaloneAgenticOsEnabled } from "@/lib/standalone-agentic-os/flags";

export async function GET() {
  if (!isStandaloneAgenticOsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    module: "standalone-agentic-os",
    note: "Greenfield — no imports from production-engine or creative-testing-lab",
  });
}
