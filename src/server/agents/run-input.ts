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
  const frameworks = await selectFrameworksForTask(stage, context);
  const canonUserSection = buildCreativeCanonUserSection(frameworks);
  const promptOptions = {
    canonUserSection,
    selectedFrameworkIds: frameworks.map((f) => f.id),
  };

  const agent = getAgentForStage(stage);
  const systemPrompt = agent?.buildSystemPrompt(promptOptions) ?? "";
  const winnerOnly =
    stage === "VISUAL_DIRECTION" || stage === "COPY_DEVELOPMENT";
  const userPrompt = agent
    ? agent.buildUserPrompt(
        formatContextForPrompt(context, { conceptWinnerOnly: winnerOnly }),
        promptOptions,
      )
    : formatContextForPrompt(context, { conceptWinnerOnly: winnerOnly });

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
