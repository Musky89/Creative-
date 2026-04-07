"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { getV1PipelineRow } from "@/server/orchestrator/v1-pipeline";

function studioPath(clientId: string, briefId: string) {
  return `/clients/${clientId}/briefs/${briefId}/studio`;
}

export async function saveIdentityRouteSelectionAction(
  clientId: string,
  briefId: string,
  taskId: string,
  preferredIndex: number,
  feedback: string,
): Promise<{ error?: string; ok?: string }> {
  const prisma = getPrisma();
  const task = await prisma.task.findFirst({
    where: { id: taskId, briefId, brief: { clientId } },
    include: { brief: true },
  });
  if (!task) return { error: "Task not found." };
  if (task.stage !== "IDENTITY_ROUTING") {
    return { error: "Route selection applies only to the Identity routes stage." };
  }

  const row = getV1PipelineRow(task.stage, task.brief);
  const latest = await prisma.artifact.findFirst({
    where: { taskId, type: row.artifactType },
    orderBy: { version: "desc" },
  });
  if (!latest) return { error: "No identity routes artifact yet." };

  const content = latest.content;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return { error: "Invalid artifact content." };
  }
  const base = content as Record<string, unknown>;
  const routes = base.routes;
  if (!Array.isArray(routes) || preferredIndex < 0 || preferredIndex >= routes.length) {
    return { error: "Invalid route index for this pack." };
  }

  const next = {
    ...base,
    founderPreferredRouteIndex: preferredIndex,
    founderRouteFeedback: feedback.trim() || undefined,
  };

  await prisma.artifact.update({
    where: { id: latest.id },
    data: { content: next as Prisma.InputJsonValue },
  });

  revalidatePath(studioPath(clientId, briefId));
  return { ok: "Saved selection." };
}
