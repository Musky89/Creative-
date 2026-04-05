import type { Prisma } from "@/generated/prisma/client";
import { V1_PIPELINE } from "./v1-pipeline";

export type V1GraphInsertPlan = {
  tasks: Prisma.TaskCreateManyInput[];
  dependencies: { taskIndex: number; dependsOnIndex: number }[];
};

/**
 * Builds the canonical v1 linear graph: task i depends on task i-1.
 * Caller persists tasks (to obtain ids), then creates TaskDependency rows.
 */
export function buildV1GraphInsertPlan(briefId: string): V1GraphInsertPlan {
  const tasks: Prisma.TaskCreateManyInput[] = V1_PIPELINE.map((row) => ({
    briefId,
    stage: row.stage,
    agentType: row.agentType,
    requiresReview: row.requiresReview,
    status: "PENDING",
  }));

  const dependencies: { taskIndex: number; dependsOnIndex: number }[] = [];
  for (let i = 1; i < V1_PIPELINE.length; i++) {
    dependencies.push({ taskIndex: i, dependsOnIndex: i - 1 });
  }

  return { tasks, dependencies };
}
