import type { AgentType, WorkflowStage } from "@/generated/prisma/client";
import type { z } from "zod";
export type AgentDefinition<TSchema extends z.ZodTypeAny> = {
  name: string;
  agentType: AgentType;
  stage: WorkflowStage;
  outputSchema: TSchema;
  buildSystemPrompt: () => string;
  buildUserPrompt: (formattedContext: string) => string;
};

export type AgentRunSuccess = {
  ok: true;
  content: Record<string, unknown>;
  providerId: string;
  model: string;
  rawText: string;
};

export type AgentRunFailure = {
  ok: false;
  error: string;
};

export type AgentExecutionResult = AgentRunSuccess | AgentRunFailure;
