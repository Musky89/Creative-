/**
 * Shared artifact contracts — import from UI or server to avoid renderer drift.
 * Zod is the single source of shape truth for agent outputs.
 */
import { z } from "zod";

export const strategyArtifactSchema = z.object({
  objective: z.string().min(1),
  audience: z.string().min(1),
  insight: z.string().min(1),
  proposition: z.string().min(1),
  messagePillars: z.array(z.string().min(1)).min(1).max(8),
  /** Strategic angles explicitly tied to Creative Canon framework ids (from selection). */
  strategicAngles: z
    .array(
      z.object({
        frameworkId: z.string().min(1),
        angle: z.string().min(1),
      }),
    )
    .min(2)
    .max(5),
});

export const conceptSubSchema = z.object({
  frameworkId: z.string().min(1),
  conceptName: z.string().min(1),
  hook: z.string().min(1),
  rationale: z.string().min(1),
  visualDirection: z.string().min(1),
  /** Ties the route to Brand OS / positioning (not generic praise). */
  whyItWorksForBrand: z.string().min(1),
});

export const conceptArtifactSchema = z.object({
  /** Human-readable summary of how frameworks were applied (e.g. "Three routes: Transformation, Contrast, Cultural"). */
  frameworkUsed: z.string().min(1),
  concepts: z.array(conceptSubSchema).min(2).max(3),
});

/**
 * Visual Intelligence — structured art direction before any image/video/logo generation.
 * Extension point: downstream builders can assemble prompts from these fields + Brand OS visual language.
 */
export const visualSpecArtifactSchema = z.object({
  /** Creative Canon framework id this direction primarily executes (must match a provided Canon id). */
  frameworkUsed: z.string().min(1),
  conceptName: z.string().min(1),
  visualObjective: z.string().min(40),
  whyItWorksForBrand: z.string().min(40),
  mood: z.string().min(20),
  emotionalTone: z.string().min(20),
  composition: z.string().min(30),
  colorDirection: z.string().min(20),
  textureDirection: z.string().min(15),
  lightingDirection: z.string().min(15),
  typographyDirection: z.string().min(15),
  imageStyle: z.string().min(25),
  /** How references should be used (e.g. "analog only", "no stock smileys") — not a URL dump. */
  referenceLogic: z.string().min(20),
  distinctivenessNotes: z.string().min(30),
  avoidList: z.array(z.string().min(1)).min(2).max(24),
  /** Optional seed for a future image model; concrete visual nouns, not vibes-only. */
  optionalPromptSeed: z.string().max(2000).optional(),
});

export const copyArtifactSchema = z.object({
  /** Primary framework id from the concept route being executed (must match a Canon id when applicable). */
  frameworkUsed: z.string().min(1),
  headlineOptions: z.array(z.string().min(1)).min(2).max(8),
  bodyCopyOptions: z.array(z.string().min(1)).min(1).max(6),
  ctaOptions: z.array(z.string().min(1)).min(1).max(6),
});

export const reviewReportArtifactSchema = z.object({
  scoreSummary: z.string().min(1),
  verdict: z.string().min(1),
  issues: z.array(z.string()).max(20),
  recommendations: z.array(z.string().min(1)).max(12),
  /** How well Creative Canon frameworks were executed in concept + copy. */
  frameworkAssessment: z.string().min(1),
  frameworkExecution: z.enum(["STRONG", "MIXED", "WEAK", "NOT_APPLICABLE"]),
  qualityVerdict: z.enum(["STRONG", "ACCEPTABLE", "WEAK"]),
  distinctivenessAssessment: z.string().min(1),
  brandAlignmentAssessment: z.string().min(1),
  /** Brand OS: vocabulary, sentence style, emotion vs draft. */
  toneAlignment: z.string().min(1),
  /** Brand OS rule adherence (banned phrases = FAIL). */
  languageCompliance: z.enum(["PASS", "WARN", "FAIL"]),
  /** Brand OS banned phrases or close variants found in evaluated copy (empty if none). */
  bannedPhraseViolations: z.array(z.string()).max(20),
  regenerationRecommended: z.boolean(),
  regenerationReasons: z.array(z.string()).max(10),
});

export type StrategyArtifact = z.infer<typeof strategyArtifactSchema>;
export type ConceptArtifact = z.infer<typeof conceptArtifactSchema>;
export type ConceptVariant = z.infer<typeof conceptSubSchema>;
export type VisualSpecArtifact = z.infer<typeof visualSpecArtifactSchema>;
export type CopyArtifact = z.infer<typeof copyArtifactSchema>;
export type ReviewReportArtifact = z.infer<typeof reviewReportArtifactSchema>;

/** For LLM repair prompts — exact keys and constraints. */
export const ARTIFACT_SHAPE_HINTS = {
  STRATEGY: `{
  "objective": string,
  "audience": string,
  "insight": string,
  "proposition": string,
  "messagePillars": string[] (min 1, max 8),
  "strategicAngles": { "frameworkId": string, "angle": string }[] (min 2, max 5) — each frameworkId must match a provided Creative Canon id
}`,
  CONCEPT: `{
  "frameworkUsed": string (summary of which frameworks drive the pack),
  "concepts": array (min 2, max 3) of { "frameworkId", "conceptName", "hook", "rationale", "visualDirection", "whyItWorksForBrand" } — each frameworkId must be one of the provided Creative Canon ids; concepts must be DISTINCT routes; whyItWorksForBrand must tie the route to Brand OS / positioning
}`,
  VISUAL_SPEC: `{
  "frameworkUsed": string (must be one of the provided Creative Canon ids — primary framework for this direction),
  "conceptName": string (chosen concept route name from upstream CONCEPT),
  "visualObjective": string (min ~40 chars — what the visual system must achieve),
  "whyItWorksForBrand": string (min ~40 — brand/OS-grounded, not generic praise),
  "mood", "emotionalTone", "composition", "colorDirection", "textureDirection", "lightingDirection", "typographyDirection", "imageStyle", "referenceLogic", "distinctivenessNotes": strings with substance; no empty "luxury" without concrete cues,
  "avoidList": string[] (min 2) — clichés, AI slop, off-brand tropes to exclude,
  "optionalPromptSeed": optional string — future image pipeline hook
}`,
  COPY: `{
  "frameworkUsed": string,
  "headlineOptions": string[] (min 2, max 8),
  "bodyCopyOptions": string[] (min 1, max 6),
  "ctaOptions": string[] (min 1, max 6)
}`,
  REVIEW_REPORT: `{
  "scoreSummary": string,
  "verdict": string,
  "issues": string[],
  "recommendations": string[],
  "frameworkAssessment": string,
  "frameworkExecution": "STRONG" | "MIXED" | "WEAK" | "NOT_APPLICABLE",
  "qualityVerdict": "STRONG" | "ACCEPTABLE" | "WEAK",
  "distinctivenessAssessment": string,
  "brandAlignmentAssessment": string,
  "toneAlignment": string (Brand OS: vocabulary, sentence style, emotion),
  "languageCompliance": "PASS" | "WARN" | "FAIL",
  "bannedPhraseViolations": string[] (Brand OS banned phrases found in copy/concepts, or empty),
  "regenerationRecommended": boolean,
  "regenerationReasons": string[]
}`,
} as const;

/** Human-readable keys the Brand Bible readiness check uses (aligned with DB fields). */
export const BRAND_BIBLE_REQUIRED_FIELDS = [
  "positioning",
  "targetAudience",
  "toneOfVoice",
  "messagingPillars",
] as const;
