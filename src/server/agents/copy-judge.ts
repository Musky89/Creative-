import { z } from "zod";
import { getLlmProvider } from "@/server/llm/get-provider";
import {
  creativeQualityScoreEntrySchema,
  defaultCreativeQualityScore,
  type CreativeQualityScoreEntry,
} from "@/lib/creative/creative-quality-score";
import { pairwiseTournamentComparisonsSchema } from "@/lib/creative/pairwise-tournament";
import { runPairwiseSingleElimination } from "@/server/agents/tournament-from-pairwise";

const headlineKey = (i: number) => `h${i}`;

export const copyJudgeOutputSchema = z
  .object({
    rankedHeadlineKeys: z.array(z.string().min(1)).min(1),
    primaryHeadlineKey: z.string().min(1),
    alternateHeadlineKeys: z.array(z.string().min(1)).max(2),
    scores: z.record(z.string(), creativeQualityScoreEntrySchema),
    selectionRationale: z.string().min(40),
    pairwiseComparisons: pairwiseTournamentComparisonsSchema.optional(),
    tournamentWinningRationale: z.string().min(20).optional(),
  })
  .strict();

export type CopyJudgeOutput = z.infer<typeof copyJudgeOutputSchema>;

function fallbackJudge(keys: string[]): CopyJudgeOutput {
  const primary = keys[0] ?? "h0";
  const scores: Record<string, CreativeQualityScoreEntry> = {};
  for (const k of keys) {
    scores[k] = defaultCreativeQualityScore();
  }
  const alternates = keys.filter((k) => k !== primary).slice(0, 2);
  return {
    rankedHeadlineKeys: [...keys],
    primaryHeadlineKey: primary,
    alternateHeadlineKeys: alternates,
    scores,
    selectionRationale:
      "LLM unavailable — defaulting to first headline as primary; alternates follow in original order.",
    pairwiseComparisons: [],
    tournamentWinningRationale:
      "No pairwise tournament ran — provider unavailable or insufficient headlines.",
  };
}

function normalizeJudgeOutput(
  raw: CopyJudgeOutput,
  validKeys: string[],
): CopyJudgeOutput {
  const set = new Set(validKeys);
  let primary = raw.primaryHeadlineKey.trim();
  if (!set.has(primary)) primary = validKeys[0]!;

  const scores: Record<string, CreativeQualityScoreEntry> = { ...raw.scores };
  for (const k of validKeys) {
    if (!scores[k]) scores[k] = defaultCreativeQualityScore();
  }

  const ranked = raw.rankedHeadlineKeys.filter((k) => set.has(k));
  for (const k of validKeys) {
    if (!ranked.includes(k)) ranked.push(k);
  }

  let alternates = raw.alternateHeadlineKeys
    .map((k) => k.trim())
    .filter((k) => set.has(k) && k !== primary)
    .slice(0, 2);
  if (alternates.length === 0) {
    alternates = ranked.filter((k) => k !== primary).slice(0, 2);
  }

  return {
    rankedHeadlineKeys: ranked,
    primaryHeadlineKey: primary,
    alternateHeadlineKeys: alternates,
    scores,
    selectionRationale: raw.selectionRationale,
    pairwiseComparisons: raw.pairwiseComparisons,
    tournamentWinningRationale: raw.tournamentWinningRationale,
  };
}

/**
 * Pairwise single-elimination over headline keys h0… → primary + alternates.
 */
export async function runCopyHeadlineJudge(args: {
  headlines: string[];
  formattedContext: string;
}): Promise<CopyJudgeOutput> {
  const keys = args.headlines.map((_, i) => headlineKey(i));
  if (keys.length === 0) return fallbackJudge([]);

  if (!getLlmProvider()) {
    return fallbackJudge(keys);
  }

  try {
    const tour = await runPairwiseSingleElimination({
      domain: "COPY_HEADLINE",
      candidateIds: keys,
      formattedContext: args.formattedContext,
      getPayload: (k) => {
        const m = /^h(\d+)$/.exec(k);
        const idx = m ? parseInt(m[1]!, 10) : 0;
        const text = args.headlines[idx] ?? "";
        return { key: k, headline: text };
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
    for (const k of keys) {
      if (alts.length >= 2) break;
      if (k !== primary && !alts.includes(k)) alts.push(k);
    }

    const ranked = [primary, ...alts.filter((k) => k !== primary)];
    for (const k of keys) {
      if (!ranked.includes(k)) ranked.push(k);
    }

    const out: CopyJudgeOutput = {
      rankedHeadlineKeys: ranked,
      primaryHeadlineKey: primary,
      alternateHeadlineKeys: alts.slice(0, 2),
      scores: tour.derivedScores,
      selectionRationale: [
        tour.winningRationale,
        "",
        `Headline tournament: ${tour.comparisons.length} pairwise match(es); champion ${primary}.`,
      ]
        .join("\n")
        .trim(),
      pairwiseComparisons: tour.comparisons,
      tournamentWinningRationale: tour.winningRationale,
    };
    return normalizeJudgeOutput(out, keys);
  } catch {
    return fallbackJudge(keys);
  }
}
