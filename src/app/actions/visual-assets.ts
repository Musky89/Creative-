"use server";

import { revalidatePath } from "next/cache";
import type { VisualPromptProviderTarget } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { generateVisualAssetFromPromptPackage } from "@/server/visual-generation/generate-visual-asset-from-prompt-package";
import { recordVisualMemoryFromSpecArtifact } from "@/server/visual-review/visual-memory-hook";

function studioPath(clientId: string, briefId: string) {
  return `/clients/${clientId}/briefs/${briefId}/studio`;
}

const TARGETS: VisualPromptProviderTarget[] = [
  "GENERIC",
  "GEMINI_IMAGE",
  "GPT_IMAGE",
];

async function assertAssetInBrief(
  prisma: ReturnType<typeof getPrisma>,
  assetId: string,
  clientId: string,
  briefId: string,
) {
  const a = await prisma.visualAsset.findUnique({
    where: { id: assetId },
    include: { sourceArtifact: true },
  });
  if (!a || a.clientId !== clientId || a.briefId !== briefId) {
    return null;
  }
  return a;
}

export async function generateVisualAssetAction(
  clientId: string,
  briefId: string,
  promptPackageArtifactId: string,
  providerTarget: string,
  critique?: string | null,
) {
  const target = TARGETS.includes(providerTarget as VisualPromptProviderTarget)
    ? (providerTarget as VisualPromptProviderTarget)
    : null;
  if (!target) {
    return { error: "Invalid provider target." };
  }

  const prisma = getPrisma();
  const art = await prisma.artifact.findUnique({
    where: { id: promptPackageArtifactId },
    include: { task: { include: { brief: true } } },
  });
  if (
    !art ||
    art.type !== "VISUAL_PROMPT_PACKAGE" ||
    art.task.briefId !== briefId ||
    art.task.brief.clientId !== clientId
  ) {
    return { error: "Prompt package not found for this brief." };
  }

  try {
    const result = await generateVisualAssetFromPromptPackage(prisma, {
      promptPackageArtifactId,
      clientId,
      briefId,
      providerTarget: target,
      critique: critique?.trim() || null,
    });

    revalidatePath(studioPath(clientId, briefId));

    if (result.status === "FAILED") {
      return { error: result.error ?? "Generation failed." };
    }
    return { ok: true as const, assetId: result.id };
  } catch (e) {
    revalidatePath(studioPath(clientId, briefId));
    return { error: e instanceof Error ? e.message : "Generation failed." };
  }
}

export async function selectPreferredVisualAssetAction(
  clientId: string,
  briefId: string,
  assetId: string,
) {
  const prisma = getPrisma();
  const a = await assertAssetInBrief(prisma, assetId, clientId, briefId);
  if (!a || a.status !== "COMPLETED") {
    return { error: "Asset not found or not ready." };
  }
  if (a.isPreferred) {
    revalidatePath(studioPath(clientId, briefId));
    return { ok: true as const };
  }

  const specId =
    typeof (a.sourceArtifact.content as Record<string, unknown>).sourceVisualSpecId ===
    "string"
      ? String((a.sourceArtifact.content as Record<string, unknown>).sourceVisualSpecId)
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.visualAsset.updateMany({
      where: { sourceArtifactId: a.sourceArtifactId },
      data: { isPreferred: false },
    });
    await tx.visualAsset.update({
      where: { id: assetId },
      data: { isPreferred: true, founderRejected: false },
    });
  });

  const review = await prisma.visualAssetReview.findUnique({
    where: { visualAssetId: assetId },
  });
  const evalBody = review?.evaluation as
    | { regenerationRecommended?: boolean; qualityVerdict?: string }
    | undefined;
  const stillWeak =
    evalBody?.regenerationRecommended === true && evalBody?.qualityVerdict === "WEAK";

  if (specId) {
    await recordVisualMemoryFromSpecArtifact(prisma, {
      clientId,
      specArtifactId: specId,
      outcome: "APPROVED",
      stillWeakAfterRegen: stillWeak,
    });
  }

  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}

export async function rejectVisualAssetAction(
  clientId: string,
  briefId: string,
  assetId: string,
) {
  const prisma = getPrisma();
  const a = await assertAssetInBrief(prisma, assetId, clientId, briefId);
  if (!a) {
    return { error: "Asset not found." };
  }
  if (a.founderRejected) {
    revalidatePath(studioPath(clientId, briefId));
    return { ok: true as const };
  }

  const specId =
    typeof (a.sourceArtifact.content as Record<string, unknown>).sourceVisualSpecId ===
    "string"
      ? String((a.sourceArtifact.content as Record<string, unknown>).sourceVisualSpecId)
      : null;

  await prisma.visualAsset.update({
    where: { id: assetId },
    data: { founderRejected: true, isPreferred: false },
  });

  if (specId) {
    await recordVisualMemoryFromSpecArtifact(prisma, {
      clientId,
      specArtifactId: specId,
      outcome: "REJECTED",
    });
  }

  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}
