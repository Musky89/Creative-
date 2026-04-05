import Link from "next/link";
import { notFound } from "next/navigation";
import type { ArtifactType, ReviewStatus } from "@/generated/prisma/client";
import { ArtifactByType } from "@/components/artifacts/artifact-viewer";
import { Card } from "@/components/ui/section";
import { PageHeader } from "@/components/ui/section";
import { STAGE_LABELS, WORKFLOW_STAGE_ORDER } from "@/lib/workflow-display";
import { getBriefForStudio } from "@/server/domain/briefs";
import { assessBrandBibleReadiness } from "@/server/brand/readiness";
import {
  getClientCanonHighlights,
  getTopPreferredFrameworkIds,
} from "@/server/canon/client-canon-ui";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";
import { WorkflowControls } from "@/components/workflow/workflow-controls";
import { WorkflowTimeline } from "@/components/workflow/workflow-timeline";

function reviewBadge(status: ReviewStatus) {
  const styles: Record<ReviewStatus, string> = {
    PENDING: "bg-zinc-100 text-zinc-600",
    APPROVED: "bg-emerald-50 text-emerald-800",
    REJECTED: "bg-red-50 text-red-800",
    REVISION_REQUESTED: "bg-orange-50 text-orange-900",
  };
  return styles[status];
}

export default async function BriefStudioPage({
  params,
}: {
  params: Promise<{ clientId: string; briefId: string }>;
}) {
  const { clientId, briefId } = await params;
  const briefLoaded = await getBriefForStudio(briefId, clientId);
  if (!briefLoaded) notFound();
  const brief = briefLoaded;

  const brandReadiness = assessBrandBibleReadiness(
    brief.client.brandBible ?? null,
  );

  const [canonHighlight, preferredFrameworkIds] = await Promise.all([
    getClientCanonHighlights(clientId),
    getTopPreferredFrameworkIds(clientId, 4),
  ]);

  const hasWorkflow = brief.tasks.length > 0;
  let nextExecutableTaskIds: string[] = [];
  let timelineTasks = brief.tasks.map((t) => ({
    id: t.id,
    stage: t.stage,
    status: t.status,
    requiresReview: t.requiresReview,
  }));

  if (hasWorkflow) {
    const state = await orchestrator.getWorkflowState(briefId);
    nextExecutableTaskIds = state.nextExecutableTaskIds;
    timelineTasks = state.tasks.map((t) => ({
      id: t.id,
      stage: t.stage,
      status: t.status,
      requiresReview: t.requiresReview,
    }));
  }

  const taskByStage = new Map(
    brief.tasks.map((t) => [t.stage, t] as const),
  );

  let reviewTaskId: string | null = null;
  let reviseTaskId: string | null = null;
  for (const stage of WORKFLOW_STAGE_ORDER) {
    const t = taskByStage.get(stage);
    if (!t) continue;
    if (t.status === "AWAITING_REVIEW" && !reviewTaskId) reviewTaskId = t.id;
    if (t.status === "REVISE_REQUIRED" && !reviseTaskId) reviseTaskId = t.id;
  }

  const allReviews = brief.tasks.flatMap((t) =>
    t.reviewItems.map((r) => ({ ...r, taskStage: t.stage })),
  );
  allReviews.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  function latestArtifact(taskId: string, type: ArtifactType) {
    const task = brief.tasks.find((x) => x.id === taskId);
    if (!task) return null;
    const same = task.artifacts.filter((a) => a.type === type);
    if (same.length === 0) return null;
    return same.reduce((a, b) => (a.version >= b.version ? a : b));
  }

  return (
    <>
      <PageHeader
        title="Project studio"
        description="Workflow is driven only by the orchestrator. Use controls to advance state."
        action={
          <Link
            href={`/clients/${clientId}/briefs/${briefId}/edit`}
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Edit brief
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Brief
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              {brief.title}
            </h2>
            <dl className="mt-4 space-y-2 text-sm text-zinc-600">
              <div>
                <dt className="text-xs font-medium text-zinc-500">Client</dt>
                <dd>{brief.client.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Deadline</dt>
                <dd>{new Date(brief.deadline).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Key message</dt>
                <dd className="text-zinc-800">{brief.keyMessage}</dd>
              </div>
            </dl>
            {canonHighlight ? (
              <p className="mt-4 rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs text-violet-950">
                {canonHighlight}
              </p>
            ) : null}
          </Card>

          <WorkflowControls
            clientId={clientId}
            briefId={briefId}
            hasWorkflow={hasWorkflow}
            nextExecutableTaskIds={nextExecutableTaskIds}
            reviewTaskId={reviewTaskId}
            reviseTaskId={reviseTaskId}
            brandReadiness={brandReadiness}
            timelineTasks={timelineTasks}
          />

          <Card>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Export
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Download structured outputs for handoff or archive.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`/api/export/briefs/${briefId}?clientId=${encodeURIComponent(clientId)}&format=json`}
                className="inline-flex rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Download JSON
              </a>
              <a
                href={`/api/export/briefs/${briefId}?clientId=${encodeURIComponent(clientId)}&format=markdown`}
                className="inline-flex rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Download Markdown
              </a>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <Card>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Pipeline
            </p>
            {!hasWorkflow ? (
              <p className="mt-3 text-sm text-zinc-600">
                Initialize the workflow to create tasks and dependencies for this
                brief.
              </p>
            ) : (
              <div className="mt-4">
                <WorkflowTimeline
                  tasks={timelineTasks}
                  nextExecutableTaskIds={nextExecutableTaskIds}
                />
              </div>
            )}
          </Card>

          {hasWorkflow && nextExecutableTaskIds.length > 0 ? (
            <p className="text-sm text-emerald-800">
              Next executable:{" "}
              <span className="font-mono">{nextExecutableTaskIds.join(", ")}</span>
            </p>
          ) : hasWorkflow ? (
            <p className="text-sm text-zinc-600">
              No READY task right now — complete reviews or reset revisions to
              continue.
            </p>
          ) : null}

          <section>
            <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Review log
            </h3>
            {allReviews.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No review items yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {allReviews.slice(0, 12).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${reviewBadge(r.status)}`}
                      >
                        {r.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {STAGE_LABELS[r.taskStage]}
                      </span>
                      {r.reviewerLabel ? (
                        <span className="text-xs text-zinc-600">
                          {r.reviewerLabel}
                        </span>
                      ) : null}
                      <span className="text-xs text-zinc-400">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {r.feedback ? (
                      <p className="mt-1 text-zinc-700">{r.feedback}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Artifacts by stage
            </h3>
            <div className="mt-4 space-y-6">
              {WORKFLOW_STAGE_ORDER.map((stage) => {
                const task = taskByStage.get(stage);
                if (!task) return null;
                const rowTypes: ArtifactType[] = [
                  "INTAKE_SUMMARY",
                  "STRATEGY",
                  "CONCEPT",
                  "COPY",
                  "REVIEW_REPORT",
                  "EXPORT",
                ];
                const at = rowTypes[WORKFLOW_STAGE_ORDER.indexOf(stage)];
                const art = latestArtifact(task.id, at);
                return (
                  <div key={stage}>
                    <p className="mb-2 text-sm font-medium text-zinc-800">
                      {STAGE_LABELS[stage]}
                    </p>
                    {art ? (
                      <ArtifactByType
                        type={art.type}
                        content={art.content}
                        preferredFrameworkIds={preferredFrameworkIds}
                      />
                    ) : (
                      <Card>
                        <p className="text-sm text-zinc-500">
                          No artifact yet for this stage.
                        </p>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
