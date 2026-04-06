import type { PrismaClient } from "@/generated/prisma/client";
import type { z } from "zod";
import type { creativeDirectorFinalOutputSchema } from "@/lib/artifacts/creative-director-final-schema";
import { generateVisualVariantsFromPromptPackage } from "@/server/visual-generation/generate-visual-asset-from-prompt-package";

type FinalOut = z.infer<typeof creativeDirectorFinalOutputSchema>;

/**
 * Puts COPY back in READY, EXPORT back in PENDING; optional visual batch from directives.
 */
export async function applyCreativeDirectorReworkLoop(
  db: PrismaClient,
  args: {
    briefId: string;
    clientId: string;
    output: FinalOut;
  },
): Promise<void> {
  const tasks = await db.task.findMany({
    where: { briefId: args.briefId },
    orderBy: { id: "asc" },
  });
  const copyTask = tasks.find((t) => t.stage === "COPY_DEVELOPMENT");
  const exportTask = tasks.find((t) => t.stage === "EXPORT");
  if (!copyTask || !exportTask) return;

  await db.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: exportTask.id },
      data: { status: "PENDING", startedAt: null, completedAt: null },
    });
    await tx.task.update({
      where: { id: copyTask.id },
      data: { status: "READY", startedAt: null, completedAt: null },
    });
  });

  const blob = args.output.improvementDirectives.join(" ").toLowerCase();
  if (!/\b(visual|image|photo|photography|key art|keyart|cgi|render|bokeh|stock)\b/.test(blob)) {
    return;
  }

  const pkg = await db.artifact.findFirst({
    where: {
      type: "VISUAL_PROMPT_PACKAGE",
      task: { briefId: args.briefId },
    },
    orderBy: { version: "desc" },
  });
  if (!pkg) return;

  try {
    await generateVisualVariantsFromPromptPackage(db, {
      promptPackageArtifactId: pkg.id,
      clientId: args.clientId,
      briefId: args.briefId,
      providerTarget: "GENERIC",
      critique: args.output.improvementDirectives.slice(0, 8).join("\n"),
    });
  } catch (e) {
    console.error(
      "[agenticforce:cd-rework] visual regen skipped:",
      e instanceof Error ? e.message : e,
    );
  }
}

export async function applyCreativeDirectorVisualPick(
  db: PrismaClient,
  args: { briefId: string; selectedVisualAssetId: string | null },
): Promise<void> {
  const id = args.selectedVisualAssetId?.trim();
  if (!id) return;

  const asset = await db.visualAsset.findFirst({
    where: { id, briefId: args.briefId, status: "COMPLETED" },
  });
  if (!asset) return;

  await db.$transaction(async (tx) => {
    await tx.visualAsset.updateMany({
      where: { briefId: args.briefId },
      data: { isPreferred: false, isSecondary: false },
    });
    await tx.visualAsset.update({
      where: { id },
      data: {
        isPreferred: true,
        isSecondary: false,
        autoRejected: false,
        founderRejected: false,
      },
    });
  });
}
