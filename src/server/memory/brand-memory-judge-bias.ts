import type { PrismaClient } from "@/generated/prisma/client";
import { getBrandLearningAggregateExplainable } from "@/server/memory/brand-memory-service";

/**
 * Short block for pairwise judges — bias only, same guardrails as main prompt block.
 */
export async function formatBrandMemoryJudgeBias(
  db: PrismaClient,
  clientId: string,
): Promise<string> {
  const agg = await getBrandLearningAggregateExplainable(db, clientId);
  const lines: string[] = [];

  if (agg.preferredFrameworks.length) {
    lines.push(
      `Frameworks that have tended to win for this client: ${agg.preferredFrameworks.slice(0, 5).join(", ")}.`,
    );
  }
  if (agg.rejectedFrameworks.length) {
    lines.push(
      `Frameworks that have tended to lose: ${agg.rejectedFrameworks.slice(0, 4).join(", ")} — still allowed, but do not pick without strong brief fit.`,
    );
  }
  if (agg.preferredVisualTraits.length) {
    lines.push(
      `Visual traits often approved: ${agg.preferredVisualTraits.slice(0, 5).join(" · ")}.`,
    );
  }
  if (agg.rejectedVisualTraits.length) {
    lines.push(
      `Visual traits often rejected: ${agg.rejectedVisualTraits.slice(0, 5).join(" · ")}.`,
    );
  }
  if (agg.preferredTonePatterns.length) {
    lines.push(
      `Copy/tone patterns that scored well: ${agg.preferredTonePatterns.slice(0, 4).join(" · ")}.`,
    );
  }

  if (lines.length === 0) return "";

  return [
    "",
    "### Brand memory (pairwise bias — not hard rules)",
    "Lean slightly toward patterns that have won for this client; avoid repeating clear losers. **You may still pick a fresh route if it is clearly stronger for this brief.**",
    ...lines.map((l) => `- ${l}`),
    "",
  ].join("\n");
}
