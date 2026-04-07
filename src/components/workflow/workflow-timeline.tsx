import type { TaskStatus, WorkflowStage } from "@/generated/prisma/client";
import type { BriefForWorkPlan } from "@/lib/workflow/brief-work-plan";
import {
  CREATIVE_TASK_STATUS_LABELS,
  STAGE_LABELS,
  TASK_STATUS_LABELS,
  workflowStageOrderForBrief,
} from "@/lib/workflow-display";

type TaskRow = {
  id: string;
  stage: WorkflowStage;
  status: TaskStatus;
  requiresReview: boolean;
};

function statusPill(status: TaskStatus) {
  const map: Record<TaskStatus, string> = {
    PENDING: "bg-zinc-800/80 text-zinc-400",
    READY: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25",
    RUNNING: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/25",
    AWAITING_REVIEW: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25",
    REVISE_REQUIRED: "bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/25",
    COMPLETED: "bg-zinc-100 text-zinc-800",
    FAILED: "bg-red-500/15 text-red-200 ring-1 ring-red-500/25",
  };
  return map[status] ?? map.PENDING;
}

export function WorkflowTimeline({
  tasks,
  nextExecutableTaskIds,
  briefPlan,
  creativeLabels = false,
}: {
  tasks: TaskRow[];
  nextExecutableTaskIds: string[];
  briefPlan: BriefForWorkPlan;
  /** Softer language for Studio rail */
  creativeLabels?: boolean;
}) {
  const order = workflowStageOrderForBrief(briefPlan);
  const byStage = new Map<WorkflowStage, TaskRow>();
  for (const t of tasks) {
    byStage.set(t.stage, t);
  }
  const nextSet = new Set(nextExecutableTaskIds);
  const statusLabel = (s: TaskRow["status"]) =>
    creativeLabels
      ? (CREATIVE_TASK_STATUS_LABELS[s] ?? s)
      : (TASK_STATUS_LABELS[s] ?? s);

  return (
    <ol className="space-y-0">
      {order.map((stage, idx) => {
        const task = byStage.get(stage);
        const label = STAGE_LABELS[stage];
        const isLast = idx === order.length - 1;
        const active =
          task?.status === "RUNNING" ||
          task?.status === "READY" ||
          task?.status === "AWAITING_REVIEW" ||
          task?.status === "REVISE_REQUIRED";
        return (
          <li key={stage} className="relative flex gap-4 pb-7 last:pb-0">
            {!isLast ? (
              <div
                className="absolute top-8 bottom-0 left-[15px] w-px bg-zinc-700/60"
                aria-hidden
              />
            ) : null}
            <div
              className={`relative z-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                task?.status === "COMPLETED"
                  ? "bg-zinc-100 text-zinc-800"
                  : active
                    ? "bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-400/40"
                    : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-zinc-100">
                  {label}
                </span>
                {task ? (
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusPill(task.status)}`}
                  >
                    {statusLabel(task.status)}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">—</span>
                )}
                {task && nextSet.has(task.id) ? (
                  <span className="text-xs font-medium text-emerald-400/90">
                    {creativeLabels ? "Up next" : "Next"}
                  </span>
                ) : null}
                {task?.requiresReview ? (
                  <span className="text-xs text-zinc-500">
                    {creativeLabels ? "Decide" : "Review"}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
