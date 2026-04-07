/**
 * Canvas specs for Final Output Composer — social, OOH, print.
 * `scale` multiplies base dimensions for high-res export (e.g. 2 = 2× pixels).
 */

export type FinalOutputFormatId = "SOCIAL" | "OOH" | "PRINT" | "CAMPAIGN_DEFAULT";

export type FinalOutputFormatSpec = {
  id: Exclude<FinalOutputFormatId, "CAMPAIGN_DEFAULT">;
  label: string;
  /** Base width before scale. */
  baseW: number;
  baseH: number;
  /** Safe inset as fraction of min(w,h). */
  safeInset: number;
  /** Max headline lines. */
  maxHeadlineLines: number;
  /** Headline chars per line (approx). */
  headlineCharsPerLine: number;
  /** CTA max chars (single line). */
  ctaMaxChars: number;
};

export const FINAL_OUTPUT_FORMATS: Record<
  Exclude<FinalOutputFormatId, "CAMPAIGN_DEFAULT">,
  FinalOutputFormatSpec
> = {
  SOCIAL: {
    id: "SOCIAL",
    label: "Social (4:5 feed)",
    baseW: 1080,
    baseH: 1350,
    safeInset: 0.045,
    maxHeadlineLines: 3,
    headlineCharsPerLine: 16,
    ctaMaxChars: 48,
  },
  OOH: {
    id: "OOH",
    label: "OOH / wide",
    baseW: 1920,
    baseH: 640,
    safeInset: 0.055,
    maxHeadlineLines: 2,
    headlineCharsPerLine: 22,
    ctaMaxChars: 48,
  },
  PRINT: {
    id: "PRINT",
    label: "Print / poster",
    baseW: 1650,
    baseH: 2550,
    safeInset: 0.05,
    maxHeadlineLines: 4,
    headlineCharsPerLine: 20,
    ctaMaxChars: 48,
  },
};

/** Default multiplier for “high-res” delivery (2× base canvas). */
export const FINAL_OUTPUT_HIGH_RES_SCALE = 2;
