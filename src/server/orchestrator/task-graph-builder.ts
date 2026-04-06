import type { Prisma } from "@/generated/prisma/client";
import { buildV1PipelineRows } from "./v1-pipeline";

export type V1GraphInsertPlan = {
  tasks: Prisma.TaskCreateManyInput[];
  dependencies: { taskIndex: number; dependsOnIndex: number }[];
};

/**
 * Builds the canonical v1 linear graph: task i depends on task i-1.
 * Caller persists tasks (to obtain ids), then creates TaskDependency rows.
 */
export function buildV1GraphInsertPlan(
  briefId: string,
  identityWorkflowEnabled: boolean,
): V1GraphInsertPlan {
  const pipeline = buildV1PipelineRows(identityWorkflowEnabled);
  const tasks: Prisma.TaskCreateManyInput[] = pipeline.map((row) => ({
    briefId,
    stage: row.stage,
    agentType: row.agentType,
    requiresReview: row.requiresReview,
    status: "PENDING",
  }));

  const dependencies: { taskIndex: number; dependsOnIndex: number }[] = [];
  for (let i = 1; i < pipeline.length; i++) {
    dependencies.push({ taskIndex: i, dependsOnIndex: i - 1 });
  }

  const exportIdx = pipeline.findIndex((r) => r.stage === "EXPORT");
  const copyIdx = pipeline.findIndex((r) => r.stage === "COPY_DEVELOPMENT");
  if (exportIdx >= 0 && copyIdx >= 0 && copyIdx !== exportIdx - 1) {
    dependencies.push({ taskIndex: exportIdx, dependsOnIndex: copyIdx });
  }

  return { tasks, dependencies };
}
