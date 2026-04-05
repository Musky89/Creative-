/** UI-only ordering and labels — mirrors v1 pipeline without importing Prisma in client bundles. */

export const WORKFLOW_STAGE_ORDER = [
  "BRIEF_INTAKE",
  "STRATEGY",
  "CONCEPTING",
  "VISUAL_DIRECTION",
  "COPY_DEVELOPMENT",
  "REVIEW",
  "EXPORT",
] as const;

export type WorkflowStageId = (typeof WORKFLOW_STAGE_ORDER)[number];

export const STAGE_LABELS: Record<WorkflowStageId, string> = {
  BRIEF_INTAKE: "Brief intake",
  STRATEGY: "Strategy",
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
