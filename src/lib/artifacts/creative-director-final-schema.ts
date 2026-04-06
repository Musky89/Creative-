import { z } from "zod";

/** Persisted on EXPORT artifact as `_creativeDirectorDecision` (alongside agent output keys). */
export const creativeDirectorFinalOutputSchema = z
  .object({
    finalVerdict: z.enum(["APPROVE", "REWORK"]),
    selectedVisualAssetId: z.string().min(1).nullable(),
    /** Human-readable pick, e.g. "Headline 1 + Body 2 + CTA 1" */
    selectedCopyVariant: z.string().min(3),
    rationale: z.string().min(80),
    improvementDirectives: z.array(z.string().min(12)).min(1).max(12),
  })
  .strict();

export type CreativeDirectorFinalOutput = z.infer<
  typeof creativeDirectorFinalOutputSchema
>;

export const creativeDirectorDecisionPersistedSchema = z
  .object({
    verdict: z.enum(["APPROVE", "REWORK"]),
    rationale: z.string(),
    selectedAssets: z.object({
      visualAssetId: z.string().nullable(),
      copyVariant: z.string(),
    }),
    improvementDirectives: z.array(z.string()),
    /** Second pass after one rework */
    finalPass: z.boolean().optional(),
  })
  .strict();

export type CreativeDirectorDecisionPersisted = z.infer<
  typeof creativeDirectorDecisionPersistedSchema
>;
