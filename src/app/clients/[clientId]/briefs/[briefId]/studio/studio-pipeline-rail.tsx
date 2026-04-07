import type { BriefForWorkPlan } from "@/lib/workflow/brief-work-plan";
import type { TaskStatus, WorkflowStage } from "@/generated/prisma/client";
import { WorkflowTimeline } from "@/components/workflow/workflow-timeline";

type TaskRow = {
  id: string;
  stage: WorkflowStage;
  status: TaskStatus;
  requiresReview: boolean;
};

export function StudioPipelineRail({
  hasWorkflow,
  timelineTasks,
  nextExecutableTaskIds,
  briefPlan,
}: {
  hasWorkflow: boolean;
  timelineTasks: TaskRow[];
  nextExecutableTaskIds: string[];
  briefPlan: BriefForWorkPlan;
}) {
  return (
    <aside className="lg:w-52 xl:w-56 lg:shrink-0">
      <details className="group rounded-2xl bg-zinc-900/20 lg:sticky lg:top-6 open:bg-zinc-900/30">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
            Progress
          </span>
          <span
            className="text-zinc-600 transition-transform group-open:rotate-180"
            aria-hidden
          >
            ▼
          </span>
        </summary>
        <div className="border-t border-white/5 px-3 py-4">
          {!hasWorkflow ? (
            <p className="text-xs leading-relaxed text-zinc-500">
              Start from the workspace — we&apos;ll track steps quietly here.
            </p>
          ) : (
            <WorkflowTimeline
              tasks={timelineTasks}
              nextExecutableTaskIds={nextExecutableTaskIds}
              briefPlan={briefPlan}
              creativeLabels
            />
          )}
        </div>
      </details>
    </aside>
  );
}
