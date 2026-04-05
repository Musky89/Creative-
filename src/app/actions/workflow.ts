"use server";

import { revalidatePath } from "next/cache";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";

function studioPath(clientId: string, briefId: string) {
  return `/clients/${clientId}/briefs/${briefId}/studio`;
}

export async function initializeWorkflowAction(clientId: string, briefId: string) {
  try {
    await orchestrator.initializeWorkflowForBrief(briefId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to initialize workflow.",
    };
  }
  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}

export async function executeNextTaskAction(clientId: string, briefId: string) {
  try {
    await orchestrator.executeNextReadyTask(briefId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to execute task.",
    };
  }
  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}

export async function approveTaskAction(
  clientId: string,
  briefId: string,
  taskId: string,
  feedback?: string,
) {
  try {
    await orchestrator.approveTask(taskId, feedback);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to approve task.",
    };
  }
  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}

export async function requestRevisionAction(
  clientId: string,
  briefId: string,
  taskId: string,
  feedback: string,
) {
  try {
    await orchestrator.requestTaskRevision(taskId, feedback);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to request revision.",
    };
  }
  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}

export async function resetTaskReadyAction(
  clientId: string,
  briefId: string,
  taskId: string,
) {
  try {
    await orchestrator.resetTaskToReady(taskId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to reset task.",
    };
  }
  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}
