"use server";

import { revalidatePath } from "next/cache";
import type { VisualPromptProviderTarget } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { generateVisualAssetFromPromptPackage } from "@/server/visual-generation/generate-visual-asset-from-prompt-package";

function studioPath(clientId: string, briefId: string) {
  return `/clients/${clientId}/briefs/${briefId}/studio`;
}

const TARGETS: VisualPromptProviderTarget[] = [
  "GENERIC",
  "GEMINI_IMAGE",
  "GPT_IMAGE",
];

export async function generateVisualAssetAction(
  clientId: string,
  briefId: string,
  promptPackageArtifactId: string,
  providerTarget: string,
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

  const result = await generateVisualAssetFromPromptPackage(prisma, {
    promptPackageArtifactId,
    clientId,
    briefId,
    providerTarget: target,
  });

  revalidatePath(studioPath(clientId, briefId));

  if (result.status === "FAILED") {
    return { error: result.error ?? "Generation failed." };
  }
  return { ok: true as const, assetId: result.id };
}
