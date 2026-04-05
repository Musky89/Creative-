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
  /** primary | repair */
  generationPath: "primary" | "repair";
  /** True if primary failed validation and repair produced the result */
  repaired: boolean;
};

export type AgentRunFailure = {
  ok: false;
  error: string;
  /** Partial metadata for AgentRun when we still want to record attempt */
  partialMeta?: Record<string, unknown>;
};

export type AgentExecutionResult = AgentRunSuccess | AgentRunFailure;
