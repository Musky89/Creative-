/**
 * Zod contracts for Brand OS taste-engine fields (BrandBible JSON + text limits).
 * Used when persisting from forms / APIs; mirrors Prisma BrandBible columns.
 */
import { z } from "zod";

const lineArray = (maxItems: number, maxLineLen = 400) =>
  z
    .array(z.string().trim().min(1).max(maxLineLen))
    .max(maxItems)
    .default([]);

const closerThanLine = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .describe('e.g. "Closer to Aesop than Sephora"');

export const brandOsTasteEngineSchema = z.object({
  languageDnaPhrasesUse: lineArray(40),
  languageDnaPhrasesNever: lineArray(40),
  languageDnaSentenceRhythm: lineArray(16),
  languageDnaHeadlinePatterns: lineArray(20),
  languageDnaCtaPatterns: lineArray(20),
  categoryTypicalBehavior: z.string().max(8000).default(""),
  categoryClichesToAvoid: lineArray(32),
  categoryDifferentiation: z.string().max(8000).default(""),
  tensionCoreContradiction: z.string().max(4000).default(""),
  tensionEmotionalBalance: z.string().max(4000).default(""),
  tasteCloserThan: z.array(closerThanLine).max(16).default([]),
  tasteShouldFeelLike: z.string().max(4000).default(""),
  tasteMustNotFeelLike: z.string().max(4000).default(""),
  visualNeverLooksLike: lineArray(32),
  visualCompositionTendencies: z.string().max(4000).default(""),
  visualMaterialTextureDirection: z.string().max(4000).default(""),
  visualLightingTendencies: z.string().max(4000).default(""),
});

export type BrandOsTasteEngineInput = z.infer<typeof brandOsTasteEngineSchema>;

/** Merge for substring enforcement in quality loop (banned + DNA never + category clichés). */
export function mergeTasteEnforcementPhrases(args: {
  bannedPhrases: string[];
  languageDnaPhrasesNever: string[];
  categoryClichesToAvoid: string[];
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [
    ...args.bannedPhrases,
    ...args.languageDnaPhrasesNever,
    ...args.categoryClichesToAvoid,
  ]) {
    const t = raw.trim();
    if (t.length < 2) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.slice(0, 120);
}
