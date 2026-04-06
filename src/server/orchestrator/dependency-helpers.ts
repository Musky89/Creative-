import type { Prisma, Task, TaskDependency, TaskStatus } from "@/generated/prisma/client";

export type TaskWithDeps = Task & {
  dependencies: TaskDependency[];
};

/**
 * Prerequisites are satisfied when every dependsOn task is COMPLETED.
 */
export function arePrerequisitesSatisfied(
  task: TaskWithDeps,
  statusByTaskId: Map<string, TaskStatus>,
): boolean {
  for (const dep of task.dependencies) {
    const st = statusByTaskId.get(dep.dependsOnTaskId);
    if (st !== "COMPLETED") {
      return false;
    }
  }
  return true;
}

/**
 * Build a map of taskId -> status from a task list.
 */
export function statusMapFromTasks(tasks: Pick<Task, "id" | "status">[]): Map<string, TaskStatus> {
  const m = new Map<string, TaskStatus>();
  for (const t of tasks) {
    m.set(t.id, t.status);
  }
  return m;
}

export const taskWithDependenciesInclude = {
  dependencies: true,
} satisfies Prisma.TaskInclude;

export type TaskWithDependencies = Prisma.TaskGetPayload<{
  include: typeof taskWithDependenciesInclude;
}>;
