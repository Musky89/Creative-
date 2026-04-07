import { getPrisma } from "@/server/db/prisma";
import {
  reviewArtifactQualityBlocksApproval,
  validateArtifactContent,
} from "@/server/orchestrator/artifact-validation";
import { getV1PipelineRow } from "@/server/orchestrator/v1-pipeline";
import { loadCampaignCoreForBrief } from "@/server/campaign/load-campaign-core";

export type ReviewApproveGate = {
  canApprove: boolean;
  structuralOk: boolean;
  structuralMessage: string | null;
  qualityBlocked: boolean;
  qualityReasons: string[];
};

export async function getReviewApproveGate(args: {
  clientId: string;
  briefId: string;
  reviewTaskId: string | null;
}): Promise<ReviewApproveGate | null> {
  if (!args.reviewTaskId) return null;
  const prisma = getPrisma();
  const task = await prisma.task.findFirst({
    where: {
      id: args.reviewTaskId,
      briefId: args.briefId,
      brief: { clientId: args.clientId },
    },
    include: { brief: true },
  });
  if (!task || task.status !== "AWAITING_REVIEW") {
    return null;
  }
  const row = getV1PipelineRow(task.stage, task.brief);
  const art = await prisma.artifact.findFirst({
    where: { taskId: task.id, type: row.artifactType },
    orderBy: { version: "desc" },
  });
  const campaignCore = await loadCampaignCoreForBrief(prisma, args.briefId);
  const structural = validateArtifactContent(row.artifactType, art?.content, {
    campaignCore,
  });
  const quality = reviewArtifactQualityBlocksApproval(art?.content);
  const canApprove = structural.ok && !quality.blocked;
  return {
    canApprove,
    structuralOk: structural.ok,
    structuralMessage: structural.ok ? null : structural.message,
    qualityBlocked: quality.blocked,
    qualityReasons: quality.reasons,
  };
}
