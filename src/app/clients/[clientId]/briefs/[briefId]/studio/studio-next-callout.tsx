import Link from "next/link";
import type { WorkflowStage } from "@/generated/prisma/client";
import { STAGE_LABELS } from "@/lib/workflow-display";
import {
  briefWorkflowHeadline,
  headlineLabel,
  type BriefTaskLite,
} from "@/lib/brief-workflow-summary";

export function StudioNextCallout({
  clientId,
  briefId,
  identityWorkflowEnabled,
  hasWorkflow,
  reviewTaskId,
  reviseTaskId,
  nextExecutableStage,
  tasks,
  visualDirectionAwaitingReview,
  imageGenReady,
}: {
  clientId: string;
  briefId: string;
  identityWorkflowEnabled: boolean;
  hasWorkflow: boolean;
  reviewTaskId: string | null;
  reviseTaskId: string | null;
  nextExecutableStage: WorkflowStage | null;
  tasks: BriefTaskLite[];
  visualDirectionAwaitingReview?: boolean;
  imageGenReady?: boolean;
}) {
  if (!hasWorkflow) {
    return (
      <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/40 px-5 py-4">
        <p className="text-sm font-medium text-zinc-100">Start this project</p>
        <p className="mt-1 text-sm text-zinc-400">
          Initialize the workflow once, then use{" "}
          <span className="text-zinc-300">Run next step</span> to move forward.
        </p>
      </div>
    );
  }

  const h = briefWorkflowHeadline(identityWorkflowEnabled, tasks);
  const primary = headlineLabel(h);

  let detail: string | null = null;
  if (h.kind === "ready" && nextExecutableStage) {
    detail = `Next: ${STAGE_LABELS[nextExecutableStage]}`;
  } else if (h.kind === "waiting") {
    detail = "Waiting on upstream stages.";
  } else if (h.kind === "running") {
    detail = "An agent task is in flight.";
  } else if (h.kind === "complete") {
    detail = "All stages are complete. Export or revisit any artifact below.";
  }

  const vdReview = visualDirectionAwaitingReview ?? false;
  const imagesReady = imageGenReady ?? false;

  return (
    <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/30 px-5 py-4">
      <p className="text-xs font-medium tracking-wide text-emerald-400/90 uppercase">
        Now
      </p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight text-zinc-50">
        {primary}
      </p>
      {detail ? <p className="mt-1 text-sm text-zinc-400">{detail}</p> : null}
      {vdReview && !imagesReady ? (
        <p className="mt-2 text-sm text-zinc-400">
          Approving <span className="text-zinc-300">Visual direction</span> in{" "}
          <a href="#review" className="text-emerald-300 underline decoration-emerald-700">
            Actions
          </a>{" "}
          assembles the visual prompt package for{" "}
          <a
            href="#studio-image-generation"
            className="text-emerald-300 underline decoration-emerald-700"
          >
            campaign images
          </a>
          .
        </p>
      ) : null}
      {imagesReady ? (
        <p className="mt-2 text-sm text-emerald-200/90">
          Campaign image generation is ready — open the hub to generate variants.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {reviewTaskId ? (
          <a
            href="#review"
            className="inline-flex rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
          >
            Open review
          </a>
        ) : null}
        {reviseTaskId ? (
          <a
            href="#review"
            className="inline-flex rounded-lg bg-orange-500/15 px-3 py-2 text-sm font-medium text-orange-100 ring-1 ring-orange-500/30 hover:bg-orange-500/25"
          >
            Reset revision
          </a>
        ) : null}
        {imagesReady ? (
          <a
            href="#studio-image-generation"
            className="inline-flex rounded-lg bg-sky-500/15 px-3 py-2 text-sm font-medium text-sky-100 ring-1 ring-sky-500/35 hover:bg-sky-500/25"
          >
            Campaign images
          </a>
        ) : null}
        <Link
          href={`/clients/${clientId}/briefs/${briefId}/edit`}
          className="inline-flex rounded-lg border border-zinc-600 bg-zinc-900/60 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/80"
        >
          Edit brief
        </Link>
      </div>
    </div>
  );
}
