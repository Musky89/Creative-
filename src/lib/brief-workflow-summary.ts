import type { TaskStatus, WorkflowStage } from "@/generated/prisma/client";
import { STAGE_LABELS, workflowStageOrderForBrief } from "@/lib/workflow-display";

export type BriefTaskLite = {
  status: TaskStatus;
  stage: WorkflowStage;
  requiresReview: boolean;
};

export type BriefWorkflowHeadline =
  | { kind: "no_workflow" }
  | { kind: "review"; stage: WorkflowStage }
  | { kind: "revise"; stage: WorkflowStage }
  | { kind: "ready"; stage: WorkflowStage | null }
  | { kind: "running" }
  | { kind: "complete" }
  | { kind: "waiting" };

export function firstReadyStage(
  identityWorkflowEnabled: boolean,
  tasks: BriefTaskLite[],
): WorkflowStage | null {
  const order = workflowStageOrderForBrief(identityWorkflowEnabled);
  const byStage = new Map(tasks.map((t) => [t.stage, t] as const));
  for (const stage of order) {
    const t = byStage.get(stage);
    if (t?.status === "READY") return stage;
  }
  return null;
}

export function briefWorkflowHeadline(
  identityWorkflowEnabled: boolean,
  tasks: BriefTaskLite[],
): BriefWorkflowHeadline {
  if (tasks.length === 0) return { kind: "no_workflow" };
  const review = tasks.find((t) => t.status === "AWAITING_REVIEW");
  if (review) return { kind: "review", stage: review.stage };
  const revise = tasks.find((t) => t.status === "REVISE_REQUIRED");
  if (revise) return { kind: "revise", stage: revise.stage };
  if (tasks.some((t) => t.status === "RUNNING")) return { kind: "running" };
  const readyStage = firstReadyStage(identityWorkflowEnabled, tasks);
  if (readyStage) return { kind: "ready", stage: readyStage };
  if (tasks.every((t) => t.status === "COMPLETED")) return { kind: "complete" };
  return { kind: "waiting" };
}

export function headlineLabel(h: BriefWorkflowHeadline): string {
  switch (h.kind) {
    case "no_workflow":
      return "Not started";
    case "review":
      return `Review · ${STAGE_LABELS[h.stage]}`;
    case "revise":
      return `Revision · ${STAGE_LABELS[h.stage]}`;
    case "ready":
      return h.stage
        ? `Ready · ${STAGE_LABELS[h.stage]}`
        : "Ready to advance";
    case "running":
      return "Running";
    case "complete":
      return "Complete";
    case "waiting":
      return "In progress";
  }
}
