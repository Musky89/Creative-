import type { TaskStatus } from "@/generated/prisma/client";
import { OrchestratorError } from "./errors";

export function assertTaskIsReadyForExecution(status: TaskStatus): void {
  if (status !== "READY") {
    throw new OrchestratorError(
      "INVALID_TASK_STATUS",
      `Task must be READY to start (current: ${status}).`,
    );
  }
}

export function assertTaskCanBeResetToReady(status: TaskStatus): void {
  if (status !== "REVISE_REQUIRED") {
    throw new OrchestratorError(
      "INVALID_TASK_STATUS",
      `Only tasks in REVISE_REQUIRED can be reset to READY (current: ${status}).`,
    );
  }
}

export function assertTaskIsRunning(status: TaskStatus): void {
  if (status !== "RUNNING") {
    throw new OrchestratorError(
      "INVALID_TASK_STATUS",
      `Task must be RUNNING to complete (current: ${status}).`,
    );
  }
}

export function assertTaskIsAwaitingReview(status: TaskStatus): void {
  if (status !== "AWAITING_REVIEW") {
    throw new OrchestratorError(
      "INVALID_TASK_STATUS",
      `Task must be AWAITING_REVIEW for this action (current: ${status}).`,
    );
  }
}

/**
 * Whether a dependent task may be promoted from PENDING to READY when prerequisites complete.
 */
export function isBlockedForInitialUnlock(status: TaskStatus): boolean {
  return status !== "PENDING";
}
