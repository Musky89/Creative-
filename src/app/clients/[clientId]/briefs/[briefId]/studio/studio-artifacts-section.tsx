import type {
  ArtifactType,
  WorkflowStage,
} from "@/generated/prisma/client";
import { ArtifactByType } from "@/components/artifacts/artifact-viewer";
import { DisclosureSection } from "@/components/ui/collapse";
import { VisualAssetsPanel } from "@/components/studio/visual-assets-panel";
import { Card } from "@/components/ui/section";
import { STAGE_LABELS, type WorkflowStageOrder } from "@/lib/workflow-display";
import { getArtifactTypeForStudioStage } from "@/server/orchestrator/v1-pipeline";
import { IdentityRouteSelectionWrapper } from "./identity-route-selection-wrapper";
import {
  MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE,
  MAX_VISUAL_ASSETS_PER_PACKAGE,
} from "@/server/visual-generation/generate-visual-asset-from-prompt-package";

type TaskRow = {
  id: string;
  stage: WorkflowStage;
  status: string;
  artifacts: {
    id: string;
    type: ArtifactType;
    version: number;
    content: unknown;
  }[];
};

type VisualAssetRow = {
  id: string;
  status: string;
  providerTarget: string;
  providerName: string;
  modelName: string;
  resultUrl: string | null;
  sourceArtifactId: string;
  generationNotes: string | null;
  createdAt: Date;
  isPreferred: boolean;
  isSecondary: boolean;
  autoRejected: boolean;
  founderRejected: boolean;
  cdDirectorPick?: boolean;
  regenerationAttempt: number;
  review: {
    qualityVerdict: string;
    regenerationRecommended: boolean;
    evaluator: string;
    evaluation: Record<string, unknown> | null;
  } | null;
};

function latestArtifact(
  task: TaskRow | undefined,
  type: ArtifactType,
): TaskRow["artifacts"][number] | null {
  if (!task) return null;
  const same = task.artifacts.filter((a) => a.type === type);
  if (same.length === 0) return null;
  return same.reduce((a, b) => (a.version >= b.version ? a : b));
}

const assetRowsForPanel = (visualAssets: VisualAssetRow[]) =>
  visualAssets.map((va) => ({
    id: va.id,
    status: va.status,
    providerTarget: va.providerTarget,
    providerName: va.providerName,
    modelName: va.modelName,
    resultUrl: va.resultUrl,
    sourceArtifactId: va.sourceArtifactId,
    generationNotes: va.generationNotes,
    createdAt: va.createdAt.toISOString(),
    isPreferred: va.isPreferred,
    isSecondary: va.isSecondary,
    autoRejected: va.autoRejected,
    founderRejected: va.founderRejected,
    cdDirectorPick: va.cdDirectorPick,
    regenerationAttempt: va.regenerationAttempt,
    review: va.review
      ? {
          qualityVerdict: va.review.qualityVerdict,
          regenerationRecommended: va.review.regenerationRecommended,
          evaluator: va.review.evaluator,
          evaluation: va.review.evaluation,
        }
      : null,
  }));

export function StudioArtifactsSection({
  clientId,
  briefId,
  stageOrder,
  taskByStage,
  preferredFrameworkIds,
  visualAssets,
}: {
  clientId: string;
  briefId: string;
  stageOrder: WorkflowStageOrder;
  taskByStage: Map<WorkflowStage, TaskRow>;
  preferredFrameworkIds: string[];
  visualAssets: VisualAssetRow[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Outputs
      </h2>
      <div className="space-y-2">
        {stageOrder.map((stage) => {
          const task = taskByStage.get(stage);
          if (!task) return null;
          const at = getArtifactTypeForStudioStage(stage);
          if (!at) return null;
          const art = latestArtifact(task, at);
          const promptPkg =
            stage === "VISUAL_DIRECTION"
              ? latestArtifact(task, "VISUAL_PROMPT_PACKAGE")
              : null;

          if (stage === "VISUAL_DIRECTION") {
            const hasSpec = !!art;
            const vdOpen =
              hasSpec ||
              !!promptPkg ||
              (task.status === "AWAITING_REVIEW" && hasSpec);
            return (
              <div key={stage} className="space-y-3">
                <DisclosureSection
                  title={STAGE_LABELS[stage]}
                  subtitle={
                    hasSpec
                      ? "Visual spec — expand to review"
                      : "Nothing generated yet"
                  }
                  defaultOpen={vdOpen}
                >
                  <div id="studio-visual-direction-artifact">
                    {!hasSpec ? (
                      <p className="text-sm text-zinc-500">
                        Run the workflow until this stage produces an artifact.
                      </p>
                    ) : (
                      <div className="space-y-6">
                        <ArtifactByType
                          type={art!.type}
                          content={art!.content}
                          preferredFrameworkIds={preferredFrameworkIds}
                        />
                        {!promptPkg ? (
                          <Card className="border-zinc-700/80 bg-zinc-950/40">
                            <p className="text-sm font-medium text-zinc-200">
                              Next: approve to unlock images
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                              The{" "}
                              <strong className="text-zinc-300">visual prompt package</strong> and{" "}
                              <strong className="text-zinc-300">Generate</strong> controls live in{" "}
                              <a
                                href="#studio-image-generation"
                                className="text-sky-400 underline"
                              >
                                Campaign images
                              </a>{" "}
                              after you approve Visual direction in{" "}
                              <a href="#review" className="text-sky-400 underline">
                                Actions
                              </a>
                              .
                            </p>
                          </Card>
                        ) : null}
                      </div>
                    )}
                  </div>
                </DisclosureSection>

                {promptPkg ? (
                  <div className="rounded-xl border border-dashed border-zinc-700/60 bg-zinc-950/30 px-4 py-3">
                    <p className="text-xs font-medium text-zinc-500 uppercase">
                      Also in Campaign images
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Prompt package + generation controls are duplicated in the{" "}
                      <a href="#studio-image-generation" className="text-sky-400 underline">
                        Campaign images
                      </a>{" "}
                      section above for visibility.
                    </p>
                    <div className="mt-4">
                      <ArtifactByType
                        type={promptPkg.type}
                        content={promptPkg.content}
                        preferredFrameworkIds={preferredFrameworkIds}
                      />
                    </div>
                    <VisualAssetsPanel
                      clientId={clientId}
                      briefId={briefId}
                      promptPackageArtifactId={promptPkg.id}
                      critiqueRegenLimit={MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE}
                      packageAssetLimit={MAX_VISUAL_ASSETS_PER_PACKAGE}
                      assets={assetRowsForPanel(visualAssets)}
                      compact
                      panelTitle="Visual variants (same as hub)"
                    />
                  </div>
                ) : null}
              </div>
            );
          }

          const hasAny = art;
          const label = STAGE_LABELS[stage];
          return (
            <DisclosureSection
              key={stage}
              title={label}
              subtitle={hasAny ? "Tap to expand" : "Nothing generated yet"}
              defaultOpen={!!hasAny}
            >
              {!hasAny ? (
                <p className="text-sm text-zinc-500">
                  Run the workflow until this stage produces an artifact.
                </p>
              ) : (
                <div className="space-y-6">
                  <ArtifactByType
                    type={art!.type}
                    content={art!.content}
                    preferredFrameworkIds={preferredFrameworkIds}
                  />
                  {stage === "IDENTITY_ROUTING" ? (
                    <IdentityRouteSelectionWrapper
                      clientId={clientId}
                      briefId={briefId}
                      taskId={task.id}
                      content={art!.content}
                    />
                  ) : null}
                </div>
              )}
            </DisclosureSection>
          );
        })}
      </div>
    </section>
  );
}
