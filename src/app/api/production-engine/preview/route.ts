import { NextResponse } from "next/server";
import {
  productionEngineInputSchema,
  runProductionEngineStub,
} from "@/lib/production-engine";

/**
 * Standalone preview API for the Creative Production Engine (no DB, no orchestrator).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = productionEngineInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const result = runProductionEngineStub(parsed.data);
  return NextResponse.json(result);
}
