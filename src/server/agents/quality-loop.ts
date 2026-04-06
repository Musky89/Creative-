import type { WorkflowStage } from "@/generated/prisma/client";
import type { BrandOperatingSystemContext } from "@/server/brand/brand-os-prompt";
import {
  deterministicConceptChecks,
  deterministicCopyChecks,
  deterministicIdentityRoutesChecks,
  deterministicIdentityStrategyChecks,
  deterministicStrategyChecks,
  deterministicVisualSpecChecks,
  mergeAntiGenericIssues,
  prePersistQualitySchema,
  type PrePersistQuality,
} from "@/lib/artifacts/quality-assessment";
import {
  mergeSpecificityEngineIssues,
  type SpecificityAnchorContext,
} from "@/lib/brand/specificity-engine";
import { formatBadOutputBlacklistForPrompt } from "@/lib/brand/bad-output-blacklist";
import { extractJsonObject } from "@/server/llm/extract-json";
import type { LlmProvider } from "@/server/llm/types";
import { summarizeZodError } from "./repair-json";

const QUALITY_SYSTEM = [
  `You are a senior creative director doing a FAST pre-review before work is shown to a founder.
Output a single JSON object only. No markdown.

You must judge whether the draft is specific and framework-grounded vs generic filler.
The user message includes Brand Operating System rules: treat **banned phrases** as hard failures (flag regeneration).
Also flag generic marketing clichés ("best in class", "innovative solution", "premium feel", vague superlatives without proof).
A **specificity engine** also runs deterministically: abstract words ("premium", "innovative") without concrete proof, missing visual execution detail, generic-any-brand claims, or weak anchoring to brief/brand — treat those as regeneration-worthy.
For VISUAL_DIRECTION / VISUAL_SPEC drafts: reject vague "luxury / cinematic / high-end" without concrete composition, color, light, texture, and typography specifics; demand brand-grounded art direction a human team could shoot or design.
For IDENTITY_STRATEGY: reject interchangeable symbolic fluff, trend-chasing aesthetics, and empty "modern/minimal" without strategic meaning.
For IDENTITY_ROUTING / IDENTITY_ROUTES_PACK: reject routes that are the same idea reworded; demand divergent mark types and executable typography/geometry logic (not final logo pixels).
Honor **Brand Creative DNA** and **taste engine** rules: voice principles, rhythm rules, signature devices, category differentiation, brand tension, Language DNA NEVER lines, and visual NEVER-looks-like where applicable.
For CONCEPTING / IDENTITY_ROUTING: penalize **variation masquerading as differentiation** — routes must differ in tension, visual world, and category edge; CONCEPTING expects **6–10** routes with **unique** frameworkIds and full **pairwiseDifferentiation** across all pairs.`,
  formatBadOutputBlacklistForPrompt(),
  `Fields:
- qualityVerdict: "STRONG" | "ACCEPTABLE" | "WEAK"
- frameworkExecution: "STRONG" | "MIXED" | "WEAK" — did the output visibly apply the Creative Canon frameworks (hooks/rationale/visuals or copy structure)?
- distinctivenessAssessment: one short paragraph (concepts: are routes different? copy: are headlines/body angles different?)
- brandAlignmentAssessment: one short paragraph vs Brand Bible / brief tone (or "Brand Bible not configured" if absent)
- regenerationRecommended: boolean — true if WEAK overall OR framework visibly not applied OR concepts too similar OR copy bland
- regenerationReasons: string array, max 6 items, concrete actionable bullets for the model to fix on retry

Be strict: generic marketing language, flat rhythm vs Brand OS rhythmRules, missing signature device usage when Creative DNA lists devices, interchangeable hooks, or vague rationale = regenerationRecommended true.`,
].join("\n\n");

export type QualityLoopStage =
  | "STRATEGY"
  | "IDENTITY_STRATEGY"
  | "IDENTITY_ROUTING"
  | "CONCEPTING"
  | "VISUAL_DIRECTION"
  | "COPY_DEVELOPMENT";

export function stageUsesQualityLoop(stage: WorkflowStage): stage is QualityLoopStage {
  return (
    stage === "STRATEGY" ||
    stage === "IDENTITY_STRATEGY" ||
    stage === "IDENTITY_ROUTING" ||
    stage === "CONCEPTING" ||
    stage === "VISUAL_DIRECTION" ||
    stage === "COPY_DEVELOPMENT"
  );
}

export async function assessPrePersistQuality(
  provider: LlmProvider,
  stage: QualityLoopStage,
  artifactJson: Record<string, unknown>,
  formattedContext: string,
  canonSection: string,
): Promise<PrePersistQuality> {
  const user = [
    "## Stage",
    stage,
    "",
    "## Creative Canon (expected to be applied)",
    canonSection.slice(0, 12_000),
    "",
    "## Draft artifact (JSON)",
    JSON.stringify(artifactJson, null, 2).slice(0, 14_000),
    "",
    "## Full context (brief, brand, upstream)",
    formattedContext.slice(0, 10_000),
  ].join("\n");

  const useJsonMode = provider.id === "openai";
  const res = await provider.complete(
    [
      { role: "system", content: QUALITY_SYSTEM },
      { role: "user", content: user },
    ],
    { maxTokens: 1024, jsonMode: useJsonMode },
  );

  const slice = extractJsonObject(res.text);
  const parsed: unknown = JSON.parse(slice);
  const v = prePersistQualitySchema.safeParse(parsed);
  if (!v.success) {
    return {
      qualityVerdict: "ACCEPTABLE",
      frameworkExecution: "MIXED",
      distinctivenessAssessment: "Quality model returned invalid JSON; skipped strict rejection.",
      brandAlignmentAssessment: summarizeZodError(v.error),
      regenerationRecommended: false,
      regenerationReasons: [],
    };
  }
  return v.data;
}

export function mergeDeterministicIssues(
  stage: QualityLoopStage,
  content: Record<string, unknown>,
  brandOsBannedPhrases: string[],
  specificityAnchors: SpecificityAnchorContext | null = null,
  operatingSystem: BrandOperatingSystemContext | null = null,
): { issues: string[]; recommend: boolean } {
  const creativeDna = operatingSystem
    ? {
        rhythmRules: operatingSystem.rhythmRules,
        signatureDevices: operatingSystem.signatureDevices,
        voicePrinciples: operatingSystem.voicePrinciples,
      }
    : null;
  const anti = mergeAntiGenericIssues(
    stage,
    content,
    brandOsBannedPhrases,
    creativeDna,
  );
  const spec = mergeSpecificityEngineIssues(stage, content, specificityAnchors);
  if (stage === "CONCEPTING") {
    const r = deterministicConceptChecks(content);
    const issues = [...anti.issues, ...spec.issues, ...r.issues];
    return {
      issues,
      recommend:
        anti.recommendRegeneration ||
        spec.recommendRegeneration ||
        r.recommendRegeneration,
    };
  }
  if (stage === "COPY_DEVELOPMENT") {
    const r = deterministicCopyChecks(content);
    const issues = [...anti.issues, ...spec.issues, ...r.issues];
    return {
      issues,
      recommend:
        anti.recommendRegeneration ||
        spec.recommendRegeneration ||
        r.recommendRegeneration,
    };
  }
  if (stage === "VISUAL_DIRECTION") {
    const r = deterministicVisualSpecChecks(content);
    const issues = [...anti.issues, ...spec.issues, ...r.issues];
    return {
      issues,
      recommend:
        anti.recommendRegeneration ||
        spec.recommendRegeneration ||
        r.recommendRegeneration,
    };
  }
  if (stage === "IDENTITY_STRATEGY") {
    const r = deterministicIdentityStrategyChecks(content);
    const issues = [...anti.issues, ...spec.issues, ...r.issues];
    return {
      issues,
      recommend:
        anti.recommendRegeneration ||
        spec.recommendRegeneration ||
        r.recommendRegeneration,
    };
  }
  if (stage === "IDENTITY_ROUTING") {
    const r = deterministicIdentityRoutesChecks(content);
    const issues = [...anti.issues, ...spec.issues, ...r.issues];
    return {
      issues,
      recommend:
        anti.recommendRegeneration ||
        spec.recommendRegeneration ||
        r.recommendRegeneration,
    };
  }
  const r = deterministicStrategyChecks(content);
  const issues = [...anti.issues, ...spec.issues, ...r.issues];
  return {
    issues,
    recommend:
      anti.recommendRegeneration ||
      spec.recommendRegeneration ||
      r.recommendRegeneration,
  };
}

export function shouldRegenerate(
  llm: PrePersistQuality,
  deterministicRecommend: boolean,
): boolean {
  if (deterministicRecommend) return true;
  if (llm.regenerationRecommended) return true;
  if (llm.qualityVerdict === "WEAK") return true;
  if (llm.frameworkExecution === "WEAK") return true;
  return false;
}

export function buildRegenerationUserPrompt(args: {
  stage: QualityLoopStage;
  formattedContext: string;
  canonSection: string;
  previousArtifact: Record<string, unknown>;
  critique: string;
  mustPreserve: string;
}): string {
  return [
    "## REGENERATION PASS (mandatory)",
    "Your previous output was structurally valid but failed creative quality bar.",
    "Produce a NEW full artifact JSON of the SAME schema as the original agent for this stage.",
    "Apply the critique aggressively. Do not repeat generic phrasing from the draft.",
    formatBadOutputBlacklistForPrompt(),
    "",
    "### What must improve",
    args.critique,
    "",
    "### What must stay fixed",
    args.mustPreserve,
    "",
    "## Creative Canon (still mandatory)",
    args.canonSection,
    "",
    "## Context",
    args.formattedContext,
    "",
    "## Previous draft (do not copy; surpass it)",
    JSON.stringify(args.previousArtifact, null, 2).slice(0, 12_000),
  ].join("\n\n");
}
