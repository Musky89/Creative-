import { NextResponse } from "next/server";
import { isAgenticCreativeOsEnabled } from "@/lib/agentic-creative-os/flags";

export async function GET() {
  if (!isAgenticCreativeOsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    module: "agentic-creative-os",
    plan: "docs/plans/agentic-creative-operating-system.md",
  });
}
