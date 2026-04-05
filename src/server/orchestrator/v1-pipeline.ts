import type { AgentType, ArtifactType, WorkflowStage } from "@/generated/prisma/client";

/**
 * Canonical v1 linear pipeline: one task per stage, strict order.
 * System stages use agentType null (no AgentRun / agent role).
 */
export type V1PipelineRow = {
  stage: WorkflowStage;
  agentType: AgentType | null;
  requiresReview: boolean;
  /** Artifact type produced when this task completes (orchestrator / agents). */
  artifactType: ArtifactType;
};

export const V1_PIPELINE: readonly V1PipelineRow[] = [
  {
    stage: "BRIEF_INTAKE",
    agentType: null,
    requiresReview: false,
    artifactType: "INTAKE_SUMMARY",
  },
  {
    stage: "STRATEGY",
    agentType: "STRATEGIST",
    requiresReview: true,
    artifactType: "STRATEGY",
  },
  {
    stage: "CONCEPTING",
    agentType: "CREATIVE_DIRECTOR",
    requiresReview: true,
    artifactType: "CONCEPT",
  },
  {
    stage: "COPY_DEVELOPMENT",
    agentType: "COPYWRITER",
    requiresReview: true,
    artifactType: "COPY",
  },
  {
    stage: "REVIEW",
    agentType: "BRAND_GUARDIAN",
    requiresReview: true,
    artifactType: "REVIEW_REPORT",
  },
  {
    stage: "EXPORT",
    agentType: null,
    requiresReview: false,
    artifactType: "EXPORT",
  },
] as const;

export function stageOrderIndex(stage: WorkflowStage): number {
  const i = V1_PIPELINE.findIndex((r) => r.stage === stage);
  if (i < 0) {
    throw new Error(`Unknown workflow stage: ${stage}`);
  }
  return i;
}

export function getV1PipelineRow(stage: WorkflowStage): V1PipelineRow {
  const row = V1_PIPELINE.find((r) => r.stage === stage);
  if (!row) {
    throw new Error(`Unknown workflow stage: ${stage}`);
  }
  return row;
}
