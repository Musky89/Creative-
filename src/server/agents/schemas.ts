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
