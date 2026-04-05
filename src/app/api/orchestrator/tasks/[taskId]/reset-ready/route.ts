import { handleOrchestrator } from "@/server/orchestrator/http";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await ctx.params;
  return handleOrchestrator(() => orchestrator.resetTaskToReady(taskId));
}
