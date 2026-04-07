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

const headlineKey = (i: number) => `h${i}`;

export const copyJudgeOutputSchema = z
  .object({
    rankedHeadlineKeys: z.array(z.string().min(1)).min(1),
    primaryHeadlineKey: z.string().min(1),
    alternateHeadlineKeys: z.array(z.string().min(1)).max(2),
    scores: z.record(z.string(), creativeQualityScoreEntrySchema),
    selectionRationale: z.string().min(40),
  })
  .strict();

export type CopyJudgeOutput = z.infer<typeof copyJudgeOutputSchema>;

const JUDGE_SYSTEM = [
  "You are a ruthless Executive Creative Director judging **headline candidates** for one campaign.",
  "Headlines are keyed as h0, h1, h2, … in the order given.",
  "Score each key on five 0–1 floats: distinctiveness, brandAlignment, clarity, emotionalImpact, nonGenericLanguage.",
  "Penalize generic platitudes, category filler, and lines that could run on any competitor.",
  "rankedHeadlineKeys: all keys, best first.",
  "primaryHeadlineKey: the single headline that should lead the deck and comps.",
  "alternateHeadlineKeys: 1–2 runner-up keys (distinct from primary).",
  "selectionRationale: why primary wins vs the field; what the alternates preserve.",
  "Output a single JSON object only — no markdown.",
].join("\n\n");

function parseOutput(
  raw: string,
):
  | { ok: true; data: CopyJudgeOutput }
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
  const v = copyJudgeOutputSchema.safeParse(parsed);
  if (v.success) return { ok: true, data: v.data };
  return { ok: false, error: v.error };
}

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
  };
}

/**
 * Ranks headline strings and picks primary + up to two alternates.
 */
export async function runCopyHeadlineJudge(args: {
  headlines: string[];
  formattedContext: string;
}): Promise<CopyJudgeOutput> {
  const keys = args.headlines.map((_, i) => headlineKey(i));
  if (keys.length === 0) return fallbackJudge([]);

  const payload = args.headlines.map((text, i) => ({
    key: headlineKey(i),
    headline: text,
  }));

  const provider = getLlmProvider();
  if (!provider) return fallbackJudge(keys);

  const allCanon = buildCreativeCanonUserSection([...CANON_FRAMEWORKS]);
  const user = [
    "## Headline candidates",
    JSON.stringify(payload, null, 2).slice(0, 12_000),
    "",
    "## Context",
    args.formattedContext.slice(0, 14_000),
    "",
    "## Creative Canon (reference)",
    allCanon.slice(0, 10_000),
  ].join("\n");

  const useJsonMode = provider.id === "openai";
  const first = await provider.complete(
    [{ role: "system", content: JUDGE_SYSTEM }, { role: "user", content: user }],
    { maxTokens: 3072, jsonMode: useJsonMode },
  );

  let parsed = parseOutput(first.text);
  if (parsed.ok) {
    return normalizeJudgeOutput(parsed.data, keys);
  }

  const shapeHint = `{
  "rankedHeadlineKeys": string[],
  "primaryHeadlineKey": string,
  "alternateHeadlineKeys": string[] (max 2),
  "scores": { "h0": { "distinctiveness": 0-1, "brandAlignment": 0-1, "clarity": 0-1, "emotionalImpact": 0-1, "nonGenericLanguage": 0-1 }, ... },
  "selectionRationale": string
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
    return normalizeJudgeOutput(parsed.data, keys);
  }
  return fallbackJudge(keys);
}
