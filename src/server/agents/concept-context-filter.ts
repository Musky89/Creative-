import type { TaskAgentContext } from "@/server/agents/context";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

/**
 * For VISUAL_DIRECTION / COPY_DEVELOPMENT: show only the winning concept route in upstream JSON
 * so downstream agents cannot accidentally execute a rejected route.
 */
export function filterUpstreamToWinningConcept(
  context: TaskAgentContext,
): TaskAgentContext {
  const idx = context.upstreamArtifacts.findIndex(
    (u) => u.stage === "CONCEPTING" || u.type === "CONCEPT",
  );
  if (idx < 0) return context;

  const art = context.upstreamArtifacts[idx]!;
  if (!isRecord(art.content)) return context;

  const c = art.content;
  const selection = c._agenticforceSelection;
  if (!isRecord(selection)) return context;

  const winnerId = String(selection.winnerConceptId ?? "").trim();
  if (!winnerId) return context;

  const concepts = c.concepts;
  if (!Array.isArray(concepts)) return context;

  const winner = concepts.find(
    (x) =>
      isRecord(x) && String((x as Record<string, unknown>).conceptId ?? "").trim() === winnerId,
  );
  if (!winner || !isRecord(winner)) return context;

  const filteredContent = {
    ...c,
    concepts: [winner],
    pairwiseDifferentiation: {
      pairComparisons: [] as unknown[],
      aggregateOverlap:
        "Downstream context shows only the Creative Director Judge winner; full field retained in persisted artifact.",
      strongestConceptIndex: 0,
      differentiationSummary:
        "Single route selected for execution — see full concept pack in CONCEPTING artifact history.",
    },
  };

  const upstreamArtifacts = [...context.upstreamArtifacts];
  upstreamArtifacts[idx] = {
    ...art,
    content: filteredContent,
  };

  return { ...context, upstreamArtifacts, campaignCore: context.campaignCore };
}
