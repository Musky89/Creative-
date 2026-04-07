import { notFound } from "next/navigation";
import type { ReviewStatus } from "@/generated/prisma/client";
import { PageHeader } from "@/components/ui/section";
import { DisclosureSection } from "@/components/ui/collapse";
import {
  STUDIO_STAGE_LABELS,
  workflowStageOrderForBrief,
} from "@/lib/workflow-display";
import { getBriefForStudio } from "@/server/domain/briefs";
import { assessBrandBibleReadiness } from "@/server/brand/readiness";
import {
  getClientCanonHighlights,
  getTopPreferredFrameworkIds,
} from "@/server/canon/client-canon-ui";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";
import { getReviewApproveGate } from "@/server/studio/review-approve-gate";
import { WorkflowControls } from "@/components/workflow/workflow-controls";
import { StudioArtifactsSection } from "./studio-artifacts-section";
import { IdentityExportPanel } from "./identity-export-panel";
import { getVisualGenerationReadiness } from "@/lib/studio/visual-generation-readiness";
import { StudioCreativeRouteSections } from "./studio-creative-routes";
import { StudioCampaignAtf } from "./studio-campaign-atf";
import { StudioCampaignVisualAlternates } from "./studio-campaign-visual-alternates";
import { StudioCopyHeadlines } from "./studio-copy-headlines";
import { parseCopyCampaign } from "./studio-copy-campaign";
import { StudioPipelineRail } from "./studio-pipeline-rail";
import { StudioExploreAlternatives } from "./studio-explore-alternatives";
import type { PromptPackageRef } from "./studio-visual-references";
import { parseConceptPack } from "./studio-concept-summary";
import {
  getDefaultCtaForBrief,
  getDefaultHeadlineForBrief,
} from "@/server/visual-finishing/headline-from-brief";
import { StudioBrandLearningPanel } from "./studio-brand-learning";
import { StudioBrandVisualIdentityPanel } from "./studio-brand-visual-identity";
import { StudioBrandVisualStylePanel } from "./studio-brand-visual-style";
import { getClientVisualTrainingCandidates } from "@/server/domain/client-visual-training-candidates";
import {
  briefRecordToWorkPlan,
  resolveBriefWorkPlan,
} from "@/lib/workflow/brief-work-plan";
import {
  compositionGuidanceSummary,
  referenceCompositionProfileSchema,
} from "@/lib/visual/reference-composition-profile";
import { StudioEngagementOverview } from "./studio-engagement-overview";
import { loadCampaignCoreForBrief } from "@/server/campaign/load-campaign-core";
import { getPrisma } from "@/server/db/prisma";
import { computeCreativeConfidence } from "@/lib/studio/creative-confidence";

function reviewStatusText(status: ReviewStatus) {
  const map: Record<ReviewStatus, string> = {
    PENDING: "Queued",
    APPROVED: "Approved",
    REJECTED: "Set aside",
    REVISION_REQUESTED: "Refine requested",
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
  const briefPlan = briefRecordToWorkPlan(brief);
  const workPlan = resolveBriefWorkPlan(briefPlan);

  const brandReadiness = assessBrandBibleReadiness(
    brief.client.brandBible ?? null,
  );

  const prisma = getPrisma();
  const [canonHighlight, preferredFrameworkIds, trainingCandidates, campaignCore] =
    await Promise.all([
      getClientCanonHighlights(clientId),
      getTopPreferredFrameworkIds(clientId, 4),
      getClientVisualTrainingCandidates(clientId),
      loadCampaignCoreForBrief(prisma, briefId),
    ]);

  const hasBrandVisualStyle =
    !!brief.client.visualModelRef?.trim() && !!process.env.FAL_KEY?.trim();

  const hasWorkflow = brief.tasks.length > 0;
  let nextExecutableTaskIds: string[] = [];
  let timelineTasks = brief.tasks.map((t) => ({
    id: t.id,
    stage: t.stage,
    status: t.status,
    requiresReview: t.requiresReview,
    lastFailureReason: t.lastFailureReason,
    lastFailureType: t.lastFailureType,
  }));

  if (hasWorkflow) {
    const state = await orchestrator.getWorkflowState(briefId);
    nextExecutableTaskIds = state.nextExecutableTaskIds;
    timelineTasks = state.tasks.map((t) => ({
      id: t.id,
      stage: t.stage,
      status: t.status,
      requiresReview: t.requiresReview,
      lastFailureReason: t.lastFailureReason,
      lastFailureType: t.lastFailureType,
    }));
  }

  const taskByStage = new Map(brief.tasks.map((t) => [t.stage, t] as const));

  let reviewTaskId: string | null = null;
  let reviseTaskId: string | null = null;
  const stageOrder = workflowStageOrderForBrief(briefPlan);
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

  const reviewApproveGate = await getReviewApproveGate({
    clientId,
    briefId,
    reviewTaskId,
  });

  const allReviews = brief.tasks.flatMap((t) =>
    t.reviewItems.map((r) => ({ ...r, taskStage: t.stage })),
  );
  allReviews.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const hasIdentityArtifacts =
    workPlan.showIdentityStudio &&
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

  function parsePromptPackageRefs(content: unknown): PromptPackageRef[] {
    if (!content || typeof content !== "object") return [];
    const raw = (content as Record<string, unknown>)._visualReferencesUsed;
    if (!Array.isArray(raw)) return [];
    const out: PromptPackageRef[] = [];
    for (const x of raw) {
      if (x && typeof x === "object" && "id" in x) {
        const o = x as Record<string, unknown>;
        out.push({
          id: String(o.id),
          label: String(o.label ?? ""),
          imageUrl:
            typeof o.imageUrl === "string" && o.imageUrl.trim()
              ? o.imageUrl.trim()
              : undefined,
        });
      }
    }
    return out;
  }

  const promptPackageRefs = promptPkgArtifact
    ? parsePromptPackageRefs(promptPkgArtifact.content)
    : [];

  const compositionGuidance = (() => {
    const c = promptPkgArtifact?.content;
    if (!c || typeof c !== "object") return null;
    const raw = (c as Record<string, unknown>)._referenceCompositionProfile;
    const p = referenceCompositionProfileSchema.safeParse(raw);
    return p.success ? compositionGuidanceSummary(p.data) : null;
  })();

  const overrideRaw = brief.visualReferenceOverrides;
  const savedReferenceUrls = Array.isArray(overrideRaw)
    ? overrideRaw
        .map((x) => String(x).trim())
        .filter((u) => u.startsWith("http://") || u.startsWith("https://"))
    : [];
  const hasVisualSpec =
    vdTask?.artifacts.some((a) => a.type === "VISUAL_SPEC") ?? false;
  const visualGenReadiness = getVisualGenerationReadiness({
    brandBible: brief.client.brandBible ?? null,
    hasPromptPackage,
    visualDirectionTaskStatus: vdTask?.status ?? null,
    imageGenerationRelevant: workPlan.showImageGeneration,
  });

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
  const composeDefaultCta = await getDefaultCtaForBrief(briefId);

  const conceptTask = taskByStage.get("CONCEPTING");
  const latestConceptArt = conceptTask?.artifacts
    .filter((a) => a.type === "CONCEPT")
    .sort((a, b) => b.version - a.version)[0];
  const parsedConcepts = parseConceptPack(latestConceptArt?.content ?? null);

  const copyTask = taskByStage.get("COPY_DEVELOPMENT");
  const latestCopyArt = copyTask?.artifacts
    .filter((a) => a.type === "COPY")
    .sort((a, b) => b.version - a.version)[0];
  const parsedCopy = parseCopyCampaign(latestCopyArt?.content ?? null);

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
      (typeof va.variantLabel === "string" &&
        va.variantLabel.startsWith("COMPOSED_")) ||
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

  const composedHeroCandidates = pkgAssets.filter(
    (a) =>
      a.composed &&
      a.resultUrl &&
      a.status === "COMPLETED" &&
      (a.variantLabel === "COMPOSED" ||
        (typeof a.variantLabel === "string" && a.variantLabel.startsWith("COMPOSED_"))),
  );
  const composedHeroAsset =
    composedHeroCandidates.find((a) => a.variantLabel === "COMPOSED") ??
    composedHeroCandidates.find((a) => a.variantLabel === "COMPOSED_SOCIAL") ??
    composedHeroCandidates.find((a) => a.variantLabel === "COMPOSED_PRINT") ??
    composedHeroCandidates.find((a) => a.variantLabel === "COMPOSED_OOH") ??
    composedHeroCandidates[0] ??
    null;

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
    workPlan.showImageGeneration &&
    Boolean(promptPackageArtifactId) &&
    composedHeroCandidates.length === 0;

  const hasCampaignStarted =
    hasWorkflow &&
    (brief.tasks.some((t) => t.status !== "PENDING") ||
      brief.tasks.some((t) => t.artifacts.length > 0));

  const strategyTaskForConf = taskByStage.get("STRATEGY");
  const latestStratArt = strategyTaskForConf?.artifacts
    .filter((a) => a.type === "STRATEGY")
    .sort((a, b) => b.version - a.version)[0];
  const reviewTaskForConf = taskByStage.get("REVIEW");
  const latestReviewArt = reviewTaskForConf?.artifacts
    .filter((a) => a.type === "REVIEW_REPORT")
    .sort((a, b) => b.version - a.version)[0];
  const confidence = computeCreativeConfidence({
    strategyContent: latestStratArt?.content ?? null,
    conceptContent: latestConceptArt?.content ?? null,
    copyContent: latestCopyArt?.content ?? null,
    reviewContent: latestReviewArt?.content ?? null,
  });

  const heroAssetId =
    composedHeroAsset?.id ??
    (cdPickAsset?.id ?? null) ??
    preferredRawHero?.id ??
    null;

  return (
    <>
      <PageHeader
        title={brief.title}
        description={brief.client.name}
        tone="muted"
      />

      {workPlan.showCampaignCreative ? (
        <StudioCampaignAtf
          clientId={clientId}
          campaignCore={campaignCore}
          heroImageUrl={workPlan.showImageGeneration ? heroImageUrl : null}
          showVisualHero={workPlan.showImageGeneration}
          primaryHeadline={parsedCopy?.primaryHeadline ?? composeDefaultHeadline}
          cta={composeDefaultCta}
          bodyCopyLead={parsedCopy?.bodyCopyLead ?? null}
          confidenceScore10={confidence.score10}
          confidenceBullets={confidence.bullets}
          hasCampaignStarted={hasCampaignStarted}
        />
      ) : (
        <div className="mb-16 rounded-3xl bg-zinc-900/20 px-8 py-14 text-center">
          <p className="text-lg font-medium text-zinc-200">
            Campaign creative isn&apos;t in scope for this engagement
          </p>
          <p className="mt-2 text-zinc-500">
            Adjust workstreams on the brief or use the creative record below for this job type.
          </p>
        </div>
      )}

      {workPlan.showCampaignCreative ? (
        <div className="mb-12 max-w-3xl">
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
            reviewApproveGate={reviewApproveGate}
            variant="campaign"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-16 lg:flex-row lg:gap-14 xl:gap-20">
        <div className="order-2 space-y-4 lg:order-1 lg:w-48 lg:shrink-0 xl:w-52">
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 lg:block">
            Behind the scenes
          </p>
          <StudioEngagementOverview plan={workPlan} />
          <StudioPipelineRail
            hasWorkflow={hasWorkflow}
            timelineTasks={timelineTasks}
            nextExecutableTaskIds={nextExecutableTaskIds}
            briefPlan={briefPlan}
          />
        </div>

        <div className="order-1 min-w-0 flex-1 space-y-20 lg:order-2 lg:space-y-28">
          {workPlan.showCampaignCreative && workPlan.showImageGeneration ? (
            <StudioCampaignVisualAlternates
              clientId={clientId}
              heroKey={heroAssetId}
              assets={pkgAssets}
            />
          ) : null}

          {workPlan.showCampaignCreative ? (
            <StudioCopyHeadlines parsed={parsedCopy} />
          ) : null}

          {workPlan.showCampaignCreative ? (
            <StudioCreativeRouteSections
              parsed={parsedConcepts}
              conceptTaskStatus={conceptTask?.status ?? null}
            />
          ) : null}

          {workPlan.showImageGeneration ? (
            <StudioExploreAlternatives
              clientId={clientId}
              briefId={briefId}
              visualDirectionStatus={vdTask?.status ?? null}
              hasVisualSpec={hasVisualSpec}
              hasPromptPackage={hasPromptPackage}
              promptPackageArtifactId={promptPackageArtifactId}
              promptPackageRefs={promptPackageRefs}
              compositionGuidance={compositionGuidance}
              savedReferenceUrls={savedReferenceUrls}
              visualAssets={visualAssetsForStudio}
              readinessLines={visualGenReadiness}
              creativeDirectorDecision={cdDecision}
              composeDefaultHeadline={composeDefaultHeadline}
              composeDefaultCta={composeDefaultCta}
              defaultOpen={exploreAlternativesDefaultOpen}
              hasBrandVisualStyle={hasBrandVisualStyle}
              showVisualGenerationModule={workPlan.showImageGeneration}
              visualLayout="campaign"
              alwaysExpanded
            />
          ) : null}

          <div id="studio-workspace-anchor" className="scroll-mt-8 space-y-6">
            {workPlan.showCampaignCreative ? null : (
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
                reviewApproveGate={reviewApproveGate}
              />
            )}
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <StudioBrandLearningPanel clientId={clientId} />
            <StudioBrandVisualIdentityPanel clientId={clientId} />
            <StudioBrandVisualStylePanel clientId={clientId} assets={trainingCandidates} />
          </div>

          <DisclosureSection
            title="Brief context"
            subtitle="Deadline and key message"
            defaultOpen={false}
          >
            <dl className="space-y-4 text-sm text-zinc-300">
              <div>
                <dt className="text-xs text-zinc-500">Deadline</dt>
                <dd className="mt-1 text-zinc-200">
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
                <dd className="mt-1 leading-relaxed text-zinc-200">{brief.keyMessage}</dd>
              </div>
            </dl>
            {canonHighlight ? (
              <p className="mt-4 text-xs leading-relaxed text-violet-200/85">{canonHighlight}</p>
            ) : null}
          </DisclosureSection>

          {workPlan.showIdentityStudio && hasWorkflow ? (
            <div className="rounded-2xl bg-fuchsia-950/10 px-5 py-5 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-fuchsia-200/80">
                Identity
              </p>
              <p className="mt-2 text-sm text-fuchsia-100/75">
                Strategy and routes live in the full creative record below.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="#studio-identity-strategy"
                  className="rounded-lg bg-fuchsia-950/40 px-3 py-1.5 text-xs font-medium text-fuchsia-100 hover:bg-fuchsia-900/50"
                >
                  Identity strategy
                </a>
                <a
                  href="#studio-identity-routes"
                  className="rounded-lg bg-fuchsia-950/40 px-3 py-1.5 text-xs font-medium text-fuchsia-100 hover:bg-fuchsia-900/50"
                >
                  Identity routes
                </a>
              </div>
            </div>
          ) : null}

          {(workPlan.showTvcModule ||
            workPlan.showSocialModule ||
            workPlan.showOohPrintModule) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {workPlan.showTvcModule ? (
                <div className="rounded-2xl bg-amber-950/15 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase text-amber-200/90">
                    TVC / film
                  </p>
                  <p className="mt-2 text-xs text-amber-100/75">
                    Script and storyboard outputs are flagged for this job.
                  </p>
                </div>
              ) : null}
              {workPlan.showSocialModule ? (
                <div className="rounded-2xl bg-sky-950/15 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase text-sky-200/90">
                    Social
                  </p>
                  <p className="mt-2 text-xs text-sky-100/75">
                    Captions and post sets flow through copy and review.
                  </p>
                </div>
              ) : null}
              {workPlan.showOohPrintModule ? (
                <div className="rounded-2xl bg-orange-950/15 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase text-orange-200/90">
                    OOH / print
                  </p>
                  <p className="mt-2 text-xs text-orange-100/75">
                    Uses the same visual path when generation is on.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {workPlan.showExportModule || workPlan.showPresentationModule ? (
            <DisclosureSection
              title="Export"
              subtitle="Download working files"
              defaultOpen={false}
            >
              {workPlan.showIdentityStudio && brief.identityWorkflowEnabled ? (
                <div className="mb-6">
                  <IdentityExportPanel
                    clientId={clientId}
                    briefId={briefId}
                    hasIdentityArtifacts={hasIdentityArtifacts}
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/export/briefs/${briefId}?clientId=${encodeURIComponent(clientId)}&format=json`}
                  className="inline-flex rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white"
                >
                  Export JSON
                </a>
                <a
                  href={`/api/export/briefs/${briefId}?clientId=${encodeURIComponent(clientId)}&format=markdown`}
                  className="inline-flex rounded-xl border border-zinc-600 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
                >
                  Export Markdown
                </a>
              </div>
            </DisclosureSection>
          ) : null}

          <DisclosureSection
            title="Decision log"
            subtitle={
              allReviews.length === 0
                ? "Nothing logged yet"
                : `${Math.min(allReviews.length, 8)} recent`
            }
            defaultOpen={false}
          >
            {allReviews.length === 0 ? (
              <p className="text-sm text-zinc-500">Nothing yet.</p>
            ) : (
              <ul className="space-y-3">
                {allReviews.slice(0, 8).map((r) => (
                  <li key={r.id} className="text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-zinc-400">
                      <span className="font-medium text-zinc-200">
                        {reviewStatusText(r.status)}
                      </span>
                      <span className="text-xs">
                        · {STUDIO_STAGE_LABELS[r.taskStage]}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                      {r.reviewerLabel ? (
                        <span className="text-xs text-zinc-500">· {r.reviewerLabel}</span>
                      ) : null}
                    </div>
                    {r.feedback ? (
                      <p className="mt-1.5 leading-relaxed text-zinc-300">{r.feedback}</p>
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
            briefPlan={briefPlan}
            taskByStage={taskByStage}
            preferredFrameworkIds={preferredFrameworkIds}
          />
        </div>
      </div>
    </>
  );
}
