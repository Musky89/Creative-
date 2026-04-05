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
});

export const conceptArtifactSchema = z.object({
  conceptName: z.string().min(1),
  hook: z.string().min(1),
  rationale: z.string().min(1),
  visualDirection: z.string().min(1),
});

export const copyArtifactSchema = z.object({
  headlineOptions: z.array(z.string().min(1)).min(2).max(8),
  bodyCopyOptions: z.array(z.string().min(1)).min(1).max(6),
  ctaOptions: z.array(z.string().min(1)).min(1).max(6),
});

export const reviewReportArtifactSchema = z.object({
  scoreSummary: z.string().min(1),
  verdict: z.string().min(1),
  issues: z.array(z.string()).max(20),
  recommendations: z.array(z.string().min(1)).max(12),
});

export type StrategyArtifact = z.infer<typeof strategyArtifactSchema>;
export type ConceptArtifact = z.infer<typeof conceptArtifactSchema>;
export type CopyArtifact = z.infer<typeof copyArtifactSchema>;
export type ReviewReportArtifact = z.infer<typeof reviewReportArtifactSchema>;

/** For LLM repair prompts — exact keys and constraints. */
export const ARTIFACT_SHAPE_HINTS = {
  STRATEGY: `{
  "objective": string (non-empty),
  "audience": string (non-empty),
  "insight": string (non-empty),
  "proposition": string (non-empty),
  "messagePillars": string[] (min 1, max 8, each non-empty)
}`,
  CONCEPT: `{
  "conceptName": string,
  "hook": string,
  "rationale": string,
  "visualDirection": string
}`,
  COPY: `{
  "headlineOptions": string[] (min 2, max 8),
  "bodyCopyOptions": string[] (min 1, max 6),
  "ctaOptions": string[] (min 1, max 6)
}`,
  REVIEW_REPORT: `{
  "scoreSummary": string,
  "verdict": string,
  "issues": string[] (max 20, can be empty),
  "recommendations": string[] (max 12, can be empty)
}`,
} as const;

/** Human-readable keys the Brand Bible readiness check uses (aligned with DB fields). */
export const BRAND_BIBLE_REQUIRED_FIELDS = [
  "positioning",
  "targetAudience",
  "toneOfVoice",
  "messagingPillars",
] as const;
