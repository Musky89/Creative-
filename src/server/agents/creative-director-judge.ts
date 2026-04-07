import { z } from "zod";
import { extractJsonObject } from "@/server/llm/extract-json";
import { getLlmProvider } from "@/server/llm/get-provider";
import {
  repairJsonWithProvider,
  summarizeZodError,
} from "@/server/agents/repair-json";
import { buildCreativeCanonUserSection } from "@/server/canon/prompt-section";
import { CANON_FRAMEWORKS } from "@/lib/canon/frameworks";
import {
  creativeQualityScoreEntrySchema,
  defaultCreativeQualityScore,
} from "@/lib/creative/creative-quality-score";

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
  })
  .strict();

export type CreativeDirectorJudgeOutput = z.infer<
  typeof creativeDirectorJudgeOutputSchema
>;

const JUDGE_SYSTEM = [
  "You are a ruthless Executive Creative Director judging a **field** of concept routes for one campaign.",
  "You receive every concept (with conceptId, frameworkId, hook, rationale, differentiation fields).",
  "Score each conceptId on five 0–1 floats: distinctiveness, brandAlignment, clarity, emotionalImpact, nonGenericLanguage.",
  "Be harsh on generic category filler, interchangeable hooks, and frameworks named but not structurally executed.",
  "rankedConceptIds: ALL conceptIds from the input, best first (full sort).",
  "winnerConceptId: exactly one — the single route that should ship to art direction and copy.",
  "rejectionReasons: ONLY for concepts that should NOT advance (the weaker tail). Each entry: conceptId + substantive reason (why it loses vs winner / category).",
  "If fewer than 4 concepts, still rank all; rejectionReasons may be empty.",
  "Output a single JSON object only — no markdown.",
].join("\n\n");

function parseJudgeOutput(
  raw: string,
):
  | { ok: true; data: CreativeDirectorJudgeOutput }
  | { ok: false; error: z.ZodError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return {
      ok: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Judge output was not valid JSON.",
        },
      ]),
    };
  }
  const v = creativeDirectorJudgeOutputSchema.safeParse(parsed);
  if (v.success) return { ok: true, data: v.data };
  return { ok: false, error: v.error };
}

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
  };
}

/**
 * Scores and ranks concept routes after creative director generation.
 */
export async function runCreativeDirectorJudge(args: {
  conceptsJson: Record<string, unknown>[];
  formattedContext: string;
}): Promise<CreativeDirectorJudgeOutput> {
  const ids = args.conceptsJson
    .map((c) => String(c.conceptId ?? "").trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return fallbackJudge([]);
  }

  const provider = getLlmProvider();
  if (!provider) {
    return fallbackJudge(ids);
  }

  const allCanon = buildCreativeCanonUserSection([...CANON_FRAMEWORKS]);
  const user = [
    "## Concepts to judge (JSON array)",
    JSON.stringify(args.conceptsJson, null, 2).slice(0, 24_000),
    "",
    "## Full brief / brand / upstream context",
    args.formattedContext.slice(0, 12_000),
    "",
    "## Creative Canon reference (all frameworks)",
    allCanon.slice(0, 14_000),
  ].join("\n");

  const useJsonMode = provider.id === "openai";
  const first = await provider.complete(
    [{ role: "system", content: JUDGE_SYSTEM }, { role: "user", content: user }],
    { maxTokens: 4096, jsonMode: useJsonMode },
  );

  let parsed = parseJudgeOutput(first.text);
  if (parsed.ok) {
    return normalizeJudgeOutput(parsed.data, ids);
  }
  const parseErrSummary = summarizeZodError(parsed.error);

  const shapeHint = `{
  "rankedConceptIds": string[],
  "winnerConceptId": string,
  "scores": { "<conceptId>": { "distinctiveness": 0-1, "brandAlignment": 0-1, "clarity": 0-1, "emotionalImpact": 0-1, "nonGenericLanguage": 0-1 } },
  "rejectionReasons": [{ "conceptId": string, "reason": string }],
  "judgeSummary": string (optional)
}`;

  const repair = await repairJsonWithProvider(
    provider,
    first.text,
    shapeHint,
    parseErrSummary,
    8192,
  );
  parsed = parseJudgeOutput(repair.text);
  if (parsed.ok) {
    return normalizeJudgeOutput(parsed.data, ids);
  }

  return fallbackJudge(ids);
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
  };
}
