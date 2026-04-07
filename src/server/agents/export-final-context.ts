import { getPrisma } from "@/server/db/prisma";
import type { WorkflowStage } from "@/generated/prisma/client";

function stripUnderscoreKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_")) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Assembles the Creative Director (final) packet: winning concept, copy, top visuals, brand, brief.
 */
export async function loadExportFinalContext(taskId: string): Promise<{
  packetJson: string;
}> {
  const prisma = getPrisma();
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      brief: {
        include: {
          client: { include: { brandBible: true } },
        },
      },
    },
  });
  const brief = task.brief;

  const tasks = await prisma.task.findMany({
    where: { briefId: brief.id },
    orderBy: { id: "asc" },
  });

  const latestArtifact = async (stage: WorkflowStage, type: string) => {
    const t = tasks.find((x) => x.stage === stage);
    if (!t) return null;
    return prisma.artifact.findFirst({
      where: { taskId: t.id, type: type as never },
      orderBy: { version: "desc" },
    });
  };

  const conceptArt = await latestArtifact("CONCEPTING", "CONCEPT");
  let winningConcept: unknown = null;
  if (conceptArt?.content && typeof conceptArt.content === "object") {
    const c = conceptArt.content as Record<string, unknown>;
    const concepts = c.concepts;
    const sel = c._agenticforceSelection as Record<string, unknown> | undefined;
    const winnerId =
      typeof sel?.winnerConceptId === "string" ? sel.winnerConceptId.trim() : "";
    if (Array.isArray(concepts)) {
      const picked = concepts.find(
        (x) =>
          x &&
          typeof x === "object" &&
          String((x as Record<string, unknown>).conceptId ?? "") === winnerId,
      );
      winningConcept =
        picked && typeof picked === "object"
          ? stripUnderscoreKeys(picked as Record<string, unknown>)
          : concepts[0] && typeof concepts[0] === "object"
            ? stripUnderscoreKeys(concepts[0] as Record<string, unknown>)
            : null;
    }
  }

  const copyArt = await latestArtifact("COPY_DEVELOPMENT", "COPY");
  const copyPayload =
    copyArt?.content && typeof copyArt.content === "object"
      ? stripUnderscoreKeys(copyArt.content as Record<string, unknown>)
      : null;

  const reviewArt = await latestArtifact("REVIEW", "REVIEW_REPORT");
  const reviewPayload =
    reviewArt?.content && typeof reviewArt.content === "object"
      ? stripUnderscoreKeys(reviewArt.content as Record<string, unknown>)
      : null;

  const visuals = await prisma.visualAsset.findMany({
    where: {
      briefId: brief.id,
      status: "COMPLETED",
      OR: [{ isPreferred: true }, { isSecondary: true }],
    },
    orderBy: [{ isPreferred: "desc" }, { createdAt: "desc" }],
    take: 2,
    include: { review: true },
  });

  const visualSummaries = visuals.map((v) => ({
    id: v.id,
    resultUrl: v.resultUrl,
    variantLabel: v.variantLabel,
    providerName: v.providerName,
    modelName: v.modelName,
    isPreferred: v.isPreferred,
    isSecondary: v.isSecondary,
    autoRejected: v.autoRejected,
    review: v.review
      ? {
          qualityVerdict: v.review.qualityVerdict,
          evaluation: v.review.evaluation,
        }
      : null,
  }));

  const bb = brief.client.brandBible;

  const packet = {
    brief: {
      title: brief.title,
      engagementType: brief.engagementType,
      workstreams: brief.workstreams,
      businessObjective: brief.businessObjective,
      communicationObjective: brief.communicationObjective,
      targetAudience: brief.targetAudience,
      keyMessage: brief.keyMessage,
      tone: brief.tone,
      deliverablesRequested: brief.deliverablesRequested,
      constraints: brief.constraints,
      deadline: brief.deadline.toISOString(),
    },
    brandBible: bb
      ? {
          positioning: bb.positioning,
          targetAudience: bb.targetAudience,
          toneOfVoice: bb.toneOfVoice,
          messagingPillars: bb.messagingPillars,
          visualStyle: bb.visualStyle,
          colorPhilosophy: bb.colorPhilosophy,
          tasteShouldFeelLike: bb.tasteShouldFeelLike,
          tasteMustNotFeelLike: bb.tasteMustNotFeelLike,
          categoryDifferentiation: bb.categoryDifferentiation,
          primaryEmotion: bb.primaryEmotion,
          persuasionStyle: bb.persuasionStyle,
        }
      : null,
    winningConcept,
    copy: copyPayload,
    brandGuardianReview: reviewPayload,
    topVisualAssets: visualSummaries,
    pipelineNote:
      "Identity workflow stages (if any) appear in upstream artifacts in chronological order.",
  };

  return {
    packetJson: JSON.stringify(packet, null, 2).slice(0, 48_000),
  };
}
