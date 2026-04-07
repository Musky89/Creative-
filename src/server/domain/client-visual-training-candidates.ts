import { getPrisma } from "@/server/db/prisma";

export type TrainingVisualCandidate = {
  id: string;
  resultUrl: string | null;
  briefTitle: string;
  isPreferred: boolean;
};

/**
 * Completed, on-disk frames suitable for “teach brand visual style” (any brief).
 */
export async function getClientVisualTrainingCandidates(
  clientId: string,
): Promise<TrainingVisualCandidate[]> {
  const prisma = getPrisma();
  const rows = await prisma.visualAsset.findMany({
    where: {
      clientId,
      status: "COMPLETED",
      founderRejected: false,
      localPath: { not: null },
      resultUrl: { not: null },
    },
    include: { brief: { select: { title: true } } },
    orderBy: [{ isPreferred: "desc" }, { createdAt: "desc" }],
    take: 80,
  });

  const out: TrainingVisualCandidate[] = [];
  for (const r of rows) {
    if (r.variantLabel === "COMPOSED") continue;
    const meta = r.metadata;
    if (meta && typeof meta === "object" && "_brandStyleComparison" in meta) {
      const v = (meta as Record<string, unknown>)._brandStyleComparison;
      if (v === true) continue;
    }
    out.push({
      id: r.id,
      resultUrl: r.resultUrl,
      briefTitle: r.brief.title,
      isPreferred: r.isPreferred,
    });
  }
  return out;
}
