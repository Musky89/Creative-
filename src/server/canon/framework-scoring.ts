import type { FrameworkPerformance } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

/**
 * Simple explainable score for ranking frameworks per client.
 * Higher is better. No ML.
 */
export function scoreFrameworkPerformance(
  row: FrameworkPerformance | undefined,
  heuristicRank: number | null,
): number {
  let base = 4;
  if (heuristicRank != null) {
    base = 12 - heuristicRank * 2;
  }
  if (!row || row.timesUsed === 0) {
    return base;
  }
  const t = Math.max(1, row.timesUsed);
  const approvalRate = row.approvals / t;
  const revisionRate = row.revisions / t;
  const rejectionRate = row.rejections / t;
  const weakRate = row.stillWeakAfterRegenCount / t;

  return (
    base +
    approvalRate * 10 -
    revisionRate * 4 -
    rejectionRate * 8 -
    weakRate * 6
  );
}

export async function loadClientPerformanceMap(
  clientId: string,
): Promise<Map<string, FrameworkPerformance>> {
  const prisma = getPrisma();
  const rows = await prisma.frameworkPerformance.findMany({
    where: { clientId },
  });
  return new Map(rows.map((r) => [r.frameworkId, r]));
}

export async function scoreFrameworkForClient(
  frameworkId: string,
  clientId: string,
  heuristicRank: number | null,
): Promise<number> {
  const map = await loadClientPerformanceMap(clientId);
  return scoreFrameworkPerformance(map.get(frameworkId), heuristicRank);
}
