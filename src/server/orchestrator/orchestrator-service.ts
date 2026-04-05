import type { Prisma, PrismaClient, Task, TaskStatus } from "@/generated/prisma/client";
import { executeAgentForTask } from "@/server/agents/runner";
import { buildAgentRunInput } from "@/server/agents/run-input";
import { getAgentForStage } from "@/server/agents/registry";
import {
  assessBrandBibleReadiness,
  formatReadinessMessage,
} from "@/server/brand/readiness";
import { getPrisma } from "@/server/db/prisma";
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
import { getV1PipelineRow, stageOrderIndex, V1_PIPELINE } from "./v1-pipeline";
import { buildPlaceholderArtifactContent } from "./scaffold/placeholder-stage-output";
import { recordArtifactOutcomeAndPerformance } from "@/server/canon/outcomes";

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
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

    const plan = buildV1GraphInsertPlan(briefId);

    await this.db.$transaction(async (tx) => {
      const created = await tx.task.createManyAndReturn({
        data: plan.tasks,
      });

      if (created.length !== V1_PIPELINE.length) {
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
      (a, b) => stageOrderIndex(a.stage) - stageOrderIndex(b.stage),
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
    const { artifactId, usedPlaceholder } = await this.completeTask(
      nextId,
      options?.artifactPayload,
    );
    return { taskId: nextId, artifactId, usedPlaceholder };
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
  ): Promise<{ artifactId: string; usedPlaceholder: boolean }> {
    const task = await this.db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new OrchestratorError("NOT_FOUND", `Task not found: ${taskId}`, 404);
    }
    assertTaskIsRunning(task.status);

    const row = getV1PipelineRow(task.stage);
    const brief = await this.db.brief.findUniqueOrThrow({
      where: { id: task.briefId },
    });

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
    } else {
      usedPlaceholder = true;
      content = buildPlaceholderArtifactContent(task.stage, row.artifactType, {
        brief,
      });
    }

    const latest = await this.db.artifact.findFirst({
      where: { taskId, type: row.artifactType },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

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
      await this.unlockDependentTasks(taskId);
    }

    return { artifactId: result.id, usedPlaceholder };
  }

  async approveTask(
    taskId: string,
    feedback?: string,
    reviewerLabel?: string | null,
  ): Promise<WorkflowStateResponse> {
    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: { brief: { select: { clientId: true } } },
    });
    if (!task) {
      throw new OrchestratorError("NOT_FOUND", `Task not found: ${taskId}`, 404);
    }
    assertTaskIsAwaitingReview(task.status);

    const latestArtifact = await this.db.artifact.findFirst({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

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
    }

    await this.unlockDependentTasks(taskId);
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
      include: { brief: { select: { clientId: true } } },
    });
    if (!task) {
      throw new OrchestratorError("NOT_FOUND", `Task not found: ${taskId}`, 404);
    }
    assertTaskIsAwaitingReview(task.status);

    const latestArtifact = await this.db.artifact.findFirst({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

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
    }

    return this.getWorkflowState(task.briefId);
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
      },
    });
  }

  /**
   * After a prerequisite reaches COMPLETED, promote dependents from PENDING to READY
   * when all of their prerequisites are COMPLETED.
   */
  async unlockDependentTasks(completedTaskId: string): Promise<void> {
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
