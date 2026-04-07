import { z } from "zod";
import { extractJsonObject } from "@/server/llm/extract-json";
import { getLlmProvider } from "@/server/llm/get-provider";
import {
  repairJsonWithProvider,
  summarizeZodError,
} from "@/server/agents/repair-json";

export const pairwiseCreativeDecisionSchema = z
  .object({
    strongerId: z.string().min(1),
    moreOnBrandId: z.string().min(1),
    moreMemorableId: z.string().min(1),
    rationale: z.string().min(40),
  })
  .strict();

export type PairwiseCreativeDecision = z.infer<
  typeof pairwiseCreativeDecisionSchema
>;

export type PairwiseCreativeDomain =
  | "STRATEGY_ANGLE"
  | "CONCEPT_ROUTE"
  | "COPY_HEADLINE";

const DOMAIN_LINES: Record<PairwiseCreativeDomain, string> = {
  STRATEGY_ANGLE:
    "You are comparing two **strategic angles** (framework + written angle) for the same brief.",
  CONCEPT_ROUTE:
    "You are comparing two **creative concept routes** (hooks, rationale, differentiation) for the same campaign.",
  COPY_HEADLINE:
    "You are comparing two **headline lines** for the same campaign.",
};

function buildSystemPrompt(domain: PairwiseCreativeDomain): string {
  return [
    DOMAIN_LINES[domain],
    "Decide **relative** winners — not absolute scores.",
    "For each pair of candidate ids (leftId vs rightId), output:",
    "- strongerId: which id is the stronger creative overall for this brief (must be exactly leftId or rightId).",
    "- moreOnBrandId: which id is more on-brand given context (leftId or rightId).",
    "- moreMemorableId: which id is more likely to be remembered after one exposure (leftId or rightId).",
    "- rationale: 2–4 sentences naming **concrete** reasons (not 'better' alone); cite tradeoffs when close.",
    "If two dimensions favor different ids, still pick distinct winners per field — tie-breaking is allowed only if truly inseparable (then use the same id for that dimension).",
    "Output a single JSON object only — no markdown.",
  ].join("\n");
}

function parseDecision(
  raw: string,
): { ok: true; data: PairwiseCreativeDecision } | { ok: false; error: z.ZodError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return {
      ok: false,
      error: new z.ZodError([
        { code: "custom", path: [], message: "Pairwise output was not valid JSON." },
      ]),
    };
  }
  const v = pairwiseCreativeDecisionSchema.safeParse(parsed);
  if (v.success) return { ok: true, data: v.data };
  return { ok: false, error: v.error };
}

function fallbackDecision(leftId: string, rightId: string): PairwiseCreativeDecision {
  void rightId;
  return {
    strongerId: leftId,
    moreOnBrandId: leftId,
    moreMemorableId: leftId,
    rationale:
      "LLM unavailable — defaulting to the first candidate (leftId) for all dimensions; no comparative judgment performed.",
  };
}

function normalizeIds(
  d: PairwiseCreativeDecision,
  leftId: string,
  rightId: string,
): PairwiseCreativeDecision {
  const allowed = new Set([leftId, rightId]);
  const pick = (v: string, fallback: string) =>
    allowed.has(v.trim()) ? v.trim() : fallback;
  return {
    strongerId: pick(d.strongerId, leftId),
    moreOnBrandId: pick(d.moreOnBrandId, leftId),
    moreMemorableId: pick(d.moreMemorableId, leftId),
    rationale: d.rationale.trim() || fallbackDecision(leftId, rightId).rationale,
  };
}

/**
 * One structured LLM head-to-head; tournament layer calls this repeatedly.
 */
export async function runPairwiseCreativeJudge(args: {
  domain: PairwiseCreativeDomain;
  leftId: string;
  rightId: string;
  leftPayload: Record<string, unknown>;
  rightPayload: Record<string, unknown>;
  formattedContext: string;
}): Promise<PairwiseCreativeDecision> {
  const { leftId, rightId } = args;
  if (!leftId || !rightId || leftId === rightId) {
    return fallbackDecision(leftId || "a", rightId || "b");
  }

  const provider = getLlmProvider();
  if (!provider) {
    return fallbackDecision(leftId, rightId);
  }

  const user = [
    `leftId: ${leftId}`,
    `rightId: ${rightId}`,
    "",
    "## Candidate A (leftId)",
    JSON.stringify(args.leftPayload, null, 2).slice(0, 12_000),
    "",
    "## Candidate B (rightId)",
    JSON.stringify(args.rightPayload, null, 2).slice(0, 12_000),
    "",
    "## Brief / brand / upstream context",
    args.formattedContext.slice(0, 14_000),
  ].join("\n");

  const system = buildSystemPrompt(args.domain);
  const useJsonMode = provider.id === "openai";
  const first = await provider.complete(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { maxTokens: 2048, jsonMode: useJsonMode },
  );

  let parsed = parseDecision(first.text);
  if (parsed.ok) {
    return normalizeIds(parsed.data, leftId, rightId);
  }

  const shapeHint = `{
  "strongerId": "${leftId}" | "${rightId}",
  "moreOnBrandId": "${leftId}" | "${rightId}",
  "moreMemorableId": "${leftId}" | "${rightId}",
  "rationale": string (min ~40 chars)
}`;

  const repair = await repairJsonWithProvider(
    provider,
    first.text,
    shapeHint,
    summarizeZodError(parsed.error),
    4096,
  );
  parsed = parseDecision(repair.text);
  if (parsed.ok) {
    return normalizeIds(parsed.data, leftId, rightId);
  }

  return fallbackDecision(leftId, rightId);
}
