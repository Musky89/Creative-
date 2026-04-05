import type {
  PrivateEvaluationStage,
  PrivateEvaluationVerdict,
} from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import {
  artifactTypeForStage,
  buildIssueTags,
  extractStillWeakFromContent,
  frameworkIdsFromArtifactContent,
} from "@/server/internal-test/evaluation-helpers";
import type { WorkflowStage } from "@/generated/prisma/client";

export async function createPrivateEvaluationSession(
  clientId: string,
  briefId: string,
  label?: string | null,
) {
  const prisma = getPrisma();
  const brief = await prisma.brief.findFirst({
    where: { id: briefId, clientId },
  });
  if (!brief) throw new Error("Brief not found for this client.");
  return prisma.privateEvaluationSession.create({
    data: {
      briefId,
      label: label?.trim() || null,
    },
  });
}

export async function savePrivateEvaluationRecord(args: {
  clientId: string;
  briefId: string;
  sessionId?: string | null;
  stage: PrivateEvaluationStage;
  verdict: PrivateEvaluationVerdict;
  notes: string;
  feltGeneric: boolean;
  brandAlignmentStrong: boolean | null;
  wouldUse: boolean | null;
  artifactId?: string | null;
  visualAssetId?: string | null;
}) {
  const prisma = getPrisma();
  const brief = await prisma.brief.findFirst({
    where: { id: args.briefId, clientId: args.clientId },
  });
  if (!brief) throw new Error("Brief not found.");

  let stillWeak = false;
  let frameworkIds: Prisma.InputJsonValue = [];

  if (args.visualAssetId) {
    const va = await prisma.visualAsset.findFirst({
      where: {
        id: args.visualAssetId,
        clientId: args.clientId,
        briefId: args.briefId,
      },
      include: { sourceArtifact: true, review: true },
    });
    if (!va) throw new Error("Visual asset not found for this brief.");
    stillWeak =
      extractStillWeakFromContent(va.sourceArtifact.content) ||
      (va.review?.regenerationRecommended === true &&
        va.review.qualityVerdict === "WEAK");
    frameworkIds = frameworkIdsFromArtifactContent(va.sourceArtifact.content);
  } else if (args.artifactId) {
    const art = await prisma.artifact.findFirst({
      where: {
        id: args.artifactId,
        task: { briefId: args.briefId, brief: { clientId: args.clientId } },
      },
    });
    if (!art) {
      throw new Error("Artifact not found for this brief.");
    }
    stillWeak = extractStillWeakFromContent(art.content);
    frameworkIds = frameworkIdsFromArtifactContent(art.content);
  }

  const issueTags = buildIssueTags({
    verdict: args.verdict,
    feltGeneric: args.feltGeneric,
    brandAlignmentStrong: args.brandAlignmentStrong,
    wouldUse: args.wouldUse,
    stillWeak,
  });

  return prisma.privateEvaluationRecord.create({
    data: {
      clientId: args.clientId,
      briefId: args.briefId,
      sessionId: args.sessionId?.trim() || null,
      stage: args.stage,
      verdict: args.verdict,
      notes: args.notes.trim(),
      feltGeneric: args.feltGeneric,
      brandAlignmentStrong: args.brandAlignmentStrong,
      wouldUse: args.wouldUse,
      artifactId: args.artifactId?.trim() || null,
      visualAssetId: args.visualAssetId?.trim() || null,
      detectedStillWeakAfterRegen: stillWeak,
      detectedFrameworkIds: frameworkIds,
      issueTags: issueTags as Prisma.InputJsonValue,
    },
  });
}

function workflowStageForEval(
  stage: PrivateEvaluationStage,
): WorkflowStage | null {
  if (stage === "STRATEGY") return "STRATEGY";
  if (stage === "CONCEPT") return "CONCEPTING";
  if (stage === "VISUAL_SPEC") return "VISUAL_DIRECTION";
  if (stage === "COPY") return "COPY_DEVELOPMENT";
  return null;
}

/** Latest artifact for a pipeline stage (task stage + artifact type). */
export async function getLatestArtifactForEvalStage(
  briefId: string,
  stage: PrivateEvaluationStage,
) {
  const prisma = getPrisma();
  if (stage === "VISUAL_ASSET") {
    const va = await prisma.visualAsset.findFirst({
      where: { briefId, status: "COMPLETED" },
      orderBy: [{ isPreferred: "desc" }, { createdAt: "desc" }],
    });
    return { kind: "visual" as const, visualAsset: va, artifact: null };
  }
  const at = artifactTypeForStage(stage);
  const ws = workflowStageForEval(stage);
  if (!at || !ws) return { kind: "artifact" as const, visualAsset: null, artifact: null };

  const task = await prisma.task.findFirst({
    where: { briefId, stage: ws },
  });
  if (!task) return { kind: "artifact" as const, visualAsset: null, artifact: null };

  const art = await prisma.artifact.findFirst({
    where: { taskId: task.id, type: at },
    orderBy: { version: "desc" },
  });
  return { kind: "artifact" as const, visualAsset: null, artifact: art };
}

export type EvalTarget = {
  artifactId: string | null;
  visualAssetId: string | null;
};

export async function getEvaluationTargetsForBrief(
  briefId: string,
): Promise<Record<PrivateEvaluationStage, EvalTarget>> {
  const stages: PrivateEvaluationStage[] = [
    "STRATEGY",
    "CONCEPT",
    "VISUAL_SPEC",
    "COPY",
    "VISUAL_ASSET",
  ];
  const out = {} as Record<PrivateEvaluationStage, EvalTarget>;
  for (const st of stages) {
    const r = await getLatestArtifactForEvalStage(briefId, st);
    if (r.kind === "visual" && r.visualAsset) {
      out[st] = {
        artifactId: null,
        visualAssetId: r.visualAsset.id,
      };
    } else if (r.kind === "artifact" && r.artifact) {
      out[st] = {
        artifactId: r.artifact.id,
        visualAssetId: null,
      };
    } else {
      out[st] = { artifactId: null, visualAssetId: null };
    }
  }
  return out;
}

export async function getPrivateEvaluationSummary(clientId: string) {
  const prisma = getPrisma();
  const [rows, byStage, weakCount, genericCount] = await Promise.all([
    prisma.privateEvaluationRecord.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { brief: { select: { title: true, isTestBrief: true } } },
    }),
    prisma.privateEvaluationRecord.groupBy({
      by: ["stage", "verdict"],
      where: { clientId },
      _count: { id: true },
    }),
    prisma.privateEvaluationRecord.count({
      where: { clientId, detectedStillWeakAfterRegen: true },
    }),
    prisma.privateEvaluationRecord.count({
      where: { clientId, feltGeneric: true },
    }),
  ]);

  const tagCounts = new Map<string, number>();
  const allTags = await prisma.privateEvaluationRecord.findMany({
    where: { clientId },
    select: { issueTags: true },
  });
  for (const r of allTags) {
    const arr = Array.isArray(r.issueTags)
      ? (r.issueTags as string[])
      : [];
    for (const t of arr) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return { rows, byStage, weakCount, genericCount, topTags };
}
