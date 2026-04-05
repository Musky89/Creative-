import { handleOrchestrator } from "@/server/orchestrator/http";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";

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
  return handleOrchestrator(() =>
    orchestrator.completeTask(taskId, artifactPayload),
  );
}
