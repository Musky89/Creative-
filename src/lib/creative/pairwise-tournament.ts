/**
 * Single-elimination bracket: each match is decided by an external compare() (e.g. LLM pairwise judge).
 */

import { z } from "zod";

export type PairwiseComparisonRecord = {
  round: number;
  leftId: string;
  rightId: string;
  strongerId: string;
  moreOnBrandId: string;
  moreMemorableId: string;
  rationale: string;
};

export type SingleEliminationResult<T extends string = string> = {
  championId: T;
  runnerUpId: T | null;
  /** Loser of a bronze match between the two semifinal losers (when n ≥ 4). */
  thirdPlaceId: T | null;
  comparisons: PairwiseComparisonRecord[];
  /** Final-match rationale (primary “why this won”). */
  winningRationale: string;
};

export const pairwiseComparisonRecordSchema = z
  .object({
    round: z.number().int().min(1),
    leftId: z.string().min(1),
    rightId: z.string().min(1),
    strongerId: z.string().min(1),
    moreOnBrandId: z.string().min(1),
    moreMemorableId: z.string().min(1),
    rationale: z.string().min(20),
  })
  .strict();

export const pairwiseTournamentComparisonsSchema = z
  .array(pairwiseComparisonRecordSchema)
  .max(32);

/**
 * Run single elimination. Odd-sized rounds give a bye to the last competitor in the queue.
 */
export async function runSingleEliminationTournament<T extends string>(
  candidateIds: T[],
  compare: (
    left: T,
    right: T,
    round: number,
  ) => Promise<{
    winner: T;
    record: Omit<PairwiseComparisonRecord, "round">;
  }>,
): Promise<SingleEliminationResult<T>> {
  const uniq = [...new Set(candidateIds)].filter(Boolean);
  if (uniq.length === 0) {
    throw new Error("runSingleEliminationTournament: no candidates");
  }
  if (uniq.length === 1) {
    return {
      championId: uniq[0]!,
      runnerUpId: null,
      thirdPlaceId: null,
      comparisons: [],
      winningRationale:
        "Only one candidate — no pairwise tournament required.",
    };
  }

  const comparisons: PairwiseComparisonRecord[] = [];
  let queue = [...uniq];
  let semifinalLosers: T[] = [];
  let runnerUpId: T | null = null;
  let winningRationale = "";

  let round = 0;
  while (queue.length > 1) {
    round++;
    const prevLen = queue.length;
    const next: T[] = [];
    const losersThisRound: T[] = [];

    for (let i = 0; i < queue.length; i += 2) {
      if (i + 1 >= queue.length) {
        next.push(queue[i]!);
        continue;
      }
      const left = queue[i]!;
      const right = queue[i + 1]!;
      const { winner, record } = await compare(left, right, round);
      comparisons.push({ round, ...record });

      const loser = winner === left ? right : left;
      losersThisRound.push(loser);
      next.push(winner);

      if (prevLen === 2) {
        runnerUpId = loser;
        winningRationale = record.rationale;
      }
    }

    if (prevLen === 4 && next.length === 2) {
      semifinalLosers = losersThisRound;
    }

    queue = next;
  }

  const championId = queue[0]!;
  let thirdPlaceId: T | null = null;
  if (semifinalLosers.length === 2) {
    const [a, b] = semifinalLosers;
    const bronzeRound = round + 1;
    const { winner, record } = await compare(a, b, bronzeRound);
    comparisons.push({ round: bronzeRound, ...record });
    thirdPlaceId = winner;
  }

  if (!winningRationale && comparisons.length > 0) {
    winningRationale = comparisons[comparisons.length - 1]!.rationale;
  }

  return {
    championId,
    runnerUpId,
    thirdPlaceId,
    comparisons,
    winningRationale,
  };
}
