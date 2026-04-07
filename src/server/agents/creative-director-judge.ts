import { z } from "zod";
import { getLlmProvider } from "@/server/llm/get-provider";
import {
  creativeQualityScoreEntrySchema,
  defaultCreativeQualityScore,
} from "@/lib/creative/creative-quality-score";
import { pairwiseTournamentComparisonsSchema } from "@/lib/creative/pairwise-tournament";
import { runPairwiseSingleElimination } from "@/server/agents/tournament-from-pairwise";

const scoreEntrySchema = creativeQualityScoreEntrySchema;

export const creativeDirectorJudgeOutputSchema = z
  .object({
    rankedConceptIds: z.array(z.string().min(1)).min(1),
    winnerConceptId: z.string().min(1),
    scores: z.record(z.string(), scoreEntrySchema),
    rejectionReasons: z
      .array(
        z
          .object({
            conceptId: z.string().min(1),
            reason: z.string().min(20),
          })
          .strict(),
      )
      .max(16),
    judgeSummary: z.string().min(40).optional(),
    pairwiseComparisons: pairwiseTournamentComparisonsSchema.optional(),
    tournamentWinningRationale: z.string().min(20).optional(),
  })
  .strict();

export type CreativeDirectorJudgeOutput = z.infer<
  typeof creativeDirectorJudgeOutputSchema
>;

function fallbackJudge(conceptIds: string[]): CreativeDirectorJudgeOutput {
  const winner = conceptIds[0] ?? "unknown";
  const scores: Record<string, z.infer<typeof scoreEntrySchema>> = {};
  for (const id of conceptIds) {
    scores[id] = defaultCreativeQualityScore();
  }
  return {
    rankedConceptIds: [...conceptIds],
    winnerConceptId: winner,
    scores,
    rejectionReasons: [],
    judgeSummary:
      "LLM unavailable — defaulting to first concept as winner; no automated rejections.",
    pairwiseComparisons: [],
    tournamentWinningRationale:
      "No pairwise tournament ran — provider unavailable or insufficient concepts.",
  };
}

function normalizeJudgeOutput(
  raw: CreativeDirectorJudgeOutput,
  validIds: string[],
): CreativeDirectorJudgeOutput {
  const set = new Set(validIds);
  let winner = raw.winnerConceptId.trim();
  if (!set.has(winner)) {
    winner = validIds[0]!;
  }

  const scores: Record<string, z.infer<typeof scoreEntrySchema>> = { ...raw.scores };
  for (const id of validIds) {
    if (!scores[id]) {
      scores[id] = defaultCreativeQualityScore();
    }
  }

  const ranked = raw.rankedConceptIds.filter((id) => set.has(id));
  for (const id of validIds) {
    if (!ranked.includes(id)) ranked.push(id);
  }

  const rejectionReasons = raw.rejectionReasons.filter((r) => set.has(r.conceptId));

  return {
    rankedConceptIds: ranked,
    winnerConceptId: winner,
    scores,
    rejectionReasons,
    judgeSummary: raw.judgeSummary,
    pairwiseComparisons: raw.pairwiseComparisons,
    tournamentWinningRationale: raw.tournamentWinningRationale,
  };
}

/**
 * Pairwise single-elimination over concept routes; builds rejection tail + judge summary.
 */
export async function runCreativeDirectorJudge(args: {
  conceptsJson: Record<string, unknown>[];
  formattedContext: string;
}): Promise<CreativeDirectorJudgeOutput> {
  const byId = new Map<string, Record<string, unknown>>();
  for (const c of args.conceptsJson) {
    const id = String(c.conceptId ?? "").trim();
    if (id) byId.set(id, c);
  }
  const ids = args.conceptsJson
    .map((c) => String(c.conceptId ?? "").trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return fallbackJudge([]);
  }

  if (!getLlmProvider()) {
    return fallbackJudge(ids);
  }

  try {
    const tour = await runPairwiseSingleElimination({
      domain: "CONCEPT_ROUTE",
      candidateIds: ids,
      formattedContext: args.formattedContext,
      getPayload: (id) => byId.get(id) ?? { conceptId: id },
    });

    const winner = tour.championId;
    const runnerUp = tour.runnerUpId;
    const third = tour.thirdPlaceId;

    const rejectionReasons: { conceptId: string; reason: string }[] = [];
    for (const id of ids) {
      if (id === winner || id === runnerUp || id === third) continue;
      rejectionReasons.push({
        conceptId: id,
        reason: `Eliminated in pairwise tournament before the final — did not win head-to-head path to champion (${winner}).`,
      });
    }

    const ranked = [winner];
    if (runnerUp && runnerUp !== winner) ranked.push(runnerUp);
    if (third && third !== winner && third !== runnerUp) ranked.push(third);
    for (const id of ids) {
      if (!ranked.includes(id)) ranked.push(id);
    }

    const judgeSummary = [
      tour.winningRationale,
      "",
      `Pairwise tournament: ${tour.comparisons.length} match(es). Champion: ${winner}.`,
      runnerUp ? `Runner-up: ${runnerUp}.` : "",
      third ? `Third (bronze): ${third}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const out: CreativeDirectorJudgeOutput = {
      rankedConceptIds: ranked,
      winnerConceptId: winner,
      scores: tour.derivedScores,
      rejectionReasons,
      judgeSummary,
      pairwiseComparisons: tour.comparisons,
      tournamentWinningRationale: tour.winningRationale,
    };
    return normalizeJudgeOutput(out, ids);
  } catch {
    return fallbackJudge(ids);
  }
}
