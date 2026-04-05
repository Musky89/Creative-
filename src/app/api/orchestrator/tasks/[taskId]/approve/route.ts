import { handleOrchestrator } from "@/server/orchestrator/http";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";

type Body = { feedback?: string };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await ctx.params;
  let feedback: string | undefined;
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text) as Body;
      feedback = body.feedback;
    }
  } catch {
    return Response.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }
  return handleOrchestrator(() =>
    orchestrator.approveTask(taskId, feedback),
  );
}
