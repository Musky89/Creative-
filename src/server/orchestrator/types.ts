import type { TaskStatus, WorkflowStage } from "@/generated/prisma/client";

export type TaskDependencyEdge = {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
};

export type WorkflowTaskSnapshot = {
  id: string;
  briefId: string;
  stage: WorkflowStage;
  agentType: string | null;
  status: TaskStatus;
  requiresReview: boolean;
  startedAt: string | null;
  completedAt: string | null;
};

export type WorkflowStateResponse = {
  briefId: string;
  tasks: WorkflowTaskSnapshot[];
  dependencies: TaskDependencyEdge[];
  nextExecutableTaskIds: string[];
};
