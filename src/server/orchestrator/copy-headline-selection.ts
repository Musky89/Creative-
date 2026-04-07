import type { CopyJudgeOutput } from "@/server/agents/copy-judge";
import type { CreativeQualityScoreEntry } from "@/lib/creative/creative-quality-score";
import type { PairwiseComparisonRecord } from "@/lib/creative/pairwise-tournament";

export type CopyHeadlineCreativeSelectionMeta = {
  rankedHeadlineIndices: number[];
  primaryHeadlineIndex: number;
  alternateHeadlineIndices: number[];
  scoresByHeadlineIndex: Record<string, CreativeQualityScoreEntry>;
  selectionRationale: string;
  pairwiseComparisons: PairwiseComparisonRecord[];
  tournamentWinningRationale: string;
};

function headlineKey(i: number): string {
  return String(i);
}

/**
 * Persists full headline list with `_creativeSelection` from copy judge (keys h0, h1, …).
 */
export function mergeCopyHeadlineSelectionIntoArtifact(
  content: Record<string, unknown>,
  judge: CopyJudgeOutput,
  headlines: string[],
): Record<string, unknown> {
  const n = headlines.length;
  if (n === 0) return content;

  const keyToIndex = (k: string): number => {
    const m = /^h(\d+)$/.exec(k.trim());
    if (!m) return 0;
    return Math.min(n - 1, Math.max(0, parseInt(m[1]!, 10)));
  };

  const primaryIdx = keyToIndex(judge.primaryHeadlineKey);
  const alternateIdxs = judge.alternateHeadlineKeys
    .map((k) => keyToIndex(k))
    .filter((i) => i !== primaryIdx)
    .slice(0, 2);

  const scoresByHeadlineIndex: Record<string, CreativeQualityScoreEntry> = {};
  for (let i = 0; i < n; i++) {
    const fromJudge = judge.scores[`h${i}`] ?? judge.scores[headlineKey(i)];
    if (fromJudge) {
      scoresByHeadlineIndex[headlineKey(i)] = fromJudge;
    }
  }

  const rankedIndices = judge.rankedHeadlineKeys.map((k) => keyToIndex(k));
  const seen = new Set<number>();
  const ordered: number[] = [];
  for (const i of rankedIndices) {
    if (!seen.has(i)) {
      seen.add(i);
      ordered.push(i);
    }
  }
  for (let i = 0; i < n; i++) {
    if (!seen.has(i)) ordered.push(i);
  }

  const selection: CopyHeadlineCreativeSelectionMeta = {
    rankedHeadlineIndices: ordered,
    primaryHeadlineIndex: primaryIdx,
    alternateHeadlineIndices: alternateIdxs,
    scoresByHeadlineIndex,
    selectionRationale: judge.selectionRationale,
    pairwiseComparisons: judge.pairwiseComparisons ?? [],
    tournamentWinningRationale:
      judge.tournamentWinningRationale ?? judge.selectionRationale.slice(0, 500),
  };

  return {
    ...content,
    headlineOptions: headlines,
    _agenticforceSelection: {
      stage: "COPY_HEADLINES" as const,
      ...selection,
    },
  };
}
