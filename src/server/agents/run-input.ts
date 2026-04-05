import type { WorkflowStage } from "@/generated/prisma/client";
import { buildCreativeCanonUserSection } from "@/server/canon/prompt-section";
import { selectFrameworksForTask } from "@/server/canon/select-frameworks";
import { formatContextForPrompt, loadTaskAgentContext } from "./context";
import { getAgentForStage } from "./registry";

export type AgentRunInputPayload = {
  _agenticforceAgentRun: true;
  stage: WorkflowStage;
  agentType: string;
  context: Awaited<ReturnType<typeof loadTaskAgentContext>>["context"];
  creativeCanonFrameworkIds: string[];
  systemPrompt: string;
  userPrompt: string;
};

export async function buildAgentRunInput(
  taskId: string,
  stage: WorkflowStage,
  agentType: string,
): Promise<AgentRunInputPayload> {
  const { context } = await loadTaskAgentContext(taskId);
  const frameworks = selectFrameworksForTask(stage, context);
  const canonUserSection = buildCreativeCanonUserSection(frameworks);
  const promptOptions = {
    canonUserSection,
    selectedFrameworkIds: frameworks.map((f) => f.id),
  };

  const agent = getAgentForStage(stage);
  const systemPrompt = agent?.buildSystemPrompt(promptOptions) ?? "";
  const userPrompt = agent
    ? agent.buildUserPrompt(formatContextForPrompt(context), promptOptions)
    : formatContextForPrompt(context);

  return {
    _agenticforceAgentRun: true,
    stage,
    agentType,
    context,
    creativeCanonFrameworkIds: promptOptions.selectedFrameworkIds,
    systemPrompt,
    userPrompt,
  };
}
