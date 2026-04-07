import { handleOrchestrator } from "@/server/orchestrator/http";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";

type Body = { feedback?: string; reviewerLabel?: string; approveAnyway?: boolean };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await ctx.params;
  let feedback: string | undefined;
  let reviewerLabel: string | undefined;
  let approveAnyway: boolean | undefined;
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text) as Body;
      feedback = body.feedback;
      reviewerLabel = body.reviewerLabel;
      approveAnyway = body.approveAnyway;
    }
  } catch {
    return Response.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }
  return handleOrchestrator(() =>
    orchestrator.approveTask(taskId, feedback, reviewerLabel, {
      approveAnyway: approveAnyway === true,
    }),
  );
}
