import { NextResponse } from "next/server";
import { OrchestratorError } from "./errors";

export function jsonError(
  code: string,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function handleOrchestrator<T>(
  fn: () => Promise<T>,
): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    if (e instanceof OrchestratorError) {
      return jsonError(e.code, e.message, e.httpStatus);
    }
    console.error(e);
    return jsonError(
      "INTERNAL_ERROR",
      e instanceof Error ? e.message : "Unexpected error",
      500,
    );
  }
}
