import { getFrameworkById } from "@/lib/canon/frameworks";
import { getPrisma } from "@/server/db/prisma";
import { scoreFrameworkPerformance } from "./framework-scoring";

/**
 * One-line hint for Studio: top client-specific frameworks by explainable score.
 */
export async function getClientCanonHighlights(
  clientId: string,
): Promise<string | null> {
  const prisma = getPrisma();
  const rows = await prisma.frameworkPerformance.findMany({
    where: { clientId, timesUsed: { gte: 2 } },
  });
  if (rows.length === 0) return null;

  const ranked = [...rows]
    .map((r) => ({
      id: r.frameworkId,
      score: scoreFrameworkPerformance(r, null),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const names = ranked
    .map((x) => getFrameworkById(x.id)?.name ?? x.id)
    .filter(Boolean);
  if (names.length === 0) return null;

  return `High-performing frameworks for this client: ${names.join(" · ")}`;
}

/** Framework ids with best explainable scores (for subtle artifact tags). */
export async function getTopPreferredFrameworkIds(
  clientId: string,
  limit = 3,
): Promise<string[]> {
  const prisma = getPrisma();
  const rows = await prisma.frameworkPerformance.findMany({
    where: { clientId, timesUsed: { gte: 2 } },
  });
  if (rows.length === 0) return [];
  return [...rows]
    .map((r) => ({
      id: r.frameworkId,
      score: scoreFrameworkPerformance(r, null),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.id);
}
