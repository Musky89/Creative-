import { z } from "zod";

/**
 * Unified creative QA dimensions for strategy angles, concepts, copy lines, etc.
 */
export const creativeQualityScoreEntrySchema = z
  .object({
    distinctiveness: z.number().min(0).max(1),
    brandAlignment: z.number().min(0).max(1),
    clarity: z.number().min(0).max(1),
    emotionalImpact: z.number().min(0).max(1),
    nonGenericLanguage: z.number().min(0).max(1),
  })
  .strict();

export type CreativeQualityScoreEntry = z.infer<
  typeof creativeQualityScoreEntrySchema
>;

export function averageCreativeQualityScore(s: CreativeQualityScoreEntry): number {
  return (
    s.distinctiveness +
    s.brandAlignment +
    s.clarity +
    s.emotionalImpact +
    s.nonGenericLanguage
  ) / 5;
}

export function defaultCreativeQualityScore(): CreativeQualityScoreEntry {
  return {
    distinctiveness: 0.55,
    brandAlignment: 0.55,
    clarity: 0.55,
    emotionalImpact: 0.55,
    nonGenericLanguage: 0.55,
  };
}
