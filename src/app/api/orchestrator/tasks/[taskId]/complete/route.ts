import { jsonError } from "@/server/orchestrator/http";
import { OrchestratorError } from "@/server/orchestrator/errors";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";
import { NextResponse } from "next/server";

type Body = { artifactPayload?: Record<string, unknown> };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await ctx.params;
  let artifactPayload: Record<string, unknown> | undefined;
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text) as Body;
      artifactPayload = body.artifactPayload;
    }
  } catch {
    return Response.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }
  try {
    const r = await orchestrator.completeTask(taskId, artifactPayload);
    if ("pipelineFailed" in r && r.pipelineFailed) {
      return jsonError(
        "PIPELINE_FAILED",
        "Stage failed: invalid or placeholder output. Retry generation from Studio, then complete again.",
        400,
      );
    }
    return NextResponse.json({ ok: true, data: r });
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
