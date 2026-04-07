import type { PrismaClient } from "@/generated/prisma/client";
import type { CampaignCore } from "@/lib/campaign/campaign-core";
import { parseCampaignCoreFromUnknown } from "@/lib/campaign/campaign-core";

/**
 * Latest Campaign Core from the brief's STRATEGY task (if present and valid).
 */
export async function loadCampaignCoreForBrief(
  db: PrismaClient,
  briefId: string,
): Promise<CampaignCore | null> {
  const strategyTask = await db.task.findFirst({
    where: { briefId, stage: "STRATEGY" },
    orderBy: { id: "asc" },
  });
  if (!strategyTask) return null;
  const art = await db.artifact.findFirst({
    where: { taskId: strategyTask.id, type: "STRATEGY" },
    orderBy: { version: "desc" },
  });
  if (!art?.content || typeof art.content !== "object") return null;
  const raw = (art.content as Record<string, unknown>).campaignCore;
  return parseCampaignCoreFromUnknown(raw);
}
