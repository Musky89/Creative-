import type { CreativeDirectorJudgeOutput } from "@/server/agents/creative-director-judge";

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
  rejectedConceptIds: string[];
  scores: CreativeDirectorJudgeOutput["scores"];
  rankedConceptIds: string[];
  rejectionReasons: CreativeDirectorJudgeOutput["rejectionReasons"];
  judgeSummary?: string;
};

const REJECT_RATIO = 0.35;

/**
 * Annotates each concept with selection flags and attaches `_agenticforceSelection`.
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
  const n = idList.filter(Boolean).length;
  const rejectCount = Math.max(0, Math.floor(n * REJECT_RATIO));
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

  const bottom = new Set(ranked.slice(Math.max(0, ranked.length - rejectCount)));
  bottom.delete(winner);

  const rejectedFromJudge = new Set(
    judge.rejectionReasons.map((r) => r.conceptId).filter((id) => idList.includes(id)),
  );
  for (const id of bottom) rejectedFromJudge.add(id);
  rejectedFromJudge.delete(winner);

  const mergedConcepts = ordered.map((c) => {
    if (!c || typeof c !== "object") return c;
    const o = c as Record<string, unknown>;
    const id = String(o.conceptId ?? "");
    const isWinner = id === winner;
    const isRejected = !isWinner && rejectedFromJudge.has(id);
    return {
      ...o,
      isSelected: isWinner,
      isRejected,
    };
  });

  const selection: ConceptSelectionMeta = {
    winnerConceptId: winner,
    rejectedConceptIds: [...rejectedFromJudge],
    scores: judge.scores,
    rankedConceptIds: ranked,
    rejectionReasons: judge.rejectionReasons,
    judgeSummary: judge.judgeSummary,
  };

  return {
    ...contentWithIds,
    concepts: mergedConcepts,
    _agenticforceSelection: selection,
  };
}
