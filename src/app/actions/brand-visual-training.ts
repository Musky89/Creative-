"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import {
  assertCanStartTraining,
  runBrandVisualTrainingPipeline,
  validateTrainingSelection,
} from "@/server/brand-visual-training/run-training-pipeline";
import { generateTrainingGuidance } from "@/server/brand-visual-training/training-guidance";

function clientStudioBase(clientId: string) {
  return `/clients/${clientId}`;
}

export async function previewBrandVisualTrainingAction(clientId: string, visualAssetIds: string[]) {
  const prisma = getPrisma();
  const uniqueIds = [...new Set(visualAssetIds.map((x) => x.trim()).filter(Boolean))];
  const basic = await validateTrainingSelection(clientId, uniqueIds);
  if (basic.error) {
    return { error: basic.error };
  }
  const guidance = await generateTrainingGuidance(prisma, clientId, uniqueIds);
  return {
    ok: true as const,
    trainingQuality: guidance.trainingQuality,
    lines: guidance.lines,
    imageCount: uniqueIds.length,
  };
}

export async function startBrandVisualTrainingAction(clientId: string, visualAssetIds: string[]) {
  const prisma = getPrisma();
  const uniqueIds = [...new Set(visualAssetIds.map((x) => x.trim()).filter(Boolean))];
  const check = await assertCanStartTraining(prisma, clientId, uniqueIds);
  if (check.error) {
    return { error: check.error };
  }
  const guidance = check.guidance!;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Client not found." };

  const job = await prisma.$transaction(async (tx) => {
    const j = await tx.brandVisualTrainingJob.create({
      data: {
        clientId,
        status: "PREPARING",
        trainingQuality: guidance.trainingQuality,
        guidanceLines: guidance.lines as Prisma.InputJsonValue,
        previousVisualModelRef: client.visualModelRef?.trim() || null,
      },
    });
    let order = 0;
    for (const id of uniqueIds) {
      await tx.brandVisualTrainingAsset.create({
        data: {
          jobId: j.id,
          visualAssetId: id,
          caption: "—",
          styleTags: [] as Prisma.InputJsonValue,
          sortOrder: order++,
        },
      });
    }
    return j;
  });

  revalidatePath(clientStudioBase(clientId));
  after(() => {
    void runBrandVisualTrainingPipeline(job.id);
  });

  return { ok: true as const, jobId: job.id };
}
