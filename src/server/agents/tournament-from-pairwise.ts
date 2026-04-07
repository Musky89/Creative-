import type { PairwiseComparisonRecord } from "@/lib/creative/pairwise-tournament";
import { runSingleEliminationTournament } from "@/lib/creative/pairwise-tournament";
import {
  runPairwiseCreativeJudge,
  type PairwiseCreativeDomain,
} from "@/server/agents/creative-pairwise-judge";
import {
  averageCreativeQualityScore,
  defaultCreativeQualityScore,
  type CreativeQualityScoreEntry,
} from "@/lib/creative/creative-quality-score";

function deriveScoresFromComparisons(
  ids: string[],
  comparisons: PairwiseComparisonRecord[],
): Record<string, CreativeQualityScoreEntry> {
  const strength = new Map<string, number>();
  const brand = new Map<string, number>();
  const mem = new Map<string, number>();
  for (const id of ids) {
    strength.set(id, 0);
    brand.set(id, 0);
    mem.set(id, 0);
  }
  for (const c of comparisons) {
    strength.set(c.strongerId, (strength.get(c.strongerId) ?? 0) + 1);
    brand.set(c.moreOnBrandId, (brand.get(c.moreOnBrandId) ?? 0) + 1);
    mem.set(c.moreMemorableId, (mem.get(c.moreMemorableId) ?? 0) + 1);
  }
  const maxS = Math.max(1, ...[...strength.values()]);
  const maxB = Math.max(1, ...[...brand.values()]);
  const maxM = Math.max(1, ...[...mem.values()]);
  const out: Record<string, CreativeQualityScoreEntry> = {};
  for (const id of ids) {
    const s = (strength.get(id) ?? 0) / maxS;
    const b = (brand.get(id) ?? 0) / maxB;
    const m = (mem.get(id) ?? 0) / maxM;
    const base = 0.35 + 0.45 * s;
    out[id] = {
      distinctiveness: Math.min(1, base + 0.05 * m),
      brandAlignment: Math.min(1, 0.35 + 0.55 * b),
      clarity: Math.min(1, base),
      emotionalImpact: Math.min(1, 0.35 + 0.55 * m),
      nonGenericLanguage: Math.min(1, base + 0.05 * s),
    };
  }
  return out;
}

export async function runPairwiseSingleElimination<T extends string>(args: {
  domain: PairwiseCreativeDomain;
  candidateIds: T[];
  formattedContext: string;
  getPayload: (id: T) => Record<string, unknown>;
}): Promise<{
  championId: T;
  runnerUpId: T | null;
  thirdPlaceId: T | null;
  comparisons: PairwiseComparisonRecord[];
  winningRationale: string;
  derivedScores: Record<string, CreativeQualityScoreEntry>;
}> {
  const ids = [...new Set(args.candidateIds)].filter(Boolean);
  if (ids.length === 0) {
    throw new Error("runPairwiseSingleElimination: empty candidates");
  }

  const result = await runSingleEliminationTournament(ids, async (left, right, round) => {
    void round;
    const decision = await runPairwiseCreativeJudge({
      domain: args.domain,
      leftId: left,
      rightId: right,
      leftPayload: args.getPayload(left),
      rightPayload: args.getPayload(right),
      formattedContext: args.formattedContext,
    });
    const w = decision.strongerId.trim();
    const winner = (w === left || w === right ? w : left) as T;
    return {
      winner,
      record: {
        leftId: left,
        rightId: right,
        strongerId: decision.strongerId,
        moreOnBrandId: decision.moreOnBrandId,
        moreMemorableId: decision.moreMemorableId,
        rationale: decision.rationale,
      },
    };
  });

  const derivedScores =
    ids.length > 1
      ? deriveScoresFromComparisons(ids as string[], result.comparisons)
      : Object.fromEntries(ids.map((id) => [id, defaultCreativeQualityScore()]));

  return {
    championId: result.championId,
    runnerUpId: result.runnerUpId,
    thirdPlaceId: result.thirdPlaceId,
    comparisons: result.comparisons,
    winningRationale: result.winningRationale,
    derivedScores,
  };
}

/** Weighted aggregate for ordering alternates / ranking tail. */
export function tournamentAggregateScore(
  scores: CreativeQualityScoreEntry,
): number {
  return averageCreativeQualityScore(scores);
}
