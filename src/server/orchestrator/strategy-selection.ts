import type { StrategistJudgeOutput } from "@/server/agents/strategist-judge";
import type { PairwiseComparisonRecord } from "@/lib/creative/pairwise-tournament";

export type StrategyCreativeSelectionMeta = {
  rankedFrameworkIds: string[];
  primaryFrameworkId: string;
  alternateFrameworkIds: string[];
  scores: StrategistJudgeOutput["scores"];
  selectionRationale: string;
  pairwiseComparisons: PairwiseComparisonRecord[];
  tournamentWinningRationale: string;
};

/**
 * Annotates each strategic angle with selection flags and attaches `_creativeSelection`.
 * Reorders angles: primary first, then alternates, then remaining.
 */
export function mergeStrategySelectionIntoArtifact(
  content: Record<string, unknown>,
  judge: StrategistJudgeOutput,
): Record<string, unknown> {
  const raw = content.strategicAngles;
  if (!Array.isArray(raw) || raw.length === 0) return content;

  const angles = raw.map((a) =>
    a && typeof a === "object" ? { ...(a as Record<string, unknown>) } : a,
  ) as Record<string, unknown>[];

  const byFw = new Map<string, Record<string, unknown>>();
  for (const a of angles) {
    const fid = String(a.frameworkId ?? "").trim();
    if (fid) byFw.set(fid, a);
  }

  const primary = judge.primaryFrameworkId.trim();
  const alternates = judge.alternateFrameworkIds.map((x) => x.trim()).filter(Boolean);
  const order = [
    primary,
    ...alternates.filter((id) => id !== primary),
    ...judge.rankedFrameworkIds.filter(
      (id) => id !== primary && !alternates.includes(id),
    ),
  ];
  const seen = new Set<string>();
  const orderedIds = order.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return byFw.has(id);
  });
  for (const id of byFw.keys()) {
    if (!orderedIds.includes(id)) orderedIds.push(id);
  }

  const mergedAngles = orderedIds.map((fid) => {
    const row = { ...byFw.get(fid)! };
    const isPrimary = fid === primary;
    const isAlt = !isPrimary && alternates.includes(fid);
    return {
      ...row,
      isSelectedPrimary: isPrimary,
      isAlternate: isAlt,
    };
  });

  const selection: StrategyCreativeSelectionMeta = {
    rankedFrameworkIds: judge.rankedFrameworkIds,
    primaryFrameworkId: primary,
    alternateFrameworkIds: alternates.filter((id) => id !== primary).slice(0, 2),
    scores: judge.scores,
    selectionRationale: judge.selectionRationale,
    pairwiseComparisons: judge.pairwiseComparisons ?? [],
    tournamentWinningRationale:
      judge.tournamentWinningRationale ?? judge.selectionRationale.slice(0, 500),
  };

  return {
    ...content,
    strategicAngles: mergedAngles,
    _agenticforceSelection: {
      stage: "STRATEGY" as const,
      ...selection,
    },
  };
}
