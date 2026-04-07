import type { PrismaClient } from "@/generated/prisma/client";
import type { VisualAssetEvaluation } from "@/lib/visual/visual-asset-evaluation";

function composite(ev: VisualAssetEvaluation): number {
  return (
    ev.realismScore * 0.38 +
    ev.brandFitScore * 0.22 +
    ev.compositionScore * 0.22 +
    (1 - ev.slopScore) * 0.18
  );
}

/**
 * After variants are evaluated: keep top 2 by merged scores; auto-reject the rest (unless founder rejected).
 */
export async function applyVisualVariantSelectionForPackage(
  db: PrismaClient,
  sourceArtifactId: string,
): Promise<void> {
  const assets = await db.visualAsset.findMany({
    where: { sourceArtifactId, status: "COMPLETED" },
    include: { review: true },
    orderBy: { createdAt: "asc" },
  });

  const ranked: { id: string; score: number }[] = [];
  for (const a of assets) {
    if (a.founderRejected) continue;
    const ev = a.review?.evaluation as VisualAssetEvaluation | undefined;
    if (
      !ev ||
      typeof ev.realismScore !== "number" ||
      typeof ev.slopScore !== "number"
    ) {
      continue;
    }
    if (a.autoRejected) continue;
    ranked.push({ id: a.id, score: composite(ev) });
  }

  ranked.sort((x, y) => y.score - x.score);
  const winner = ranked[0]?.id;
  const second = ranked[1]?.id;

  await db.$transaction(async (tx) => {
    await tx.visualAsset.updateMany({
      where: { sourceArtifactId },
      data: { isPreferred: false, isSecondary: false },
    });

    for (const a of assets) {
      if (a.status !== "COMPLETED") continue;
      if (a.founderRejected) continue;

      if (a.id === winner) {
        await tx.visualAsset.update({
          where: { id: a.id },
          data: {
            isPreferred: true,
            isSecondary: false,
            autoRejected: false,
          },
        });
        continue;
      }
      if (a.id === second) {
        await tx.visualAsset.update({
          where: { id: a.id },
          data: {
            isPreferred: false,
            isSecondary: true,
            autoRejected: false,
          },
        });
        continue;
      }

      const ev = a.review?.evaluation as VisualAssetEvaluation | undefined;
      const hasScores =
        ev &&
        typeof ev.realismScore === "number" &&
        typeof ev.slopScore === "number";

      if (hasScores) {
        await tx.visualAsset.update({
          where: { id: a.id },
          data: {
            isPreferred: false,
            isSecondary: false,
            autoRejected: true,
          },
        });
      }
    }
  });
}
