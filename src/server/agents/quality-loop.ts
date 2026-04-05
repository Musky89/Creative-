import type { WorkflowStage } from "@/generated/prisma/client";
import {
  deterministicConceptChecks,
  deterministicCopyChecks,
  deterministicStrategyChecks,
  mergeAntiGenericIssues,
  prePersistQualitySchema,
  type PrePersistQuality,
} from "@/lib/artifacts/quality-assessment";
import { extractJsonObject } from "@/server/llm/extract-json";
import type { LlmProvider } from "@/server/llm/types";
import { summarizeZodError } from "./repair-json";

const QUALITY_SYSTEM = `You are a senior creative director doing a FAST pre-review before work is shown to a founder.
Output a single JSON object only. No markdown.

You must judge whether the draft is specific and framework-grounded vs generic filler.
The user message includes Brand Operating System rules: treat **banned phrases** as hard failures (flag regeneration).
Also flag generic marketing clichés ("best in class", "innovative solution", "premium feel", vague superlatives without proof).

Fields:
- qualityVerdict: "STRONG" | "ACCEPTABLE" | "WEAK"
- frameworkExecution: "STRONG" | "MIXED" | "WEAK" — did the output visibly apply the Creative Canon frameworks (hooks/rationale/visuals or copy structure)?
- distinctivenessAssessment: one short paragraph (concepts: are routes different? copy: are headlines/body angles different?)
- brandAlignmentAssessment: one short paragraph vs Brand Bible / brief tone (or "Brand Bible not configured" if absent)
- regenerationRecommended: boolean — true if WEAK overall OR framework visibly not applied OR concepts too similar OR copy bland
- regenerationReasons: string array, max 6 items, concrete actionable bullets for the model to fix on retry

Be strict: generic marketing language, interchangeable hooks, or vague rationale = regenerationRecommended true.`;

export type QualityLoopStage = "STRATEGY" | "CONCEPTING" | "COPY_DEVELOPMENT";

export function stageUsesQualityLoop(stage: WorkflowStage): stage is QualityLoopStage {
  return stage === "STRATEGY" || stage === "CONCEPTING" || stage === "COPY_DEVELOPMENT";
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
): { issues: string[]; recommend: boolean } {
  const anti = mergeAntiGenericIssues(stage, content, brandOsBannedPhrases);
  if (stage === "CONCEPTING") {
    const r = deterministicConceptChecks(content);
    const issues = [...anti.issues, ...r.issues];
    return {
      issues,
      recommend: anti.recommendRegeneration || r.recommendRegeneration,
    };
  }
  if (stage === "COPY_DEVELOPMENT") {
    const r = deterministicCopyChecks(content);
    const issues = [...anti.issues, ...r.issues];
    return {
      issues,
      recommend: anti.recommendRegeneration || r.recommendRegeneration,
    };
  }
  const r = deterministicStrategyChecks(content);
  const issues = [...anti.issues, ...r.issues];
  return {
    issues,
    recommend: anti.recommendRegeneration || r.recommendRegeneration,
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
