import type {
  Artifact,
  ArtifactType,
  Prisma,
  PrismaClient,
  Task,
  TaskStatus,
} from "@/generated/prisma/client";
import { executeAgentForTask } from "@/server/agents/runner";
import { buildAgentRunInput } from "@/server/agents/run-input";
import { getAgentForStage } from "@/server/agents/registry";
import {
  assessBrandBibleReadiness,
  formatReadinessMessage,
} from "@/server/brand/readiness";
import { brandBibleToOperatingSystem } from "@/server/brand/brand-bible-operating-system";
import { getPrisma } from "@/server/db/prisma";
import { visualSpecArtifactSchema } from "@/lib/artifacts/contracts";
import { buildVisualPromptPackage } from "@/server/visual-prompt/assemble-visual-prompt-package";
import { selectVisualReferences } from "@/server/visual-reference/select-references";
import { loadBrandVisualProfileForPrompt } from "@/server/visual-identity/merge-brand-visual-profile";
import {
  arePrerequisitesSatisfied,
  statusMapFromTasks,
  taskWithDependenciesInclude,
  type TaskWithDependencies,
} from "./dependency-helpers";
import { OrchestratorError } from "./errors";
import { buildV1GraphInsertPlan } from "./task-graph-builder";
import {
  assertTaskCanBeResetToReady,
  assertTaskIsAwaitingReview,
  assertTaskIsReadyForExecution,
  assertTaskIsRunning,
  isBlockedForInitialUnlock,
} from "./task-state";
import type { WorkflowStateResponse, WorkflowTaskSnapshot } from "./types";
import { getV1PipelineRow, stageOrderIndex } from "./v1-pipeline";
import { buildPlaceholderArtifactContent } from "./scaffold/placeholder-stage-output";
import { recordArtifactOutcomeAndPerformance } from "@/server/canon/outcomes";
import { runCreativeDirectorJudge } from "@/server/agents/creative-director-judge";
import {
  buildCreativeDirectorDecisionPersisted,
  runCreativeDirectorFinalForExportTask,
} from "@/server/agents/creative-director-final-runner";
import {
  applyCreativeDirectorReworkLoop,
  applyCreativeDirectorVisualPick,
} from "@/server/orchestrator/creative-director-rework";
import {
  ensureConceptIds,
  mergeConceptSelectionIntoArtifact,
} from "@/server/orchestrator/concept-selection";
import { formatContextForPrompt, loadTaskAgentContext } from "@/server/agents/context";
import { recordConceptJudgeMemories } from "@/server/memory/brand-memory-service";
import {
  recordBrandMemoryOnArtifactApproval,
  recordBrandMemoryOnReviewRevisionRequested,
} from "@/server/memory/record-from-artifact";
import {
  formatValidationForLog,
  reviewArtifactQualityBlocksApproval,
  validateArtifactContent,
} from "@/server/orchestrator/artifact-validation";

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

async function findLatestArtifactForPipelineRow(
  db: PrismaClient,
  taskId: string,
  artifactType: ArtifactType,
): Promise<Artifact | null> {
  return db.artifact.findFirst({
    where: { taskId, type: artifactType },
    orderBy: { version: "desc" },
  });
}

function toTaskSnapshot(t: Task): WorkflowTaskSnapshot {
  return {
    id: t.id,
    briefId: t.briefId,
    stage: t.stage,
    agentType: t.agentType,
    status: t.status,
    requiresReview: t.requiresReview,
    startedAt: toIso(t.startedAt),
    completedAt: toIso(t.completedAt),
    lastFailureReason: t.lastFailureReason ?? null,
    lastFailureType: t.lastFailureType ?? null,
  };
}

export class OrchestratorService {
  constructor(private readonly db: PrismaClient = getPrisma()) {}

  async initializeWorkflowForBrief(briefId: string): Promise<WorkflowStateResponse> {
    const brief = await this.db.brief.findUnique({ where: { id: briefId } });
    if (!brief) {
      throw new OrchestratorError("NOT_FOUND", `Brief not found: ${briefId}`, 404);
    }

    const existing = await this.db.task.findFirst({ where: { briefId } });
    if (existing) {
      throw new OrchestratorError(
        "WORKFLOW_ALREADY_INITIALIZED",
        "This brief already has workflow tasks.",
      );
    }

    const plan = buildV1GraphInsertPlan(briefId, brief);
    const expectedLen = plan.tasks.length;

    await this.db.$transaction(async (tx) => {
      const created = await tx.task.createManyAndReturn({
        data: plan.tasks,
      });

      if (created.length !== expectedLen) {
        throw new Error("Unexpected task create count");
      }

      for (const { taskIndex, dependsOnIndex } of plan.dependencies) {
        await tx.taskDependency.create({
          data: {
            taskId: created[taskIndex]!.id,
            dependsOnTaskId: created[dependsOnIndex]!.id,
          },
        });
      }

      const first = created[0]!;
      await tx.task.update({
        where: { id: first.id },
        data: { status: "READY" },
      });
    });

    return this.getWorkflowState(briefId);
  }

  async getWorkflowState(briefId: string): Promise<WorkflowStateResponse> {
    const brief = await this.db.brief.findUnique({ where: { id: briefId } });
    if (!brief) {
      throw new OrchestratorError("NOT_FOUND", `Brief not found: ${briefId}`, 404);
    }

    const [tasks, dependencies] = await Promise.all([
      this.db.task.findMany({
        where: { briefId },
        orderBy: { id: "asc" },
      }),
      this.db.taskDependency.findMany({
        where: { task: { briefId } },
      }),
    ]);

    const ordered = [...tasks].sort(
      (a, b) =>
        stageOrderIndex(a.stage, brief) - stageOrderIndex(b.stage, brief),
    );
    const statusById = statusMapFromTasks(tasks);

    const tasksWithDeps: TaskWithDependencies[] = await this.db.task.findMany({
      where: { briefId },
      include: taskWithDependenciesInclude,
    });
    const depByTaskId = new Map(
      tasksWithDeps.map((t) => [t.id, t] as [string, TaskWithDependencies]),
    );

    const nextExecutableTaskIds: string[] = [];
    for (const t of ordered) {
      if (t.status !== "READY") continue;
      const full = depByTaskId.get(t.id);
      if (!full) continue;
      if (arePrerequisitesSatisfied(full, statusById)) {
        nextExecutableTaskIds.push(t.id);
      }
    }

    return {
      briefId,
      tasks: ordered.map(toTaskSnapshot),
      dependencies: dependencies.map((d) => ({
        id: d.id,
        taskId: d.taskId,
        dependsOnTaskId: d.dependsOnTaskId,
      })),
      nextExecutableTaskIds,
    };
  }

  async getNextExecutableTask(briefId: string): Promise<string | null> {
    const state = await this.getWorkflowState(briefId);
    return state.nextExecutableTaskIds[0] ?? null;
  }

  /**
   * Picks the first READY task in pipeline order and runs start + complete with optional payload / scaffold.
   */
  async executeNextReadyTask(
    briefId: string,
    options?: { artifactPayload?: Record<string, unknown> },
  ): Promise<{
    taskId: string;
    artifactId: string;
    usedPlaceholder: boolean;
  }> {
    const nextId = await this.getNextExecutableTask(briefId);
    if (!nextId) {
      throw new OrchestratorError(
        "INVALID_STATE_TRANSITION",
        "No executable READY task for this brief.",
      );
    }
    await this.startTask(nextId);
    const result = await this.completeTask(nextId, options?.artifactPayload);
    if (result.pipelineFailed) {
      throw new OrchestratorError(
        "PIPELINE_FAILED",
        "Stage failed: output was invalid or generation failed. Use Retry generation, then Run next step again.",
        400,
      );
    }
    return {
      taskId: nextId,
      artifactId: result.artifactId,
      usedPlaceholder: result.usedPlaceholder,
    };
  }

  async startTask(taskId: string): Promise<Task> {
    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: taskWithDependenciesInclude,
    });
    if (!task) {
      throw new OrchestratorError("NOT_FOUND", `Task not found: ${taskId}`, 404);
    }

    assertTaskIsReadyForExecution(task.status);

    const allTasks = await this.db.task.findMany({
      where: { briefId: task.briefId },
    });
    const statusById = statusMapFromTasks(allTasks);
    if (!arePrerequisitesSatisfied(task, statusById)) {
      throw new OrchestratorError(
        "PREREQUISITES_NOT_MET",
        "Prerequisite tasks are not COMPLETED.",
      );
    }

    if (task.agentType && getAgentForStage(task.stage)) {
      const briefRow = await this.db.brief.findUnique({
        where: { id: task.briefId },
        include: { client: { include: { brandBible: true } } },
      });
      const readiness = assessBrandBibleReadiness(
        briefRow?.client.brandBible ?? null,
      );
      if (!readiness.ok) {
        throw new OrchestratorError(
          "BRAND_BIBLE_INCOMPLETE",
          formatReadinessMessage(readiness.missing),
        );
      }
    }

    const now = new Date();

    return this.db.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: { status: "RUNNING", startedAt: now },
      });

      if (task.agentType) {
        const runInput = await buildAgentRunInput(
          taskId,
          task.stage,
          task.agentType,
        );
        await tx.agentRun.create({
          data: {
            taskId,
            agentType: task.agentType,
            input: runInput as unknown as Prisma.InputJsonValue,
            output: {
              _agenticforcePending: true,
              note: "Filled on completeTask after LLM or fallback.",
            } as Prisma.InputJsonValue,
            duration: null,
          },
        });
      }

      return updated;
    });
  }

  async completeTask(
    taskId: string,
    artifactPayload?: Record<string, unknown>,
  ): Promise<{
    artifactId: string;
    usedPlaceholder: boolean;
    pipelineFailed: boolean;
  }> {
    const task = await this.db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new OrchestratorError("NOT_FOUND", `Task not found: ${taskId}`, 404);
    }
    assertTaskIsRunning(task.status);

    const brief = await this.db.brief.findUniqueOrThrow({
      where: { id: task.briefId },
    });
    const row = getV1PipelineRow(task.stage, brief);

    let usedPlaceholder: boolean;
    let content: Record<string, unknown>;

    let agentRunMetadata: Record<string, unknown> | null = null;

    if (artifactPayload !== undefined) {
      usedPlaceholder = false;
      content = { ...artifactPayload, _agenticforceUserPayload: true };
    } else if (task.agentType && getAgentForStage(task.stage)) {
      const agentResult = await executeAgentForTask(taskId, task.stage);
      if (agentResult.ok) {
        usedPlaceholder = false;
        content = {
          ...agentResult.content,
          _agenticforceSource: "llm",
          _agenticforceModel: {
            provider: agentResult.providerId,
            model: agentResult.model,
          },
          _agenticforceGenerationPath: agentResult.generationPath,
          _agenticforceRepaired: agentResult.repaired,
        };
        agentRunMetadata = {
          provider: agentResult.providerId,
          model: agentResult.model,
          generationPath: agentResult.generationPath,
          repaired: agentResult.repaired,
          usedPlaceholderFallback: false,
          qualityLoop:
            content._agenticforceQuality &&
            typeof content._agenticforceQuality === "object"
              ? content._agenticforceQuality
              : undefined,
        };
      } else {
        usedPlaceholder = true;
        content = {
          ...buildPlaceholderArtifactContent(task.stage, row.artifactType, {
            brief,
          }),
          _agenticforceSource: "placeholder_fallback",
          _agenticforceLlmError: agentResult.error,
        };
        agentRunMetadata = {
          usedPlaceholderFallback: true,
          llmError: agentResult.error,
          ...(agentResult.partialMeta ?? {}),
        };
      }
    } else if (task.stage === "EXPORT" && row.artifactType === "EXPORT") {
      if (brief.cdReworkCount >= 1) {
        usedPlaceholder = false;
        const decision = {
          verdict: "APPROVE" as const,
          rationale:
            "Automatic pass: Creative Director final rework budget (one retry) was already consumed. Ship the latest copy and visuals; founder may still reject manually in Studio.",
          selectedAssets: {
            visualAssetId: null as string | null,
            copyVariant: "Latest COPY artifact after rework pass",
          },
          improvementDirectives: [] as string[],
          finalPass: true,
        };
        content = {
          exportStatus: "CREATIVE_DIRECTOR_APPROVED",
          formats: ["markdown", "json"],
          finalVerdict: "APPROVE",
          selectedVisualAssetId: null,
          selectedCopyVariant: decision.selectedAssets.copyVariant,
          rationale: decision.rationale,
          improvementDirectives: [],
          metadata: { creativeDirectorFinal: "synthetic_second_pass_cap" },
          _creativeDirectorDecision: decision,
          _agenticforceSource: "system",
        };
        agentRunMetadata = {
          generationPath: "creative_director_final_second_pass_cap",
          usedPlaceholderFallback: false,
        };
      } else {
      const cd = await runCreativeDirectorFinalForExportTask(taskId);
      if (cd.ok) {
        usedPlaceholder = false;
        const decision = buildCreativeDirectorDecisionPersisted(cd.output, {
          finalPass: brief.cdReworkCount >= 1,
        });
        content = {
          exportStatus:
            cd.output.finalVerdict === "APPROVE"
              ? "CREATIVE_DIRECTOR_APPROVED"
              : "CREATIVE_DIRECTOR_REWORK",
          formats: ["markdown", "json"],
          finalVerdict: cd.output.finalVerdict,
          selectedVisualAssetId: cd.output.selectedVisualAssetId,
          selectedCopyVariant: cd.output.selectedCopyVariant,
          rationale: cd.output.rationale,
          improvementDirectives: cd.output.improvementDirectives,
          metadata: {
            creativeDirectorFinal: cd.output,
          },
          _creativeDirectorDecision: decision,
          _agenticforceSource: "llm",
          _agenticforceModel: {
            provider: cd.providerId,
            model: cd.model,
          },
        };
        agentRunMetadata = {
          provider: cd.providerId,
          model: cd.model,
          generationPath: "creative_director_final",
          usedPlaceholderFallback: false,
        };
      } else {
        usedPlaceholder = true;
        content = {
          ...buildPlaceholderArtifactContent(task.stage, row.artifactType, {
            brief,
          }),
          _agenticforceSource: "placeholder_fallback",
          _agenticforceLlmError: cd.error,
          exportStatus: "CREATIVE_DIRECTOR_SKIPPED",
        };
        agentRunMetadata = {
          usedPlaceholderFallback: true,
          llmError: cd.error,
        };
      }
      }
    } else {
      usedPlaceholder = true;
      content = buildPlaceholderArtifactContent(task.stage, row.artifactType, {
        brief,
      });
    }

    if (task.stage === "CONCEPTING" && row.artifactType === "CONCEPT") {
      const withIds = ensureConceptIds(content) as Record<string, unknown>;
      const conceptsArr = withIds.concepts;
      if (Array.isArray(conceptsArr)) {
        const judgePayload = conceptsArr.map((c, i) => {
          const o =
            c && typeof c === "object"
              ? (c as Record<string, unknown>)
              : ({} as Record<string, unknown>);
          const id =
            typeof o.conceptId === "string" && o.conceptId.trim()
              ? o.conceptId.trim()
              : `concept-${i}`;
          return {
            conceptId: id,
            frameworkId: o.frameworkId,
            conceptName: o.conceptName,
            hook: o.hook,
            rationale: o.rationale,
            distinctivenessVsCategory: o.distinctivenessVsCategory,
            whyBeatsCategoryNorm: o.whyBeatsCategoryNorm,
            visualDirection: o.visualDirection,
            distinctVisualWorld: o.distinctVisualWorld,
            coreTension: o.coreTension,
            emotionalCenter: o.emotionalCenter,
            whyItWorksForBrand: o.whyItWorksForBrand,
          };
        });
        const { context } = await loadTaskAgentContext(taskId);
        const formatted = formatContextForPrompt(context);
        const judge = await runCreativeDirectorJudge({
          conceptsJson: judgePayload,
          formattedContext: formatted,
        });
        content = mergeConceptSelectionIntoArtifact(withIds, judge) as Record<
          string,
          unknown
        >;

        await recordConceptJudgeMemories(this.db, {
          clientId: brief.clientId,
          content: content as Record<string, unknown>,
          judgeScores: judge.scores,
          rejectionReasons: judge.rejectionReasons,
        });
      }
    }

    const latest = await this.db.artifact.findFirst({
      where: { taskId, type: row.artifactType },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const validation = validateArtifactContent(row.artifactType, content);
    const pipelineFailed = usedPlaceholder || !validation.ok;
    const contentRec = content as Record<string, unknown>;

    let failureType: string | null = null;
    let failureReason: string | null = null;
    if (pipelineFailed) {
      if (usedPlaceholder) {
        failureType = "LLM";
        failureReason =
          typeof contentRec._agenticforceLlmError === "string" &&
          contentRec._agenticforceLlmError.trim()
            ? String(contentRec._agenticforceLlmError).trim()
            : "Generation failed or fell back to placeholder — output is not valid for review.";
      } else if (!validation.ok) {
        failureType =
          validation.type === "PLACEHOLDER"
            ? "PLACEHOLDER"
            : validation.type === "EMPTY"
              ? "EMPTY"
              : "VALIDATION";
        failureReason = validation.zodIssues
          ? `${validation.message} (${validation.zodIssues})`
          : validation.message;
      }
      const failContent = {
        ...content,
        _pipelineFailure: true,
        _pipelineFailureType: failureType,
        _pipelineFailureReason: failureReason,
      };
      console.error(
        `[agenticforce:pipeline] task=${taskId} stage=${task.stage} FAILED type=${failureType} ${formatValidationForLog(validation)}`,
      );

      const failedArtifact = await this.db.$transaction(async (tx) => {
        const artifact = await tx.artifact.create({
          data: {
            taskId,
            type: row.artifactType,
            content: failContent as Prisma.InputJsonValue,
            version: nextVersion,
          },
        });
        await tx.task.update({
          where: { id: taskId },
          data: {
            status: "FAILED",
            completedAt: null,
            lastFailureType: failureType,
            lastFailureReason: failureReason,
          },
        });
        if (task.agentType) {
          const lastRun = await tx.agentRun.findFirst({
            where: { taskId },
            orderBy: { createdAt: "desc" },
          });
          if (lastRun) {
            const finishedAt = Date.now();
            const duration =
              task.startedAt != null
                ? Math.max(0, finishedAt - task.startedAt.getTime())
                : null;
            await tx.agentRun.update({
              where: { id: lastRun.id },
              data: {
                output: failContent as Prisma.InputJsonValue,
                duration,
                metadata: {
                  pipelineFailed: true,
                  failureType,
                  failureReason,
                  ...(agentRunMetadata && typeof agentRunMetadata === "object"
                    ? agentRunMetadata
                    : {}),
                } as Prisma.InputJsonValue,
              },
            });
          }
        }
        return artifact;
      });

      return { artifactId: failedArtifact.id, usedPlaceholder, pipelineFailed: true as const };
    }

    const nextStatus: TaskStatus = task.requiresReview
      ? "AWAITING_REVIEW"
      : "COMPLETED";

    const result = await this.db.$transaction(async (tx) => {
      const artifact = await tx.artifact.create({
        data: {
          taskId,
          type: row.artifactType,
          content: content as Prisma.InputJsonValue,
          version: nextVersion,
        },
      });

      await tx.task.update({
        where: { id: taskId },
        data: {
          status: nextStatus,
          completedAt: nextStatus === "COMPLETED" ? new Date() : null,
          lastFailureType: null,
          lastFailureReason: null,
        },
      });

      if (task.agentType) {
        const lastRun = await tx.agentRun.findFirst({
          where: { taskId },
          orderBy: { createdAt: "desc" },
        });
        if (lastRun) {
          const finishedAt = Date.now();
          const duration =
            task.startedAt != null
              ? Math.max(0, finishedAt - task.startedAt.getTime())
              : null;
          await tx.agentRun.update({
            where: { id: lastRun.id },
            data: {
              output: content as Prisma.InputJsonValue,
              duration,
              metadata:
                agentRunMetadata === null
                  ? undefined
                  : (agentRunMetadata as Prisma.InputJsonValue),
            },
          });
        }
      }

      return artifact;
    });

    if (nextStatus === "COMPLETED") {
      await this.unlockDependentTasks(taskId, row.artifactType);
    }

    if (
      task.stage === "EXPORT" &&
      row.artifactType === "EXPORT" &&
      !usedPlaceholder &&
      content &&
      typeof content.finalVerdict === "string" &&
      !content._agenticforceUserPayload
    ) {
      const fv = content.finalVerdict as string;
      const selId =
        typeof content.selectedVisualAssetId === "string"
          ? content.selectedVisualAssetId
          : null;
      const dirs = Array.isArray(content.improvementDirectives)
        ? (content.improvementDirectives as unknown[]).map((x) => String(x))
        : [];

      await applyCreativeDirectorVisualPick(this.db, {
        briefId: brief.id,
        selectedVisualAssetId: selId,
      });

      const freshBrief = await this.db.brief.findUniqueOrThrow({
        where: { id: brief.id },
      });
      const reworkCount = freshBrief.cdReworkCount;

      if (fv === "APPROVE") {
        await this.db.brief.update({
          where: { id: brief.id },
          data: { cdLastImprovementDirectives: [], cdReworkCount: 0 },
        });
      } else if (fv === "REWORK" && reworkCount === 0) {
        await this.db.brief.update({
          where: { id: brief.id },
          data: {
            cdReworkCount: 1,
            cdLastImprovementDirectives: dirs,
          },
        });
        const out = {
          finalVerdict: fv as "APPROVE" | "REWORK",
          selectedVisualAssetId: selId,
          selectedCopyVariant: String(content.selectedCopyVariant ?? ""),
          rationale: String(content.rationale ?? ""),
          improvementDirectives: dirs,
        };
        await applyCreativeDirectorReworkLoop(this.db, {
          briefId: brief.id,
          clientId: brief.clientId,
          output: out,
        });
      } else if (fv === "REWORK" && reworkCount >= 1) {
        await this.db.brief.update({
          where: { id: brief.id },
          data: { cdLastImprovementDirectives: [] },
        });
      }
    }

    return { artifactId: result.id, usedPlaceholder, pipelineFailed: false as const };
  }

  async approveTask(
    taskId: string,
    feedback?: string,
    reviewerLabel?: string | null,
    options?: { approveAnyway?: boolean },
  ): Promise<WorkflowStateResponse> {
    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: {
        brief: true,
      },
    });
    if (!task) {
      throw new OrchestratorError("NOT_FOUND", `Task not found: ${taskId}`, 404);
    }
    assertTaskIsAwaitingReview(task.status);

    const row = getV1PipelineRow(task.stage, task.brief);
    const latestArtifact = await findLatestArtifactForPipelineRow(
      this.db,
      taskId,
      row.artifactType,
    );

    const structural = validateArtifactContent(row.artifactType, latestArtifact?.content);
    if (!structural.ok) {
      throw new OrchestratorError(
        "INVALID_ARTIFACT",
        "This output is not valid and cannot be approved",
        400,
      );
    }

    const qualityGate = reviewArtifactQualityBlocksApproval(latestArtifact?.content);
    if (qualityGate.blocked && !options?.approveAnyway) {
      throw new OrchestratorError(
        "QUALITY_GATE",
        `This output is not valid and cannot be approved — ${qualityGate.reasons.join(" ")} Regenerate or check "Approve anyway (not recommended)".`,
        400,
      );
    }

    await this.db.$transaction(async (tx) => {
      await tx.reviewItem.create({
        data: {
          taskId,
          artifactId: latestArtifact?.id ?? null,
          status: "APPROVED",
          feedback: feedback ?? "",
          reviewerLabel: reviewerLabel?.trim() || null,
          reviewerSource: "studio",
        },
      });
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          lastFailureType: null,
          lastFailureReason: null,
        },
      });
    });

    if (latestArtifact) {
      await recordArtifactOutcomeAndPerformance(this.db, {
        clientId: task.brief.clientId,
        artifactId: latestArtifact.id,
        artifactContent: latestArtifact.content,
        outcome: "APPROVED",
      });
      await recordBrandMemoryOnArtifactApproval(this.db, {
        clientId: task.brief.clientId,
        stage: task.stage,
        content: latestArtifact.content,
      });
    }

    if (task.stage === "VISUAL_DIRECTION" && latestArtifact) {
      await this.persistVisualPromptPackageAfterVisualApproval(
        taskId,
        task.brief.clientId,
        latestArtifact,
        feedback,
      );
    }

    await this.unlockDependentTasks(taskId, row.artifactType);
    return this.getWorkflowState(task.briefId);
  }

  async requestTaskRevision(
    taskId: string,
    feedback: string,
    reviewerLabel?: string | null,
  ): Promise<WorkflowStateResponse> {
    if (!feedback.trim()) {
      throw new OrchestratorError(
        "VALIDATION_ERROR",
        "Revision feedback is required.",
      );
    }

    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: {
        brief: true,
      },
    });
    if (!task) {
      throw new OrchestratorError("NOT_FOUND", `Task not found: ${taskId}`, 404);
    }
    assertTaskIsAwaitingReview(task.status);

    const row = getV1PipelineRow(task.stage, task.brief);
    const latestArtifact = await findLatestArtifactForPipelineRow(
      this.db,
      taskId,
      row.artifactType,
    );

    await this.db.$transaction(async (tx) => {
      await tx.reviewItem.create({
        data: {
          taskId,
          artifactId: latestArtifact?.id ?? null,
          status: "REVISION_REQUESTED",
          feedback,
          reviewerLabel: reviewerLabel?.trim() || null,
          reviewerSource: "studio",
        },
      });
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: "REVISE_REQUIRED",
          completedAt: null,
        },
      });
    });

    if (latestArtifact) {
      await recordArtifactOutcomeAndPerformance(this.db, {
        clientId: task.brief.clientId,
        artifactId: latestArtifact.id,
        artifactContent: latestArtifact.content,
        outcome: "REVISED",
      });
      await recordBrandMemoryOnReviewRevisionRequested(this.db, {
        clientId: task.brief.clientId,
        stage: task.stage,
        content: latestArtifact.content,
      });
    }

    return this.getWorkflowState(task.briefId);
  }

  /**
   * Persists a derived VISUAL_PROMPT_PACKAGE on the same task as VISUAL_SPEC after approval.
   * Future: `generateVisualAssetFromPromptPackage(artifactId, provider)` consumes `providerVariants`.
   */
  private async persistVisualPromptPackageAfterVisualApproval(
    taskId: string,
    clientId: string,
    visualSpecArtifact: Artifact,
    founderFeedback?: string,
  ): Promise<void> {
    const raw = visualSpecArtifact.content as Record<string, unknown>;
    const stripped: Record<string, unknown> = { ...raw };
    for (const k of Object.keys(stripped)) {
      if (k.startsWith("_")) delete stripped[k];
    }
    const parsed = visualSpecArtifactSchema.safeParse(stripped);
    if (!parsed.success) {
      return;
    }

    const bb = await this.db.brandBible.findUnique({ where: { clientId } });
    if (!bb) {
      return;
    }
    const brandOs = brandBibleToOperatingSystem(bb);

    const [brandVisualProfile, clientRow] = await Promise.all([
      loadBrandVisualProfileForPrompt(this.db, clientId),
      this.db.client.findUnique({
        where: { id: clientId },
        select: { visualModelRef: true },
      }),
    ]);

    const taskRow = await this.db.task.findUnique({
      where: { id: taskId },
      select: { briefId: true },
    });
    const briefRow = taskRow
      ? await this.db.brief.findUnique({
          where: { id: taskRow.briefId },
          select: { visualReferenceOverrides: true },
        })
      : null;
    const overrideRaw = briefRow?.visualReferenceOverrides;
    const founderRefUrls: string[] = [];
    if (Array.isArray(overrideRaw)) {
      for (const x of overrideRaw) {
        const s = String(x).trim();
        if (s.startsWith("http://") || s.startsWith("https://")) {
          founderRefUrls.push(s);
        }
      }
    }

    const selectedReferences = await selectVisualReferences(this.db, {
      clientId,
      spec: parsed.data,
      brandOs,
      extraImageUrls: founderRefUrls,
      brandVisualProfile,
    });

    const pkg = buildVisualPromptPackage({
      sourceVisualSpecId: visualSpecArtifact.id,
      spec: parsed.data,
      brandOs,
      founderDirection: founderFeedback?.trim() || undefined,
      framework: null,
      selectedReferences,
      founderReferenceUrls: founderRefUrls.slice(0, 5),
      brandVisualProfile,
      visualModelRef: clientRow?.visualModelRef?.trim() || null,
    });

    const latestPkg = await this.db.artifact.findFirst({
      where: { taskId, type: "VISUAL_PROMPT_PACKAGE" },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latestPkg?.version ?? 0) + 1;

    const content = {
      ...pkg,
      _agenticforceSource: "deterministic_assembly",
      _agenticforceDerivedFromArtifactId: visualSpecArtifact.id,
    };

    await this.db.artifact.create({
      data: {
        taskId,
        type: "VISUAL_PROMPT_PACKAGE",
        content: content as Prisma.InputJsonValue,
        version: nextVersion,
      },
    });
  }

  async resetTaskToReady(taskId: string): Promise<Task> {
    const task = await this.db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new OrchestratorError("NOT_FOUND", `Task not found: ${taskId}`, 404);
    }
    assertTaskCanBeResetToReady(task.status);

    return this.db.task.update({
      where: { id: taskId },
      data: {
        status: "READY",
        startedAt: null,
        completedAt: null,
        lastFailureType: null,
        lastFailureReason: null,
      },
    });
  }

  /**
   * After a failed generation: clear failure markers and set READY for another run.
   */
  async retryTaskGeneration(taskId: string): Promise<Task> {
    const task = await this.db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new OrchestratorError("NOT_FOUND", `Task not found: ${taskId}`, 404);
    }
    if (task.status !== "FAILED") {
      throw new OrchestratorError(
        "INVALID_TASK_STATUS",
        "Retry is only for tasks in FAILED state.",
      );
    }
    return this.db.task.update({
      where: { id: taskId },
      data: {
        status: "READY",
        startedAt: null,
        completedAt: null,
        lastFailureType: null,
        lastFailureReason: null,
      },
    });
  }

  /**
   * After a prerequisite reaches COMPLETED, promote dependents from PENDING to READY
   * when all of their prerequisites are COMPLETED.
   */
  async unlockDependentTasks(
    completedTaskId: string,
    completedArtifactType: ArtifactType,
  ): Promise<void> {
    const dependents = await this.db.taskDependency.findMany({
      where: { dependsOnTaskId: completedTaskId },
    });

    if (dependents.length === 0) return;

    const dependentIds = [...new Set(dependents.map((d) => d.taskId))];
    const tasks = await this.db.task.findMany({
      where: { id: { in: dependentIds } },
      include: taskWithDependenciesInclude,
    });

    const briefId = tasks[0]?.briefId;
    if (!briefId) return;

    const completedTask = await this.db.task.findUnique({
      where: { id: completedTaskId },
      include: { brief: true },
    });
    if (!completedTask || completedTask.status !== "COMPLETED") {
      return;
    }
    const completedRow = getV1PipelineRow(completedTask.stage, completedTask.brief);
    if (completedRow.artifactType !== completedArtifactType) {
      return;
    }
    const latestCompletedArtifact = await findLatestArtifactForPipelineRow(
      this.db,
      completedTaskId,
      completedArtifactType,
    );
    if (!latestCompletedArtifact) {
      return;
    }
    const v = validateArtifactContent(
      completedArtifactType,
      latestCompletedArtifact.content,
    );
    if (!v.ok) {
      console.warn(
        `[agenticforce:pipeline] unlock blocked for dependents of ${completedTaskId}: ${formatValidationForLog(v)}`,
      );
      return;
    }

    const allBriefTasks = await this.db.task.findMany({
      where: { briefId },
    });
    const statusById = statusMapFromTasks(allBriefTasks);

    for (const t of tasks) {
      if (isBlockedForInitialUnlock(t.status)) continue;
      if (!arePrerequisitesSatisfied(t, statusById)) continue;
      await this.db.task.update({
        where: { id: t.id },
        data: { status: "READY" },
      });
    }
  }
}

export const orchestrator = new OrchestratorService();
