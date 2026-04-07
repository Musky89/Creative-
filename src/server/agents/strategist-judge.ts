import { z } from "zod";
import { getLlmProvider } from "@/server/llm/get-provider";
import {
  creativeQualityScoreEntrySchema,
  defaultCreativeQualityScore,
  type CreativeQualityScoreEntry,
} from "@/lib/creative/creative-quality-score";
import { pairwiseTournamentComparisonsSchema } from "@/lib/creative/pairwise-tournament";
import { runPairwiseSingleElimination } from "@/server/agents/tournament-from-pairwise";

export const strategistJudgeOutputSchema = z
  .object({
    rankedFrameworkIds: z.array(z.string().min(1)).min(1),
    primaryFrameworkId: z.string().min(1),
    alternateFrameworkIds: z.array(z.string().min(1)).max(2),
    scores: z.record(z.string(), creativeQualityScoreEntrySchema),
    selectionRationale: z.string().min(40),
    /** Head-to-head decisions (single-elimination). */
    pairwiseComparisons: pairwiseTournamentComparisonsSchema.optional(),
    tournamentWinningRationale: z.string().min(20).optional(),
  })
  .strict();

export type StrategistJudgeOutput = z.infer<typeof strategistJudgeOutputSchema>;

function fallbackJudge(frameworkIds: string[]): StrategistJudgeOutput {
  const primary = frameworkIds[0] ?? "unknown";
  const scores: Record<string, CreativeQualityScoreEntry> = {};
  for (const id of frameworkIds) {
    scores[id] = defaultCreativeQualityScore();
  }
  const alternates = frameworkIds.filter((id) => id !== primary).slice(0, 2);
  return {
    rankedFrameworkIds: [...frameworkIds],
    primaryFrameworkId: primary,
    alternateFrameworkIds: alternates,
    scores,
    selectionRationale:
      "LLM unavailable — defaulting to first listed angle as primary; alternates are the remaining angles in order.",
    pairwiseComparisons: [],
    tournamentWinningRationale:
      "No pairwise tournament ran — provider unavailable or insufficient angles.",
  };
}

function normalizeJudgeOutput(
  raw: StrategistJudgeOutput,
  validIds: string[],
): StrategistJudgeOutput {
  const set = new Set(validIds);
  let primary = raw.primaryFrameworkId.trim();
  if (!set.has(primary)) primary = validIds[0]!;

  const scores: Record<string, CreativeQualityScoreEntry> = { ...raw.scores };
  for (const id of validIds) {
    if (!scores[id]) scores[id] = defaultCreativeQualityScore();
  }

  const ranked = raw.rankedFrameworkIds.filter((id) => set.has(id));
  for (const id of validIds) {
    if (!ranked.includes(id)) ranked.push(id);
  }

  let alternates = raw.alternateFrameworkIds
    .map((id) => id.trim())
    .filter((id) => set.has(id) && id !== primary)
    .slice(0, 2);
  if (alternates.length === 0) {
    alternates = ranked.filter((id) => id !== primary).slice(0, 2);
  }

  return {
    rankedFrameworkIds: ranked,
    primaryFrameworkId: primary,
    alternateFrameworkIds: alternates,
    scores,
    selectionRationale: raw.selectionRationale,
    pairwiseComparisons: raw.pairwiseComparisons,
    tournamentWinningRationale: raw.tournamentWinningRationale,
  };
}

/**
 * Pairwise single-elimination over three strategic angles → primary + alternates.
 */
export async function runStrategistJudge(args: {
  anglesJson: { frameworkId: string; angle: string }[];
  formattedContext: string;
}): Promise<StrategistJudgeOutput> {
  const ids = args.anglesJson
    .map((a) => String(a.frameworkId ?? "").trim())
    .filter(Boolean);
  if (ids.length === 0) return fallbackJudge([]);

  const byFw = new Map(
    args.anglesJson.map((a) => [String(a.frameworkId).trim(), a] as const),
  );

  if (!getLlmProvider()) {
    return fallbackJudge(ids);
  }

  try {
    const tour = await runPairwiseSingleElimination({
      domain: "STRATEGY_ANGLE",
      candidateIds: ids,
      formattedContext: args.formattedContext,
      getPayload: (fid) => {
        const row = byFw.get(fid);
        return {
          frameworkId: fid,
          angle: row?.angle ?? "",
        };
      },
    });

    const primary = tour.championId;
    const alts: string[] = [];
    if (tour.runnerUpId && tour.runnerUpId !== primary) alts.push(tour.runnerUpId);
    if (
      tour.thirdPlaceId &&
      tour.thirdPlaceId !== primary &&
      !alts.includes(tour.thirdPlaceId)
    ) {
      alts.push(tour.thirdPlaceId);
    }
    for (const id of ids) {
      if (alts.length >= 2) break;
      if (id !== primary && !alts.includes(id)) alts.push(id);
    }

    const ranked = [primary, ...alts.filter((id) => id !== primary)];
    for (const id of ids) {
      if (!ranked.includes(id)) ranked.push(id);
    }

    const out: StrategistJudgeOutput = {
      rankedFrameworkIds: ranked,
      primaryFrameworkId: primary,
      alternateFrameworkIds: alts.slice(0, 2),
      scores: tour.derivedScores,
      selectionRationale: [
        tour.winningRationale,
        "",
        `Tournament: ${tour.comparisons.length} head-to-head match(es); final champion ${primary}.`,
      ]
        .join("\n")
        .trim(),
      pairwiseComparisons: tour.comparisons,
      tournamentWinningRationale: tour.winningRationale,
    };
    return normalizeJudgeOutput(out, ids);
  } catch {
    return fallbackJudge(ids);
  }
}
