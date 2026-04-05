import type { TaskStatus, WorkflowStage } from "@/generated/prisma/client";
import {
  STAGE_LABELS,
  TASK_STATUS_LABELS,
  WORKFLOW_STAGE_ORDER,
  type WorkflowStageId,
} from "@/lib/workflow-display";

type TaskRow = {
  id: string;
  stage: WorkflowStage;
  status: TaskStatus;
  requiresReview: boolean;
};

function statusPill(status: TaskStatus) {
  const map: Record<TaskStatus, string> = {
    PENDING: "bg-zinc-100 text-zinc-600",
    READY: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
    RUNNING: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/80",
    AWAITING_REVIEW: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80",
    REVISE_REQUIRED: "bg-orange-50 text-orange-900 ring-1 ring-orange-200/80",
    COMPLETED: "bg-zinc-900 text-white",
    FAILED: "bg-red-50 text-red-800 ring-1 ring-red-200/80",
  };
  return map[status] ?? map.PENDING;
}

export function WorkflowTimeline({
  tasks,
  nextExecutableTaskIds,
}: {
  tasks: TaskRow[];
  nextExecutableTaskIds: string[];
}) {
  const byStage = new Map<WorkflowStage, TaskRow>();
  for (const t of tasks) {
    byStage.set(t.stage, t);
  }
  const nextSet = new Set(nextExecutableTaskIds);

  return (
    <ol className="space-y-0">
      {WORKFLOW_STAGE_ORDER.map((stage, idx) => {
        const task = byStage.get(stage as WorkflowStage);
        const label = STAGE_LABELS[stage as WorkflowStageId];
        const isLast = idx === WORKFLOW_STAGE_ORDER.length - 1;
        return (
          <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast ? (
              <div
                className="absolute top-8 bottom-0 left-[15px] w-px bg-zinc-200"
                aria-hidden
              />
            ) : null}
            <div
              className={`relative z-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                task?.status === "COMPLETED"
                  ? "bg-zinc-900 text-white"
                  : task?.status === "RUNNING" || task?.status === "READY"
                    ? "bg-white text-zinc-900 ring-2 ring-zinc-900"
                    : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-zinc-900">
                  {label}
                </span>
                {task ? (
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusPill(task.status)}`}
                  >
                    {TASK_STATUS_LABELS[task.status] ?? task.status}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">Not created</span>
                )}
                {task && nextSet.has(task.id) ? (
                  <span className="text-xs font-medium text-emerald-700">
                    Next executable
                  </span>
                ) : null}
                {task?.requiresReview ? (
                  <span className="text-xs text-zinc-500">Review gate</span>
                ) : null}
              </div>
              {task ? (
                <p className="mt-1 font-mono text-[11px] text-zinc-400">
                  {task.id}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
