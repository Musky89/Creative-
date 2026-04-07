import type { AgentType, ArtifactType, WorkflowStage } from "@/generated/prisma/client";

/**
 * One row in the instantiated workflow DAG for a brief.
 */
export type V1PipelineRow = {
  stage: WorkflowStage;
  agentType: AgentType | null;
  requiresReview: boolean;
  artifactType: ArtifactType;
};
