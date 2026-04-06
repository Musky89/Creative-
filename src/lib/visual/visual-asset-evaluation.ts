import { z } from "zod";
import { visualSpecArtifactSchema } from "@/lib/artifacts/contracts";

/**
 * Structured visual QA output (persisted on VisualAssetReview.evaluation).
 */
export const visualAssetEvaluationSchema = z.object({
  qualityVerdict: z.enum(["STRONG", "ACCEPTABLE", "WEAK"]),
  brandAlignment: z.string().min(1),
  distinctiveness: z.string().min(1),
  compositionAssessment: z.string().min(1),
  emotionalAlignment: z.string().min(1),
  slopRisk: z.enum(["LOW", "MEDIUM", "HIGH"]),
  /** Without vision we cannot see pixels — deterministic uses prompt heuristics only. */
  avoidListRespected: z.enum(["LIKELY", "UNCERTAIN", "LIKELY_VIOLATED"]),
  recommendations: z.array(z.string()).max(10),
  regenerationRecommended: z.boolean(),
  deterministicIssues: z.array(z.string()),
  llmNotes: z.string().optional(),
});

export type VisualAssetEvaluation = z.infer<typeof visualAssetEvaluationSchema>;

const SLOP_HINTS = [
  "neon gradient",
  "lens flare",
  "oversaturated",
  "stock photo",
  "cgi",
  "uncanny",
  "floating",
  "generic office",
  "hand with six",
];

function norm(s: string): string {
  return s.toLowerCase();
}

/**
 * Heuristic checks on **prompt text** + VISUAL_SPEC (no pixels).
 */
export function deterministicVisualAssetEvaluation(args: {
  promptUsed: string;
  negativePromptUsed?: string;
  spec: z.infer<typeof visualSpecArtifactSchema> | null;
}): Pick<
  VisualAssetEvaluation,
  | "avoidListRespected"
  | "slopRisk"
  | "deterministicIssues"
  | "compositionAssessment"
  | "distinctiveness"
  | "brandAlignment"
  | "emotionalAlignment"
  | "recommendations"
  | "regenerationRecommended"
  | "qualityVerdict"
> {
  const issues: string[] = [];
  const p = norm(args.promptUsed);

  for (const h of SLOP_HINTS) {
    if (p.includes(h)) {
      issues.push(`Prompt language suggests generic/AI-slop risk: "${h}".`);
    }
  }

  if (args.promptUsed.length < 120) {
    issues.push("Image prompt bundle is very short — may lack concrete art-direction.");
  }

  let avoidListRespected: VisualAssetEvaluation["avoidListRespected"] = "UNCERTAIN";
  if (args.spec?.avoidList?.length) {
    const hits: string[] = [];
    for (const a of args.spec.avoidList) {
      const t = norm(String(a).trim());
      if (t.length > 3 && p.includes(t)) {
        hits.push(String(a).trim());
      }
    }
    if (hits.length > 0) {
      avoidListRespected = "LIKELY_VIOLATED";
      issues.push(
        `Prompt text appears to include avoidList phrases (should be negative-only): ${hits.slice(0, 4).join("; ")}`,
      );
    } else {
      avoidListRespected = "LIKELY";
    }
  }

  const specKeywords = args.spec
    ? [
        norm(args.spec.composition),
        norm(args.spec.mood),
        norm(args.spec.colorDirection),
        norm(args.spec.distinctivenessNotes),
      ].join(" ")
    : "";
  let overlap = 0;
  if (specKeywords.length > 20) {
    const words = specKeywords.split(/\s+/).filter((w) => w.length > 4);
    const seen = new Set(words.slice(0, 40));
    for (const w of p.split(/\s+/)) {
      if (w.length > 4 && seen.has(w)) overlap++;
    }
  }
  if (args.spec && overlap < 3) {
    issues.push("Generated prompt text has weak lexical overlap with VISUAL_SPEC — may drift from approved direction.");
  }

  const slopRisk: VisualAssetEvaluation["slopRisk"] =
    issues.filter((x) => x.includes("slop") || x.includes("generic")).length >= 2
      ? "HIGH"
      : issues.length >= 2
        ? "MEDIUM"
        : "LOW";

  const regenerationRecommended =
    avoidListRespected === "LIKELY_VIOLATED" || slopRisk === "HIGH" || issues.length >= 3;

  const qualityVerdict: VisualAssetEvaluation["qualityVerdict"] = regenerationRecommended
    ? "WEAK"
    : issues.length >= 1
      ? "ACCEPTABLE"
      : "STRONG";

  return {
    qualityVerdict,
    brandAlignment: args.spec
      ? `Prompt/spec keyword overlap score: ${overlap} (heuristic). ${issues.length ? "Review issues below." : "Aligned on text level."}`
      : "No VISUAL_SPEC loaded — cannot score brand alignment beyond prompt heuristics.",
    distinctiveness: args.spec
      ? `Spec distinctiveness notes length ${args.spec.distinctivenessNotes.length} chars; prompt length ${args.promptUsed.length}.`
      : "No spec — distinctiveness unverified.",
    compositionAssessment:
      args.spec && p.includes(norm(args.spec.composition).slice(0, 24))
        ? "Composition cues from spec appear reflected in prompt text."
        : "Composition alignment uncertain from text alone — vision review recommended if provider available.",
    emotionalAlignment: args.spec
      ? `Spec mood/emotion fields present; emotional keywords in prompt: ${p.includes(norm(args.spec.mood).slice(0, 12)) ? "partial match" : "weak match"}.`
      : "No spec for emotional cross-check.",
    slopRisk,
    avoidListRespected,
    recommendations: issues.slice(0, 8),
    regenerationRecommended,
    deterministicIssues: issues,
  };
}
