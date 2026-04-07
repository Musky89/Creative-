import type {
  ArtifactType,
  WorkflowStage,
} from "@/generated/prisma/client";
import { ArtifactByType } from "@/components/artifacts/artifact-viewer";
import { DisclosureSection } from "@/components/ui/collapse";
import { Card } from "@/components/ui/section";
import {
  STUDIO_STAGE_LABELS,
  type WorkflowStageOrder,
} from "@/lib/workflow-display";
import type { BriefForWorkPlan } from "@/lib/workflow/brief-work-plan";
import { getArtifactTypeForStudioStage } from "@/server/orchestrator/v1-pipeline";
import { IdentityRouteSelectionWrapper } from "./identity-route-selection-wrapper";

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

function latestArtifact(
  task: TaskRow | undefined,
  type: ArtifactType,
): TaskRow["artifacts"][number] | null {
  if (!task) return null;
  const same = task.artifacts.filter((a) => a.type === type);
  if (same.length === 0) return null;
  return same.reduce((a, b) => (a.version >= b.version ? a : b));
}

export function StudioArtifactsSection({
  clientId,
  briefId,
  stageOrder,
  briefPlan,
  taskByStage,
  preferredFrameworkIds,
}: {
  clientId: string;
  briefId: string;
  stageOrder: WorkflowStageOrder;
  briefPlan: BriefForWorkPlan;
  taskByStage: Map<WorkflowStage, TaskRow>;
  preferredFrameworkIds: string[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Full creative record
      </h2>
      <p className="text-xs text-zinc-600">
        Everything the system produced — expand a section for detail.
      </p>
      <div className="space-y-2">
        {stageOrder.map((stage) => {
          const task = taskByStage.get(stage);
          if (!task) return null;
          const at = getArtifactTypeForStudioStage(stage, briefPlan);
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
                  title={STUDIO_STAGE_LABELS[stage]}
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
                                Frames &amp; finishing
                              </a>{" "}
                              after you approve visual world in{" "}
                              <a href="#studio-workspace" className="text-sky-400 underline">
                                Workspace
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
                      Prompt package
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Generate frames and run the finishing pass in{" "}
                      <a href="#studio-image-generation" className="text-sky-400 underline">
                        Explore alternatives
                      </a>
                      .
                    </p>
                    <div className="mt-4">
                      <ArtifactByType
                        type={promptPkg.type}
                        content={promptPkg.content}
                        preferredFrameworkIds={preferredFrameworkIds}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          }

          const hasAny = art;
          const label = STUDIO_STAGE_LABELS[stage];
          const sectionId =
            stage === "IDENTITY_STRATEGY"
              ? "studio-identity-strategy"
              : stage === "IDENTITY_ROUTING"
                ? "studio-identity-routes"
                : undefined;
          return (
            <DisclosureSection
              key={stage}
              id={sectionId}
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
