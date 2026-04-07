import { notFound } from "next/navigation";
import type { ReviewStatus } from "@/generated/prisma/client";
import { Card } from "@/components/ui/section";
import { PageHeader } from "@/components/ui/section";
import { DisclosureSection } from "@/components/ui/collapse";
import { STAGE_LABELS, workflowStageOrderForBrief } from "@/lib/workflow-display";
import { getBriefForStudio } from "@/server/domain/briefs";
import { assessBrandBibleReadiness } from "@/server/brand/readiness";
import {
  getClientCanonHighlights,
  getTopPreferredFrameworkIds,
} from "@/server/canon/client-canon-ui";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";
import { WorkflowControls } from "@/components/workflow/workflow-controls";
import { WorkflowTimeline } from "@/components/workflow/workflow-timeline";
import { StudioNextCallout } from "./studio-next-callout";
import { StudioArtifactsSection } from "./studio-artifacts-section";
import { IdentityExportPanel } from "./identity-export-panel";
import { getVisualGenerationReadiness } from "@/lib/studio/visual-generation-readiness";
import { StudioCreativeHero } from "./studio-creative-hero";
import { StudioCreativeRouteSections } from "./studio-creative-routes";
import { StudioExploreAlternatives } from "./studio-explore-alternatives";
import { parseConceptPack } from "./studio-concept-summary";
import { getDefaultHeadlineForBrief } from "@/server/visual-finishing/headline-from-brief";
import { StudioBrandLearningPanel } from "./studio-brand-learning";

function reviewStatusText(status: ReviewStatus) {
  const map: Record<ReviewStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    REVISION_REQUESTED: "Revision requested",
  };
  return map[status];
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

  const taskByStage = new Map(brief.tasks.map((t) => [t.stage, t] as const));

  let reviewTaskId: string | null = null;
  let reviseTaskId: string | null = null;
  const stageOrder = workflowStageOrderForBrief(brief.identityWorkflowEnabled);
  const nextExecutableStage =
    nextExecutableTaskIds.length > 0
      ? timelineTasks.find((x) => x.id === nextExecutableTaskIds[0])?.stage ??
        null
      : null;

  for (const stage of stageOrder) {
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

  const taskLite = brief.tasks.map((t) => ({
    status: t.status,
    stage: t.stage,
    requiresReview: t.requiresReview,
  }));

  const hasIdentityArtifacts =
    brief.identityWorkflowEnabled &&
    brief.tasks.some(
      (t) =>
        (t.stage === "IDENTITY_STRATEGY" || t.stage === "IDENTITY_ROUTING") &&
        t.artifacts.length > 0,
    );

  const vdTask = brief.tasks.find((t) => t.stage === "VISUAL_DIRECTION");
  const promptPkgArtifact = vdTask?.artifacts
    .filter((a) => a.type === "VISUAL_PROMPT_PACKAGE")
    .sort((a, b) => b.version - a.version)[0];
  const hasPromptPackage = !!promptPkgArtifact;
  const promptPackageArtifactId = promptPkgArtifact?.id ?? null;
  const hasVisualSpec =
    vdTask?.artifacts.some((a) => a.type === "VISUAL_SPEC") ?? false;
  const visualGenReadiness = getVisualGenerationReadiness({
    brandBible: brief.client.brandBible ?? null,
    hasPromptPackage,
    visualDirectionTaskStatus: vdTask?.status ?? null,
  });

  const visualDirectionAwaitingReview = vdTask?.status === "AWAITING_REVIEW";
  const imageGenReady =
    !!promptPackageArtifactId &&
    hasPromptPackage &&
    visualGenReadiness.every((l) => l.level !== "block");

  const exportTask = brief.tasks.find((t) => t.stage === "EXPORT");
  const latestExportArt = exportTask?.artifacts
    .filter((a) => a.type === "EXPORT")
    .sort((a, b) => b.version - a.version)[0];
  const exportContent =
    latestExportArt?.content && typeof latestExportArt.content === "object"
      ? (latestExportArt.content as Record<string, unknown>)
      : null;
  const cdDecision =
    exportContent && typeof exportContent._creativeDirectorDecision === "object"
      ? (exportContent._creativeDirectorDecision as Record<string, unknown>)
      : null;
  const cdSelectedVisualId =
    cdDecision &&
    typeof cdDecision.selectedAssets === "object" &&
    cdDecision.selectedAssets !== null
      ? String(
          (cdDecision.selectedAssets as Record<string, unknown>).visualAssetId ??
            "",
        ).trim() || null
      : null;

  const composeDefaultHeadline = await getDefaultHeadlineForBrief(briefId);

  const conceptTask = taskByStage.get("CONCEPTING");
  const latestConceptArt = conceptTask?.artifacts
    .filter((a) => a.type === "CONCEPT")
    .sort((a, b) => b.version - a.version)[0];
  const parsedConcepts = parseConceptPack(latestConceptArt?.content ?? null);
  const winnerConcept = parsedConcepts?.winner ?? null;

  const visualAssetsForStudio = brief.visualAssets.map((va) => ({
    id: va.id,
    status: va.status,
    providerTarget: va.providerTarget,
    providerName: va.providerName,
    modelName: va.modelName,
    resultUrl: va.resultUrl,
    sourceArtifactId: va.sourceArtifactId,
    generationNotes: va.generationNotes,
    createdAt: va.createdAt,
    isPreferred: va.isPreferred,
    isSecondary: va.isSecondary,
    autoRejected: va.autoRejected,
    founderRejected: va.founderRejected,
    regenerationAttempt: va.regenerationAttempt,
    variantLabel: va.variantLabel,
    composed:
      va.variantLabel === "COMPOSED" ||
      (typeof va.metadata === "object" &&
        va.metadata !== null &&
        (va.metadata as { composed?: boolean }).composed === true),
    review: va.review
      ? {
          qualityVerdict: va.review.qualityVerdict,
          regenerationRecommended: va.review.regenerationRecommended,
          evaluator: va.review.evaluator,
          evaluation: va.review.evaluation as Record<string, unknown> | null,
        }
      : null,
    cdDirectorPick: cdSelectedVisualId === va.id,
  }));

  const pkgAssets = promptPackageArtifactId
    ? visualAssetsForStudio.filter(
        (a) => a.sourceArtifactId === promptPackageArtifactId,
      )
    : [];

  const cdPickAsset = cdSelectedVisualId
    ? visualAssetsForStudio.find((a) => a.id === cdSelectedVisualId) ?? null
    : null;

  const composedHeroAsset =
    pkgAssets.find(
      (a) =>
        a.variantLabel === "COMPOSED" &&
        a.composed &&
        a.resultUrl &&
        a.status === "COMPLETED",
    ) ?? null;

  const preferredRawHero =
    pkgAssets.find(
      (a) =>
        !a.composed &&
        a.isPreferred &&
        a.resultUrl &&
        a.status === "COMPLETED",
    ) ?? null;

  /** Prefer finished campaign frame in hero; fall back to CD pick, then preferred raw. */
  const heroImageUrl =
    composedHeroAsset?.resultUrl ??
    (cdPickAsset?.resultUrl && cdPickAsset.status === "COMPLETED"
      ? cdPickAsset.resultUrl
      : null) ??
    preferredRawHero?.resultUrl ??
    null;

  const exploreAlternativesDefaultOpen =
    Boolean(promptPackageArtifactId) &&
    !pkgAssets.some(
      (a) =>
        a.variantLabel === "COMPOSED" &&
        a.composed &&
        a.status === "COMPLETED" &&
        a.resultUrl,
    );

  return (
    <>
      <PageHeader
        title={brief.title}
        description={`${brief.client.name} · Studio`}
        tone="muted"
      />

      <div className="mb-10 space-y-10">
        <StudioCreativeHero
          clientId={clientId}
          imageUrl={heroImageUrl}
          headline={composeDefaultHeadline}
          conceptName={winnerConcept?.conceptName ?? null}
          conceptHook={winnerConcept?.hook ?? null}
        />
        <StudioCreativeRouteSections
          parsed={parsedConcepts}
          conceptTaskStatus={conceptTask?.status ?? null}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <StudioNextCallout
            clientId={clientId}
            briefId={briefId}
            identityWorkflowEnabled={brief.identityWorkflowEnabled}
            hasWorkflow={hasWorkflow}
            reviewTaskId={reviewTaskId}
            reviseTaskId={reviseTaskId}
            nextExecutableStage={nextExecutableStage}
            tasks={taskLite}
            visualDirectionAwaitingReview={visualDirectionAwaitingReview}
            imageGenReady={imageGenReady}
          />

          <WorkflowControls
            clientId={clientId}
            briefId={briefId}
            hasWorkflow={hasWorkflow}
            nextExecutableTaskIds={nextExecutableTaskIds}
            nextExecutableStage={nextExecutableStage}
            reviewTaskId={reviewTaskId}
            reviseTaskId={reviseTaskId}
            brandReadiness={brandReadiness}
            timelineTasks={timelineTasks}
          />

          <StudioBrandLearningPanel clientId={clientId} />

          <Card className="border-zinc-800/90 bg-zinc-900/40">
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Context
            </p>
            <dl className="mt-3 space-y-3 text-sm text-zinc-300">
              <div>
                <dt className="text-xs text-zinc-500">Deadline</dt>
                <dd className="mt-0.5 text-zinc-200">
                  {new Date(brief.deadline).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Key message</dt>
                <dd className="mt-0.5 leading-relaxed text-zinc-200">
                  {brief.keyMessage}
                </dd>
              </div>
            </dl>
            {canonHighlight ? (
              <p className="mt-4 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs leading-relaxed text-violet-100/90">
                {canonHighlight}
              </p>
            ) : null}
          </Card>

          <DisclosureSection
            title="Export"
            subtitle="Full studio dump or identity delivery package"
            defaultOpen={false}
          >
            {brief.identityWorkflowEnabled ? (
              <div className="mb-6">
                <IdentityExportPanel
                  clientId={clientId}
                  briefId={briefId}
                  hasIdentityArtifacts={hasIdentityArtifacts}
                />
              </div>
            ) : null}
            <p className="text-xs text-zinc-500">
              All stages (campaign + optional identity)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`/api/export/briefs/${briefId}?clientId=${encodeURIComponent(clientId)}&format=json`}
                className="inline-flex rounded-lg border border-zinc-600 bg-zinc-900/80 px-3.5 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-500"
              >
                Studio JSON
              </a>
              <a
                href={`/api/export/briefs/${briefId}?clientId=${encodeURIComponent(clientId)}&format=markdown`}
                className="inline-flex rounded-lg border border-zinc-600 bg-zinc-900/80 px-3.5 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-500"
              >
                Studio Markdown
              </a>
            </div>
          </DisclosureSection>
        </div>

        <div className="space-y-8 lg:col-span-7">
          <Card className="border-zinc-800/90 bg-zinc-900/50">
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Pipeline
            </p>
            {!hasWorkflow ? (
              <p className="mt-3 text-sm text-zinc-400">
                Initialize the workflow once from Actions — stages appear here.
              </p>
            ) : (
              <div className="mt-4">
                <WorkflowTimeline
                  tasks={timelineTasks}
                  nextExecutableTaskIds={nextExecutableTaskIds}
                  identityWorkflowEnabled={brief.identityWorkflowEnabled}
                />
              </div>
            )}
          </Card>

          <StudioExploreAlternatives
            clientId={clientId}
            briefId={briefId}
            visualDirectionStatus={vdTask?.status ?? null}
            hasVisualSpec={hasVisualSpec}
            hasPromptPackage={hasPromptPackage}
            promptPackageArtifactId={promptPackageArtifactId}
            visualAssets={visualAssetsForStudio}
            readinessLines={visualGenReadiness}
            creativeDirectorDecision={cdDecision}
            composeDefaultHeadline={composeDefaultHeadline}
            defaultOpen={exploreAlternativesDefaultOpen}
          />

          <DisclosureSection
            title="Review history"
            subtitle={
              allReviews.length === 0
                ? "No decisions logged yet"
                : `${Math.min(allReviews.length, 8)} recent`
            }
            defaultOpen={allReviews.length > 0 && allReviews.length <= 3}
          >
            {allReviews.length === 0 ? (
              <p className="text-sm text-zinc-500">Nothing yet.</p>
            ) : (
              <ul className="space-y-2">
                {allReviews.slice(0, 8).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-zinc-800/90 bg-zinc-950/40 px-3 py-2.5 text-sm"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-zinc-400">
                      <span className="font-medium text-zinc-200">
                        {reviewStatusText(r.status)}
                      </span>
                      <span className="text-xs">· {STAGE_LABELS[r.taskStage]}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                      {r.reviewerLabel ? (
                        <span className="text-xs text-zinc-500">
                          · {r.reviewerLabel}
                        </span>
                      ) : null}
                    </div>
                    {r.feedback ? (
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">
                        {r.feedback}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </DisclosureSection>

          <StudioArtifactsSection
            clientId={clientId}
            briefId={briefId}
            stageOrder={stageOrder}
            taskByStage={taskByStage}
            preferredFrameworkIds={preferredFrameworkIds}
          />
        </div>
      </div>
    </>
  );
}
