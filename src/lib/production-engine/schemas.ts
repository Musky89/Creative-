import { z } from "zod";
import { PRODUCTION_MODES } from "./modes";

const productionModeSchema = z.enum(PRODUCTION_MODES);

const campaignCoreSchema = z
  .object({
    singleLineIdea: z.string().optional(),
    emotionalTension: z.string().optional(),
    visualNarrative: z.string().optional(),
  })
  .optional();

const brandAssetsSchema = z
  .object({
    logoUrl: z.string().optional(),
    logoDescription: z.string().optional(),
    fonts: z
      .array(
        z.object({
          family: z.string(),
          weights: z.array(z.string()).optional(),
          sourceNote: z.string().optional(),
        }),
      )
      .optional(),
    colors: z
      .array(
        z.object({
          name: z.string().optional(),
          hex: z.string(),
          role: z.string().optional(),
        }),
      )
      .optional(),
    otherAssetNotes: z.string().optional(),
  })
  .optional();

export const productionEngineInputSchema = z.object({
  mode: productionModeSchema,
  briefSummary: z.string().min(1, "briefSummary required"),
  campaignCore: campaignCoreSchema,
  selectedConcept: z.object({
    conceptId: z.string().optional(),
    conceptName: z.string().min(1),
    hook: z.string().optional(),
    rationale: z.string().optional(),
    visualDirection: z.string().optional(),
  }),
  selectedHeadline: z.string().min(1),
  selectedCta: z.string().min(1),
  supportingCopy: z.string().optional(),
  visualDirection: z.string().min(1),
  visualSpecNotes: z.string().optional(),
  referenceSummaries: z.array(z.string()),
  brandRulesSummary: z.string().min(1),
  brandOperatingSystemSummary: z.string().optional(),
  brandAssets: brandAssetsSchema,
  visualStyleRef: z.string().optional(),
  modelRef: z.string().optional(),
});

export type ProductionEngineInputParsed = z.infer<
  typeof productionEngineInputSchema
>;
