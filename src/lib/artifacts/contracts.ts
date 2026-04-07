/**
 * Shared artifact contracts — import from UI or server to avoid renderer drift.
 * Zod is the single source of shape truth for agent outputs.
 */
import { z } from "zod";
import { campaignCoreSchema } from "@/lib/campaign/campaign-core";
import { referenceCompositionProfileSchema } from "@/lib/visual/reference-composition-profile";

/** Matches Prisma `VisualPromptProviderTarget` — image adapters (no generation yet). */
export const visualPromptProviderTargetSchema = z.enum([
  "GENERIC",
  "GEMINI_IMAGE",
  "GPT_IMAGE",
  "FAL_IMAGE",
]);

const providerReadyBundleSchema = z.object({
  prompt: z.string().min(1),
  negativeOrAvoid: z.string(),
  adapterNote: z.string(),
});

/**
 * Deterministic assembly output: bridge VISUAL_SPEC + Brand OS → provider-ready packages.
 * Extension: `generateVisualAssetFromPromptPackage(id, provider)` consumes `providerVariants`.
 */
export const visualPromptPackageArtifactSchema = z.object({
  sourceVisualSpecId: z.string().min(1),
  /** Canonical row target; full multi-provider output lives in `providerVariants`. */
  providerTarget: visualPromptProviderTargetSchema,
  primaryPrompt: z.string().min(1),
  /** Merged avoid list + OS boundaries — safe to pass as negative prompt where supported. */
  negativePrompt: z.string(),
  styleInstructions: z.string().min(1),
  compositionInstructions: z.string().min(1),
  lightingInstructions: z.string().min(1),
  colorInstructions: z.string().min(1),
  textureInstructions: z.string().min(1),
  typographyInstructions: z.string().min(1),
  referenceInstructions: z.string().min(1),
  brandAlignmentNotes: z.string().min(1),
  optionalShotVariants: z.array(z.string().min(1)).max(12).optional(),
  optionalPromptMetadata: z.record(z.string(), z.unknown()).optional(),
  /** Reference library rows used to ground this package (deterministic selection). */
  _visualReferencesUsed: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        imageUrl: z.string().optional(),
      }),
    )
    .max(8)
    .optional(),
  _brandVisualProfileInfluence: z
    .object({
      profileId: z.string().min(1),
      traitsUsed: z.array(z.string()).max(40),
    })
    .optional(),
  /** Future: LoRA / fine-tuned checkpoint id (passed to provider when implemented). */
  _visualModelRef: z.string().nullable().optional(),
  _referenceCompositionProfile: referenceCompositionProfileSchema.optional(),
  /** Echo of STRATEGY campaignCore for traceability and Studio. */
  campaignCore: campaignCoreSchema.optional(),
  providerVariants: z
    .object({
      GENERIC: providerReadyBundleSchema.optional(),
      GEMINI_IMAGE: providerReadyBundleSchema.optional(),
      GPT_IMAGE: providerReadyBundleSchema.optional(),
    })
    .strict(),
});

/** Identity route taxonomy — JSON-safe slug (not display labels). */
export const identityRouteTypeSchema = z.enum([
  "wordmark",
  "monogram",
  "symbol",
  "abstract",
  "combination_mark",
]);

/**
 * Symbolic / semantic identity system before any mark or pixels.
 * Extension: downstream logo exploration reads `explorationHooks` + route geometry/typography logic.
 */
export const identityStrategyArtifactSchema = z.object({
  brandCoreIdea: z.string().min(40),
  symbolicTerritories: z.array(z.string().min(1)).min(2).max(8),
  identityArchetypes: z.array(z.string().min(1)).min(2).max(6),
  semanticDirections: z.array(z.string().min(1)).min(2).max(8),
  visualTensions: z.array(z.string().min(1)).min(1).max(6),
  whatTheIdentityMustSignal: z.array(z.string().min(1)).min(2).max(10),
  whatTheIdentityMustAvoid: z.array(z.string().min(1)).min(2).max(12),
  /** Optional hooks for future logo / mark / typography pipelines (concrete system directions, not vibes). */
  explorationHooks: z.array(z.string().min(1)).max(10).optional(),
});

export const identityRouteSubSchema = z.object({
  routeName: z.string().min(1),
  routeType: identityRouteTypeSchema,
  coreConcept: z.string().min(40),
  symbolicLogic: z.string().min(50),
  typographyLogic: z.string().min(40),
  geometryLogic: z.string().min(40),
  distinctivenessRationale: z.string().min(40),
  whyItWorksForBrand: z.string().min(40),
  risks: z.array(z.string().min(1)).min(1).max(8),
  avoidList: z.array(z.string().min(1)).min(2).max(16),
  /** Productive opposition this route holds (not generic "balance"). */
  coreTension: z.string().min(35),
  emotionalCenter: z.string().min(28),
  whyBeatsCategoryNorm: z.string().min(40),
  whyCouldFail: z.string().min(30),
  /** Distinct art-direction / mark world — not a duplicate of geometryLogic alone. */
  distinctVisualWorld: z.string().min(45),
  /** Optional: one-line seed for a future mark generator — reasoning-level, not a final prompt. */
  markExplorationSeed: z.string().max(500).optional(),
});

const identityPairComparisonSchema = z
  .object({
    leftIndex: z.number().int().min(0).max(4),
    rightIndex: z.number().int().min(0).max(4),
    overlapNotes: z.string().min(30),
    howTheyDiffer: z.string().min(30),
    strongerRouteThisPair: z.enum(["left", "right", "tie"]),
  })
  .strict();

/** Pairwise matrix for identity routes (A vs B vs C…). */
export const identityPairwiseDifferentiationSchema = z
  .object({
    pairComparisons: z.array(identityPairComparisonSchema).min(1).max(10),
    aggregateOverlap: z.string().min(40),
    strongestRouteIndex: z.number().int().min(0).max(4),
    weakestRouteIndex: z.number().int().min(0).max(4),
    differentiationSummary: z.string().min(80),
  })
  .strict();

/** Agent / LLM output for IDENTITY_ROUTES_PACK (founder selection is merged in Studio). */
export const identityRoutesPackArtifactSchema = z
  .object({
    /** Summary of Creative Canon ids informing the pack (must match provided ids). */
    frameworkUsed: z.string().min(1),
    routes: z.array(identityRouteSubSchema).min(3).max(5),
    /** How routes diverge — required so reviewers see intentional contrast. */
    routeDifferentiationSummary: z.string().min(60),
    /** Explicit pairwise comparisons — every unordered pair of routes. */
    pairwiseDifferentiation: identityPairwiseDifferentiationSchema,
    /** Extension: deterministic inputs for future logo prompt builders / boards. */
    logoExplorationReadiness: z
      .object({
        primaryRoutesForExploration: z.array(z.number().int().min(0).max(4)).max(3).optional(),
        systemConstraintsForMarks: z.array(z.string().min(1)).max(12).optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const n = data.routes.length;
    const need = (n * (n - 1)) / 2;
    const pairs = data.pairwiseDifferentiation.pairComparisons;
    if (pairs.length !== need) {
      ctx.addIssue({
        code: "custom",
        message: `pairwiseDifferentiation.pairComparisons must have exactly ${need} entries for ${n} routes (all unordered pairs).`,
        path: ["pairwiseDifferentiation", "pairComparisons"],
      });
    }
    const seen = new Set<string>();
    for (const p of pairs) {
      if (p.leftIndex === p.rightIndex) {
        ctx.addIssue({
          code: "custom",
          message: "Pair cannot compare a route to itself.",
          path: ["pairwiseDifferentiation", "pairComparisons"],
        });
        return;
      }
      const a = Math.min(p.leftIndex, p.rightIndex);
      const b = Math.max(p.leftIndex, p.rightIndex);
      if (a < 0 || b >= n) {
        ctx.addIssue({
          code: "custom",
          message: `Pair indices must be within 0..${n - 1}.`,
          path: ["pairwiseDifferentiation", "pairComparisons"],
        });
        return;
      }
      const key = `${a}-${b}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate pair (${a}, ${b}).`,
          path: ["pairwiseDifferentiation", "pairComparisons"],
        });
        return;
      }
      seen.add(key);
    }
    if (
      data.pairwiseDifferentiation.strongestRouteIndex >= n ||
      data.pairwiseDifferentiation.weakestRouteIndex >= n
    ) {
      ctx.addIssue({
        code: "custom",
        message: "strongestRouteIndex and weakestRouteIndex must reference existing routes.",
        path: ["pairwiseDifferentiation"],
      });
    }
  });

export const strategyArtifactSchema = z.object({
  objective: z.string().min(1),
  audience: z.string().min(1),
  insight: z.string().min(1),
  proposition: z.string().min(1),
  messagePillars: z.array(z.string().min(1)).min(1).max(8),
  /** North star: one idea, tension, and visual spine for the whole campaign. */
  campaignCore: campaignCoreSchema,
  /** Strategic angles explicitly tied to Creative Canon framework ids (from selection). */
  strategicAngles: z
    .array(
      z.object({
        frameworkId: z.string().min(1),
        angle: z.string().min(1),
        /** Creative Selection Engine — primary angle for downstream work. */
        isSelectedPrimary: z.boolean().optional(),
        isAlternate: z.boolean().optional(),
      }),
    )
    .length(3),
});

export const conceptSubSchema = z.object({
  /** Stable route id for judging / selection (or assigned server-side). */
  conceptId: z.string().min(1).optional(),
  frameworkId: z.string().min(1),
  conceptName: z.string().min(1),
  hook: z.string().min(1),
  rationale: z.string().min(1),
  visualDirection: z.string().min(1),
  /** Ties the route to Brand OS / positioning (not generic praise). */
  whyItWorksForBrand: z.string().min(1),
  /** One sharp line: why this idea is distinctive vs category wallpaper (not a paraphrase of hook alone). */
  distinctivenessVsCategory: z.string().min(40),
  coreTension: z.string().min(35),
  emotionalCenter: z.string().min(28),
  whyBeatsCategoryNorm: z.string().min(40),
  whyCouldFail: z.string().min(30),
  distinctVisualWorld: z.string().min(45),
  /** Set after Creative Director Judge — winner only. */
  isSelected: z.boolean().optional(),
  /** Set after Creative Director Judge — runner-up surfaced in Studio (max 2). */
  isAlternate: z.boolean().optional(),
  /** Set after Creative Director Judge — low-scoring tail. */
  isRejected: z.boolean().optional(),
});

const maxConceptRoutes = 10;
const maxPairIndex = maxConceptRoutes - 1;

const conceptPairComparisonSchema = z
  .object({
    leftIndex: z.number().int().min(0).max(maxPairIndex),
    rightIndex: z.number().int().min(0).max(maxPairIndex),
    overlapNotes: z.string().min(30),
    howTheyDiffer: z.string().min(30),
    strongerConceptThisPair: z.enum(["left", "right", "tie"]),
  })
  .strict();

export const conceptPairwiseDifferentiationSchema = z
  .object({
    pairComparisons: z
      .array(conceptPairComparisonSchema)
      .min(1)
      .max((maxConceptRoutes * (maxConceptRoutes - 1)) / 2),
    aggregateOverlap: z.string().min(40),
    strongestConceptIndex: z.number().int().min(0).max(maxPairIndex),
    differentiationSummary: z.string().min(80),
  })
  .strict();

export const conceptArtifactSchema = z
  .object({
    /** Human-readable summary of how frameworks were applied (e.g. "Three routes: Transformation, Contrast, Cultural"). */
    frameworkUsed: z.string().min(1),
    concepts: z.array(conceptSubSchema).min(3).max(maxConceptRoutes),
    /** Pairwise A vs B (…): overlap, difference, which is stronger per pair. */
    pairwiseDifferentiation: conceptPairwiseDifferentiationSchema,
  })
  .superRefine((data, ctx) => {
    const n = data.concepts.length;
    const need = (n * (n - 1)) / 2;
    const pairs = data.pairwiseDifferentiation.pairComparisons;
    if (pairs.length !== need) {
      ctx.addIssue({
        code: "custom",
        message: `pairwiseDifferentiation.pairComparisons must have exactly ${need} entries for ${n} concepts.`,
        path: ["pairwiseDifferentiation", "pairComparisons"],
      });
    }
    const fwIds = data.concepts.map((c) => c.frameworkId.trim());
    const uniqFw = new Set(fwIds);
    if (uniqFw.size !== fwIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Each concept must use a distinct Creative Canon frameworkId (no duplicates).",
        path: ["concepts"],
      });
    }
    const seen = new Set<string>();
    for (const p of pairs) {
      if (p.leftIndex === p.rightIndex) {
        ctx.addIssue({
          code: "custom",
          message: "Pair cannot compare a concept to itself.",
          path: ["pairwiseDifferentiation", "pairComparisons"],
        });
        return;
      }
      const a = Math.min(p.leftIndex, p.rightIndex);
      const b = Math.max(p.leftIndex, p.rightIndex);
      if (a < 0 || b >= n) {
        ctx.addIssue({
          code: "custom",
          message: `Pair indices must be within 0..${n - 1}.`,
          path: ["pairwiseDifferentiation", "pairComparisons"],
        });
        return;
      }
      const key = `${a}-${b}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate pair (${a}, ${b}).`,
          path: ["pairwiseDifferentiation", "pairComparisons"],
        });
        return;
      }
      seen.add(key);
    }
    if (data.pairwiseDifferentiation.strongestConceptIndex >= n) {
      ctx.addIssue({
        code: "custom",
        message: "strongestConceptIndex must reference an existing concept.",
        path: ["pairwiseDifferentiation", "strongestConceptIndex"],
      });
    }
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
  /** What real-world campaign / photography genre to emulate (e.g. "QSR appetite macro, handheld daylight"). */
  referenceIntent: z.string().max(2000).optional(),
  /** Short hints for reference matching and prompts (e.g. "shallow DOF", "practicals only"). */
  referenceStyleHints: z.array(z.string().min(1)).max(16).optional(),
});

export const copyArtifactSchema = z.object({
  /** Primary framework id from the concept route being executed (must match a Canon id when applicable). */
  frameworkUsed: z.string().min(1),
  headlineOptions: z.array(z.string().min(1)).min(5).max(8),
  bodyCopyOptions: z.array(z.string().min(1)).min(3).max(6),
  ctaOptions: z.array(z.string().min(1)).min(2).max(4),
});

export const reviewReportArtifactSchema = z.object({
  scoreSummary: z.string().min(1),
  verdict: z.string().min(1),
  issues: z.array(z.string()).max(20),
  recommendations: z.array(z.string().min(1)).max(12),
  /** Campaign Core (from STRATEGY): one-idea coherence across concept, copy, visual. */
  narrativeCoherence: z.enum(["ALIGNED", "MIXED", "DRIFT"]),
  toneCoherence: z.enum(["ALIGNED", "MIXED", "DRIFT"]),
  visualCoherence: z.enum(["ALIGNED", "MIXED", "DRIFT"]),
  campaignCoreAlignmentNotes: z.string().min(40),
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
  /** Brand Creative DNA audit — generic / interchangeable work should be WEAK + FAIL rhythm. */
  toneDistinctiveness: z.enum(["STRONG", "MIXED", "WEAK"]),
  rhythmCompliance: z.enum(["PASS", "WARN", "FAIL"]),
  signatureDeviceUsage: z.enum(["PRESENT", "ABSENT"]),
  culturalAlignment: z.enum(["STRONG", "MIXED", "WEAK"]),
  regenerationRecommended: z.boolean(),
  regenerationReasons: z.array(z.string()).max(10),
  /** Harsh creative bar — each must be substantive (pass/fail reasoning). */
  technicallyCorrectButCreativelySafe: z.string().min(40),
  frameworkNamedButNotExpressed: z.string().min(40),
  categoryClicheRisk: z.string().min(40),
  polishedButNotMemorable: z.string().min(40),
  visualDistinctivenessAudit: z.string().min(40),
  identityOwnabilityAudit: z.string().min(40),
  /** Overall: FAILS_BAR and MARGINAL imply founder should treat work as not ship-ready. */
  creativeBarVerdict: z.enum(["CLEARS_BAR", "MARGINAL", "FAILS_BAR"]),
  /** Required comparisons — name concept route, headline #, identity route index, or section. */
  comparisonRankings: z
    .object({
      strongestOutput: z.string().min(12),
      weakestOutput: z.string().min(12),
      mostGeneric: z.string().min(12),
      mostOnBrand: z.string().min(12),
    })
    .strict(),
});

export type StrategyArtifact = z.infer<typeof strategyArtifactSchema>;
export type IdentityStrategyArtifact = z.infer<typeof identityStrategyArtifactSchema>;
export type IdentityRouteVariant = z.infer<typeof identityRouteSubSchema>;
export type IdentityRoutesPackArtifact = z.infer<typeof identityRoutesPackArtifactSchema>;
export type ConceptArtifact = z.infer<typeof conceptArtifactSchema>;
export type ConceptVariant = z.infer<typeof conceptSubSchema>;
export type VisualSpecArtifact = z.infer<typeof visualSpecArtifactSchema>;
export type VisualPromptPackageArtifact = z.infer<
  typeof visualPromptPackageArtifactSchema
>;
export type CopyArtifact = z.infer<typeof copyArtifactSchema>;
export type ReviewReportArtifact = z.infer<typeof reviewReportArtifactSchema>;

/** For LLM repair prompts — exact keys and constraints. */
export const ARTIFACT_SHAPE_HINTS = {
  IDENTITY_STRATEGY: `{
  "brandCoreIdea": string (min ~40 chars — single-minded idea the identity must encode),
  "symbolicTerritories": string[] (min 2, max 8) — metaphor / cultural / category spaces to own,
  "identityArchetypes": string[] (min 2, max 6) — Jungian or brand-archetype language tied to strategy,
  "semanticDirections": string[] (min 2, max 8) — what the brand should "mean" before form,
  "visualTensions": string[] (min 1, max 6) — productive oppositions (e.g. precision vs warmth),
  "whatTheIdentityMustSignal": string[] (min 2, max 10),
  "whatTheIdentityMustAvoid": string[] (min 2, max 12) — clichés, category defaults, AI-slop tropes,
  "explorationHooks": optional string[] — concrete system notes for future mark/logo work (not final prompts)
}`,
  IDENTITY_ROUTES_PACK: `{
  "frameworkUsed": string,
  "routes": array (min 3, max 5) — each route includes coreTension, emotionalCenter, whyBeatsCategoryNorm, whyCouldFail, distinctVisualWorld plus existing fields,
  "routeDifferentiationSummary": string (min ~60),
  "pairwiseDifferentiation": {
    "pairComparisons": array — EXACTLY one entry per unordered pair (i,j) i<j; each: leftIndex, rightIndex, overlapNotes, howTheyDiffer, strongerRouteThisPair "left"|"right"|"tie",
    "aggregateOverlap", "strongestRouteIndex", "weakestRouteIndex", "differentiationSummary"
  },
  "logoExplorationReadiness": optional
}`,
  STRATEGY: `{
  "objective": string,
  "audience": string,
  "insight": string,
  "proposition": string,
  "messagePillars": string[] (min 1, max 8),
  "campaignCore": { "singleLineIdea", "emotionalTension", "visualNarrative" } — one campaign spine for all downstream stages,
  "strategicAngles": { "frameworkId": string, "angle": string }[] (exactly 3) — each frameworkId must match a provided Creative Canon id
}`,
  CONCEPT: `{
  "frameworkUsed": string,
  "concepts": array (min 3, max 10) of { optional conceptId, frameworkId (unique per pack), conceptName, hook, rationale, distinctivenessVsCategory, visualDirection, whyItWorksForBrand, coreTension, emotionalCenter, whyBeatsCategoryNorm, whyCouldFail, distinctVisualWorld, optional isSelected, isAlternate, isRejected },
  "pairwiseDifferentiation": { pairComparisons (exactly n*(n-1)/2 pairs for n concepts), aggregateOverlap, strongestConceptIndex, differentiationSummary },
  "_agenticforceSelection": optional { winnerConceptId, rejectedConceptIds, scores, rankedConceptIds, rejectionReasons }
}`,
  VISUAL_SPEC: `{
  "frameworkUsed": string (must be one of the provided Creative Canon ids — primary framework for this direction),
  "conceptName": string (chosen concept route name from upstream CONCEPT),
  "visualObjective": string (min ~40 chars — what the visual system must achieve),
  "whyItWorksForBrand": string (min ~40 — brand/OS-grounded, not generic praise),
  "mood", "emotionalTone", "composition", "colorDirection", "textureDirection", "lightingDirection", "typographyDirection", "imageStyle", "referenceLogic", "distinctivenessNotes": strings with substance; no empty "luxury" without concrete cues,
  "avoidList": string[] (min 2) — clichés, AI slop, off-brand tropes to exclude,
  "optionalPromptSeed": optional string — future image pipeline hook,
  "referenceIntent": optional string — real-world campaign / photography genre to emulate,
  "referenceStyleHints": optional string[] — e.g. shallow DOF, practicals-only, handheld
}`,
  COPY: `{
  "frameworkUsed": string,
  "headlineOptions": string[] (min 5, max 8),
  "bodyCopyOptions": string[] (min 1, max 6),
  "ctaOptions": string[] (min 1, max 6)
}`,
  CREATIVE_DIRECTOR_FINAL: `{
  "finalVerdict": "APPROVE" | "REWORK",
  "selectedVisualAssetId": string | null,
  "selectedCopyVariant": string,
  "rationale": string (min ~80 chars),
  "improvementDirectives": string[] (min 1, max 12)
}`,
  REVIEW_REPORT: `{
  "scoreSummary": string,
  "verdict": string,
  "issues": string[],
  "recommendations": string[],
  "narrativeCoherence": "ALIGNED" | "MIXED" | "DRIFT",
  "toneCoherence": "ALIGNED" | "MIXED" | "DRIFT",
  "visualCoherence": "ALIGNED" | "MIXED" | "DRIFT",
  "campaignCoreAlignmentNotes": string (min ~40),
  "frameworkAssessment": string,
  "frameworkExecution": "STRONG" | "MIXED" | "WEAK" | "NOT_APPLICABLE",
  "qualityVerdict": "STRONG" | "ACCEPTABLE" | "WEAK",
  "distinctivenessAssessment": string,
  "brandAlignmentAssessment": string,
  "toneAlignment": string (Brand OS: vocabulary, sentence style, emotion),
  "languageCompliance": "PASS" | "WARN" | "FAIL",
  "bannedPhraseViolations": string[] (banned + Language DNA NEVER + category clichés found in copy/concepts, or empty),
  "toneDistinctiveness": "STRONG" | "MIXED" | "WEAK" — could another brand run this after a name swap?,
  "rhythmCompliance": "PASS" | "WARN" | "FAIL" — vs Brand Creative DNA rhythmRules / flat cadence,
  "signatureDeviceUsage": "PRESENT" | "ABSENT" — visible use of signatureDevices / hook patterns,
  "culturalAlignment": "STRONG" | "MIXED" | "WEAK" — vs culturalCodes / taste,
  "regenerationRecommended": boolean,
  "regenerationReasons": string[],
  "technicallyCorrectButCreativelySafe": string (min ~40 — is it competent but cowardly?),
  "frameworkNamedButNotExpressed": string (min ~40 — label vs real structural execution),
  "categoryClicheRisk": string (min ~40 — too close to category default?),
  "polishedButNotMemorable": string (min ~40 — would anyone recall this tomorrow?),
  "visualDistinctivenessAudit": string (min ~40 — VISUAL_SPEC or N/A if absent),
  "identityOwnabilityAudit": string (min ~40 — identity routes / strategy or N/A),
  "creativeBarVerdict": "CLEARS_BAR" | "MARGINAL" | "FAILS_BAR",
  "comparisonRankings": { "strongestOutput", "weakestOutput", "mostGeneric", "mostOnBrand" } — each names a specific route/headline/section
}`,
} as const;

/** Human-readable keys the Brand Bible readiness check uses (aligned with DB fields). */
export const BRAND_BIBLE_REQUIRED_FIELDS = [
  "positioning",
  "targetAudience",
  "toneOfVoice",
  "messagingPillars",
] as const;
