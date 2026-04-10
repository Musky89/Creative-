import { z } from "zod";

/** No imports from production-engine, lab, or orchestrator — this is a greenfield contract. */

export const hexColorSchema = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Invalid hex");

export const brandPaletteEntrySchema = z.object({
  name: z.string().min(1),
  hex: hexColorSchema,
  role: z.enum(["primary", "secondary", "accent", "background", "text", "other"]).optional(),
});

export const brandGraphSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1).default(1),
  name: z.string().min(1),
  updatedAt: z.string(),
  voiceSummary: z.string().min(1),
  mustSignal: z.string().optional(),
  mustAvoid: z.string().optional(),
  bannedPhrases: z.array(z.string()).default([]),
  palette: z.array(brandPaletteEntrySchema).min(1),
  typographyNotes: z.string().optional(),
  logoNotes: z.string().optional(),
  exemplarNotes: z.string().optional(),
});

export const channelSpecSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  maxHeadlineChars: z.number().int().min(1).max(200).default(80),
  maxCtaChars: z.number().int().min(1).max(80).default(40),
  minContrastRatio: z.number().min(1).max(21).default(4.5),
});

export const campaignGraphSchema = z.object({
  id: z.string().min(1),
  brandId: z.string().min(1),
  version: z.number().int().min(1).default(1),
  name: z.string().min(1),
  updatedAt: z.string(),
  objective: z.string().min(1),
  audience: z.string().min(1),
  singleMindedProposition: z.string().min(1),
  proofPoints: z.array(z.string()).default([]),
  channelSpecId: z.string().min(1),
});

export const creativeProposalSchema = z.object({
  headline: z.string(),
  subhead: z.string().optional(),
  cta: z.string(),
  visualBrief: z.string(),
  rationale: z.string(),
});

export const criticVerdictSchema = z.object({
  overall: z.enum(["strong", "acceptable", "weak", "fail"]),
  onBrandScore: z.number().min(0).max(10),
  issues: z.array(z.string()),
  regenerationRecommended: z.boolean(),
  revisionHints: z.array(z.string()),
});

export const verificationResultSchema = z.object({
  passed: z.boolean(),
  checks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      passed: z.boolean(),
      detail: z.string().optional(),
    }),
  ),
});

export const caseFileSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  brandId: z.string(),
  brandVersion: z.number(),
  campaignId: z.string(),
  campaignVersion: z.number(),
  proposal: creativeProposalSchema,
  critic: criticVerdictSchema,
  verification: verificationResultSchema,
  revisionCount: z.number().int().min(0),
  llmUsed: z.boolean(),
});

export type BrandGraph = z.infer<typeof brandGraphSchema>;
export type CampaignGraph = z.infer<typeof campaignGraphSchema>;
export type ChannelSpec = z.infer<typeof channelSpecSchema>;
export type CreativeProposal = z.infer<typeof creativeProposalSchema>;
export type CriticVerdict = z.infer<typeof criticVerdictSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;
export type CaseFile = z.infer<typeof caseFileSchema>;
