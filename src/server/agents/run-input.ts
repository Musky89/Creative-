import type { WorkflowStage } from "@/generated/prisma/client";
import { formatContextForPrompt, loadTaskAgentContext } from "./context";
import { getAgentForStage } from "./registry";

export type AgentRunInputPayload = {
  _agenticforceAgentRun: true;
  stage: WorkflowStage;
  agentType: string;
  context: Awaited<ReturnType<typeof loadTaskAgentContext>>["context"];
  systemPrompt: string;
  userPrompt: string;
};

export async function buildAgentRunInput(
  taskId: string,
  stage: WorkflowStage,
  agentType: string,
): Promise<AgentRunInputPayload> {
  const { context } = await loadTaskAgentContext(taskId);
  const agent = getAgentForStage(stage);
  const systemPrompt = agent?.buildSystemPrompt() ?? "";
  const userPrompt = agent
    ? agent.buildUserPrompt(formatContextForPrompt(context))
    : formatContextForPrompt(context);

  return {
    _agenticforceAgentRun: true,
    stage,
    agentType,
    context,
    systemPrompt,
    userPrompt,
  };
}
