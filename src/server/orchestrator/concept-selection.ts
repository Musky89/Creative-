import type { CreativeDirectorJudgeOutput } from "@/server/agents/creative-director-judge";
import type { PairwiseComparisonRecord } from "@/lib/creative/pairwise-tournament";

/** Stable ids for judging and downstream filtering (`concept-0` …). */
export function ensureConceptIds(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const concepts = content.concepts;
  if (!Array.isArray(concepts)) return content;
  const next = concepts.map((c, i) => {
    if (!c || typeof c !== "object") return c;
    const o = { ...(c as Record<string, unknown>) };
    if (typeof o.conceptId !== "string" || !o.conceptId.trim()) {
      o.conceptId = `concept-${i}`;
    }
    return o;
  });
  return { ...content, concepts: next };
}

export type ConceptSelectionMeta = {
  winnerConceptId: string;
  /** Up to two runner-up routes surfaced in Studio. */
  alternateConceptIds: string[];
  rejectedConceptIds: string[];
  scores: CreativeDirectorJudgeOutput["scores"];
  rankedConceptIds: string[];
  rejectionReasons: CreativeDirectorJudgeOutput["rejectionReasons"];
  judgeSummary?: string;
  pairwiseComparisons: PairwiseComparisonRecord[];
  tournamentWinningRationale: string;
};

/** ~1 route hidden when n=4 so Studio shows primary + two alternates. */
/**
 * Annotates each concept with selection flags and attaches `_agenticforceSelection`.
 * Surfaces **primary + up to two alternates**; all other routes are marked rejected for Studio display.
 */
export function mergeConceptSelectionIntoArtifact(
  content: Record<string, unknown>,
  judge: CreativeDirectorJudgeOutput,
): Record<string, unknown> {
  const contentWithIds = ensureConceptIds(content);
  const concepts = contentWithIds.concepts;
  if (!Array.isArray(concepts)) return contentWithIds;

  const withIds = concepts as Record<string, unknown>[];

  const idList = withIds.map((c) =>
    c && typeof c === "object" ? String((c as Record<string, unknown>).conceptId) : "",
  );

  const winner = judge.winnerConceptId.trim();
  const ranked = [...judge.rankedConceptIds].filter((id) => idList.includes(id));
  for (const id of idList) {
    if (id && !ranked.includes(id)) ranked.push(id);
  }

  const byId = new Map(
    withIds.map((c) => {
      const id = String((c as Record<string, unknown>).conceptId ?? "");
      return [id, c] as const;
    }),
  );
  const orderedRaw = ranked
    .map((id) => byId.get(id))
    .filter((x): x is Record<string, unknown> => !!x);
  const ordered =
    orderedRaw.length === withIds.length ? orderedRaw : [...withIds];

  const alternateIds = new Set<string>();
  for (const id of ranked) {
    if (id === winner) continue;
    if (alternateIds.size < 2) alternateIds.add(id);
  }

  const rejectedFromJudge = new Set(
    judge.rejectionReasons.map((r) => r.conceptId).filter((id) => idList.includes(id)),
  );
  for (const id of idList) {
    if (!id) continue;
    if (id === winner) continue;
    if (alternateIds.has(id)) continue;
    rejectedFromJudge.add(id);
  }

  const mergedConcepts = ordered.map((c) => {
    if (!c || typeof c !== "object") return c;
    const o = c as Record<string, unknown>;
    const id = String(o.conceptId ?? "");
    const isWinner = id === winner;
    const isAlternate = !isWinner && alternateIds.has(id);
    const isRejected = !isWinner && !isAlternate;
    return {
      ...o,
      isSelected: isWinner,
      isAlternate,
      isRejected,
    };
  });

  const selection: ConceptSelectionMeta = {
    winnerConceptId: winner,
    alternateConceptIds: [...alternateIds],
    rejectedConceptIds: [...rejectedFromJudge],
    scores: judge.scores,
    rankedConceptIds: ranked,
    rejectionReasons: judge.rejectionReasons,
    judgeSummary: judge.judgeSummary,
    pairwiseComparisons: judge.pairwiseComparisons ?? [],
    tournamentWinningRationale:
      judge.tournamentWinningRationale?.trim() ||
      judge.judgeSummary?.trim() ||
      "Pairwise tournament completed.",
  };

  return {
    ...contentWithIds,
    concepts: mergedConcepts,
    _agenticforceSelection: selection,
  };
}
