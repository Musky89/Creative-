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
  type CreativeQualityScoreEntry,
} from "@/lib/creative/creative-quality-score";

export const strategistJudgeOutputSchema = z
  .object({
    rankedFrameworkIds: z.array(z.string().min(1)).min(1),
    primaryFrameworkId: z.string().min(1),
    alternateFrameworkIds: z.array(z.string().min(1)).max(2),
    scores: z.record(z.string(), creativeQualityScoreEntrySchema),
    selectionRationale: z.string().min(40),
  })
  .strict();

export type StrategistJudgeOutput = z.infer<typeof strategistJudgeOutputSchema>;

const JUDGE_SYSTEM = [
  "You are an Executive Strategy Director selecting the **best strategic angles** for one brief.",
  "You receive exactly three angles, each tied to a Creative Canon frameworkId and a written angle.",
  "Score each frameworkId on five 0–1 floats: distinctiveness, brandAlignment, clarity, emotionalImpact, nonGenericLanguage.",
  "Be harsh on interchangeable strategy, buzzwords, and angles that could apply to any brand.",
  "rankedFrameworkIds: all three frameworkIds, best first.",
  "primaryFrameworkId: the single angle that should lead downstream creative.",
  "alternateFrameworkIds: 1–2 runner-up frameworkIds (distinct from primary); if only one strong alternate, return one id.",
  "selectionRationale: 2–4 sentences — why primary wins and what alternates preserve.",
  "Output a single JSON object only — no markdown.",
].join("\n\n");

function parseOutput(
  raw: string,
):
  | { ok: true; data: StrategistJudgeOutput }
  | { ok: false; error: z.ZodError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return {
      ok: false,
      error: new z.ZodError([
        { code: "custom", path: [], message: "Judge output was not valid JSON." },
      ]),
    };
  }
  const v = strategistJudgeOutputSchema.safeParse(parsed);
  if (v.success) return { ok: true, data: v.data };
  return { ok: false, error: v.error };
}

function fallbackJudge(frameworkIds: string[]): StrategistJudgeOutput {
  const primary = frameworkIds[0] ?? "unknown";
  const scores: Record<string, CreativeQualityScoreEntry> = {};
  for (const id of frameworkIds) {
    scores[id] = defaultCreativeQualityScore();
  }
  const alternates = frameworkIds.filter((id) => id !== primary).slice(0, 2);
  return {
    rankedFrameworkIds: [...frameworkIds],
    primaryFrameworkId: primary,
    alternateFrameworkIds: alternates,
    scores,
    selectionRationale:
      "LLM unavailable — defaulting to first listed angle as primary; alternates are the remaining angles in order.",
  };
}

function normalizeJudgeOutput(
  raw: StrategistJudgeOutput,
  validIds: string[],
): StrategistJudgeOutput {
  const set = new Set(validIds);
  let primary = raw.primaryFrameworkId.trim();
  if (!set.has(primary)) primary = validIds[0]!;

  const scores: Record<string, CreativeQualityScoreEntry> = { ...raw.scores };
  for (const id of validIds) {
    if (!scores[id]) scores[id] = defaultCreativeQualityScore();
  }

  const ranked = raw.rankedFrameworkIds.filter((id) => set.has(id));
  for (const id of validIds) {
    if (!ranked.includes(id)) ranked.push(id);
  }

  let alternates = raw.alternateFrameworkIds
    .map((id) => id.trim())
    .filter((id) => set.has(id) && id !== primary)
    .slice(0, 2);
  if (alternates.length === 0) {
    alternates = ranked.filter((id) => id !== primary).slice(0, 2);
  }

  return {
    rankedFrameworkIds: ranked,
    primaryFrameworkId: primary,
    alternateFrameworkIds: alternates,
    scores,
    selectionRationale: raw.selectionRationale,
  };
}

/**
 * Ranks three strategic angles and picks a primary + up to two alternates.
 */
export async function runStrategistJudge(args: {
  anglesJson: { frameworkId: string; angle: string }[];
  formattedContext: string;
}): Promise<StrategistJudgeOutput> {
  const ids = args.anglesJson
    .map((a) => String(a.frameworkId ?? "").trim())
    .filter(Boolean);
  if (ids.length === 0) return fallbackJudge([]);

  const provider = getLlmProvider();
  if (!provider) return fallbackJudge(ids);

  const allCanon = buildCreativeCanonUserSection([...CANON_FRAMEWORKS]);
  const user = [
    "## Strategic angles (JSON array)",
    JSON.stringify(args.anglesJson, null, 2).slice(0, 12_000),
    "",
    "## Context",
    args.formattedContext.slice(0, 14_000),
    "",
    "## Creative Canon (reference)",
    allCanon.slice(0, 12_000),
  ].join("\n");

  const useJsonMode = provider.id === "openai";
  const first = await provider.complete(
    [{ role: "system", content: JUDGE_SYSTEM }, { role: "user", content: user }],
    { maxTokens: 3072, jsonMode: useJsonMode },
  );

  let parsed = parseOutput(first.text);
  if (parsed.ok) {
    return normalizeJudgeOutput(parsed.data, ids);
  }

  const shapeHint = `{
  "rankedFrameworkIds": string[],
  "primaryFrameworkId": string,
  "alternateFrameworkIds": string[] (max 2),
  "scores": { "<frameworkId>": { "distinctiveness": 0-1, "brandAlignment": 0-1, "clarity": 0-1, "emotionalImpact": 0-1, "nonGenericLanguage": 0-1 } },
  "selectionRationale": string (min ~40 chars)
}`;

  const repair = await repairJsonWithProvider(
    provider,
    first.text,
    shapeHint,
    summarizeZodError(parsed.error),
    8192,
  );
  parsed = parseOutput(repair.text);
  if (parsed.ok) {
    return normalizeJudgeOutput(parsed.data, ids);
  }
  return fallbackJudge(ids);
}
