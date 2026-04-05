import type { WorkflowStage } from "@/generated/prisma/client";
import { buildV1PipelineRows } from "@/server/orchestrator/v1-pipeline";

/** UI ordering for timeline + studio — must match server pipeline for this brief. */
export function workflowStageOrderForBrief(
  identityWorkflowEnabled: boolean,
): readonly WorkflowStage[] {
  return buildV1PipelineRows(identityWorkflowEnabled).map((r) => r.stage);
}

/** Default order (standard pipeline) for types that don't have brief context. */
export const WORKFLOW_STAGE_ORDER = workflowStageOrderForBrief(false);

export type WorkflowStageId = WorkflowStage;

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  BRIEF_INTAKE: "Brief intake",
  STRATEGY: "Strategy",
  IDENTITY_STRATEGY: "Identity strategy",
  IDENTITY_ROUTING: "Identity routes",
  CONCEPTING: "Creative concepting",
  VISUAL_DIRECTION: "Visual direction",
  COPY_DEVELOPMENT: "Copy development",
  REVIEW: "Review",
  EXPORT: "Export",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  READY: "Ready",
  RUNNING: "Running",
  AWAITING_REVIEW: "Awaiting review",
  REVISE_REQUIRED: "Revision required",
  COMPLETED: "Completed",
  FAILED: "Failed",
};
