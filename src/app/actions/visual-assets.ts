"use server";

import { revalidatePath } from "next/cache";
import type { VisualPromptProviderTarget } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import {
  generateVisualAssetFromPromptPackage,
  generateVisualVariantsFromPromptPackage,
} from "@/server/visual-generation/generate-visual-asset-from-prompt-package";
import { recordVisualMemoryFromSpecArtifact } from "@/server/visual-review/visual-memory-hook";
import { composeCampaignAsset } from "@/server/visual-finishing/compose-campaign-asset";
import { getDefaultHeadlineForBrief } from "@/server/visual-finishing/headline-from-brief";
import { recordBrandMemoryEvent } from "@/server/memory/brand-memory-service";
import { extractVisualMemory } from "@/server/memory/extract-memory";

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
    const c = critique?.trim() || null;
    if (c) {
      const result = await generateVisualAssetFromPromptPackage(prisma, {
        promptPackageArtifactId,
        clientId,
        briefId,
        providerTarget: target,
        critique: c,
      });
      revalidatePath(studioPath(clientId, briefId));
      if (result.status === "FAILED") {
        return { error: result.error ?? "Generation failed." };
      }
      return { ok: true as const, assetId: result.id, variantCount: 1 };
    }

    const batch = await generateVisualVariantsFromPromptPackage(prisma, {
      promptPackageArtifactId,
      clientId,
      briefId,
      providerTarget: target,
      critique: null,
    });

    revalidatePath(studioPath(clientId, briefId));

    const failed = batch.results.filter((r) => r.status === "FAILED");
    if (failed.length === batch.results.length) {
      return {
        error: failed[0]?.error ?? "All variant generations failed.",
      };
    }
    return {
      ok: true as const,
      assetId: batch.results.find((r) => r.status === "COMPLETED")?.id,
      variantCount: batch.results.filter((r) => r.status === "COMPLETED").length,
      resolvedTarget: batch.resolvedTarget,
    };
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
      data: { isPreferred: false, isSecondary: false },
    });
    await tx.visualAsset.update({
      where: { id: assetId },
      data: {
        isPreferred: true,
        isSecondary: false,
        founderRejected: false,
        autoRejected: false,
      },
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

    const specArt = await prisma.artifact.findUnique({ where: { id: specId } });
    const specRaw =
      specArt?.content && typeof specArt.content === "object"
        ? (specArt.content as Record<string, unknown>)
        : null;
    if (specRaw) {
      const reviewFull = await prisma.visualAssetReview.findUnique({
        where: { visualAssetId: assetId },
      });
      const ev = reviewFull?.evaluation;
      const ext = extractVisualMemory({
        spec: specRaw,
        asset: {
          promptUsed: a.promptUsed,
          autoRejected: a.autoRejected,
          founderRejected: a.founderRejected,
          evaluation:
            ev && typeof ev === "object" ? (ev as Record<string, unknown>) : null,
        },
        outcome: "APPROVED",
      });
      await recordBrandMemoryEvent(prisma, {
        clientId,
        type: "VISUAL",
        frameworkId: String(specRaw.frameworkUsed ?? "").trim() || null,
        summary: ext.summary,
        attributes: ext.attributes,
        outcome: "APPROVED",
        strengthScore: stillWeak ? 0.55 : 0.88,
      });
    }
  }

  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}

export async function composeCampaignAssetAction(
  clientId: string,
  briefId: string,
  promptPackageArtifactId: string,
  sourceVisualAssetId?: string | null,
  headline?: string | null,
) {
  const prisma = getPrisma();
  const brief = await prisma.brief.findFirst({
    where: { id: briefId, clientId },
    include: { client: { include: { brandBible: true } } },
  });
  if (!brief) {
    return { error: "Brief not found." };
  }

  let sourceId = sourceVisualAssetId?.trim() || null;
  if (!sourceId) {
    const pref = await prisma.visualAsset.findFirst({
      where: {
        briefId,
        clientId,
        sourceArtifactId: promptPackageArtifactId,
        status: "COMPLETED",
        isPreferred: true,
      },
    });
    sourceId = pref?.id ?? null;
  }
  if (!sourceId) {
    return {
      error: "Select a preferred visual first, or pass sourceVisualAssetId.",
    };
  }

  let hl = headline?.trim() || null;
  if (!hl) {
    hl = await getDefaultHeadlineForBrief(briefId);
  }
  if (!hl) {
    return {
      error: "No headline — add copy in COPY stage or pass headline to compose.",
    };
  }

  const bb = brief.client.brandBible;

  try {
    const { id } = await composeCampaignAsset({
      sourceVisualAssetId: sourceId,
      clientId,
      briefId,
      headline: hl,
      brandBible: bb
        ? {
            colorPhilosophy: bb.colorPhilosophy,
            visualStyle: bb.visualStyle,
            compositionStyle: bb.compositionStyle,
          }
        : null,
    });
    revalidatePath(studioPath(clientId, briefId));
    return { ok: true as const, assetId: id };
  } catch (e) {
    revalidatePath(studioPath(clientId, briefId));
    return { error: e instanceof Error ? e.message : "Compose failed." };
  }
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

    const specArt = await prisma.artifact.findUnique({ where: { id: specId } });
    const specRaw =
      specArt?.content && typeof specArt.content === "object"
        ? (specArt.content as Record<string, unknown>)
        : null;
    if (specRaw) {
      const reviewFull = await prisma.visualAssetReview.findUnique({
        where: { visualAssetId: assetId },
      });
      const ev = reviewFull?.evaluation;
      const ext = extractVisualMemory({
        spec: specRaw,
        asset: {
          promptUsed: a.promptUsed,
          autoRejected: a.autoRejected,
          founderRejected: true,
          evaluation:
            ev && typeof ev === "object" ? (ev as Record<string, unknown>) : null,
        },
        outcome: "REJECTED",
      });
      await recordBrandMemoryEvent(prisma, {
        clientId,
        type: "VISUAL",
        frameworkId: String(specRaw.frameworkUsed ?? "").trim() || null,
        summary: ext.summary,
        attributes: ext.attributes,
        outcome: "REJECTED",
        strengthScore: a.autoRejected ? 0.62 : 0.48,
      });
    }
  }

  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}
