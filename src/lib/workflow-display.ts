import type { WorkflowStage } from "@/generated/prisma/client";
import type { BriefForWorkPlan } from "@/lib/workflow/brief-work-plan";
import { buildV1PipelineRowsForBrief } from "@/server/orchestrator/v1-pipeline";

/** Ordered stages for a brief — matches server pipeline. */
export type WorkflowStageOrder = readonly WorkflowStage[];

/** UI ordering for timeline + studio — must match server pipeline for this brief. */
export function workflowStageOrderForBrief(brief: BriefForWorkPlan): WorkflowStageOrder {
  return buildV1PipelineRowsForBrief(brief).map((r) => r.stage);
}

/** @deprecated Prefer workflowStageOrderForBrief(brief) */
export function workflowStageOrderForBriefLegacy(
  identityWorkflowEnabled: boolean,
): WorkflowStageOrder {
  return workflowStageOrderForBrief({
    engagementType: "CAMPAIGN",
    workstreams: [],
    deliverablesRequested: [],
    identityWorkflowEnabled,
  });
}

/** Default order (standard campaign, no identity) for types that don't have brief context. */
export const WORKFLOW_STAGE_ORDER = workflowStageOrderForBriefLegacy(false);

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

/** Studio campaign view — creative director language */
export const STUDIO_STAGE_LABELS: Record<WorkflowStage, string> = {
  BRIEF_INTAKE: "Brief",
  STRATEGY: "Campaign idea",
  IDENTITY_STRATEGY: "Identity strategy",
  IDENTITY_ROUTING: "Identity routes",
  CONCEPTING: "Creative routes",
  VISUAL_DIRECTION: "Visual world",
  COPY_DEVELOPMENT: "Messaging",
  REVIEW: "Brand check",
  EXPORT: "Final assets",
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

/** Studio-facing copy — avoids pipeline / debugger tone */
export const CREATIVE_TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Queued",
  READY: "Ready to go",
  RUNNING: "In progress",
  AWAITING_REVIEW: "Your call",
  REVISE_REQUIRED: "Refine requested",
  COMPLETED: "Done",
  FAILED: "Needs attention",
};
