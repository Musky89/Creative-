/**
 * TEMPORARY SCAFFOLD — NOT AI OUTPUT
 *
 * Deterministic placeholder JSON aligned with Zod artifact contracts for offline / no-LLM runs.
 */

import type { ArtifactType, WorkflowStage } from "@/generated/prisma/client";
import type { Brief } from "@/generated/prisma/client";

const SCAFFOLD_MARKER = {
  _agenticforcePlaceholder: true,
  _message:
    "Structured placeholder generated for development only — not model output.",
} as const;

export type PlaceholderContext = {
  brief: Pick<
    Brief,
    | "id"
    | "title"
    | "businessObjective"
    | "communicationObjective"
    | "targetAudience"
    | "keyMessage"
  >;
};

export function buildPlaceholderArtifactContent(
  stage: WorkflowStage,
  artifactType: ArtifactType,
  ctx: PlaceholderContext,
): Record<string, unknown> {
  const base = { ...SCAFFOLD_MARKER, stage, artifactType, briefId: ctx.brief.id };

  switch (artifactType) {
    case "INTAKE_SUMMARY":
      return {
        ...base,
        summary: `Brief captured: ${ctx.brief.title}`,
        objectives: {
          business: ctx.brief.businessObjective,
          communication: ctx.brief.communicationObjective,
        },
        audience: ctx.brief.targetAudience,
        keyMessage: ctx.brief.keyMessage,
      };
    case "STRATEGY":
      return {
        ...base,
        objective: `[Placeholder] Strategic objective derived from: ${ctx.brief.title}`,
        audience: ctx.brief.targetAudience,
        insight: "[Placeholder] Audience tension / opportunity statement.",
        proposition: "[Placeholder] Single-minded proposition.",
        messagePillars: [
          "[Placeholder] Pillar 1",
          "[Placeholder] Pillar 2",
          "[Placeholder] Pillar 3",
        ],
        strategicAngles: [
          {
            frameworkId: "transformation",
            angle:
              "[Placeholder] Before/after arc for this brief (Canon: Transformation).",
          },
          {
            frameworkId: "problem-agitation",
            angle:
              "[Placeholder] Pain → stakes → relief structure (Canon: Problem Agitation).",
          },
        ],
      };
    case "CONCEPT":
      return {
        ...base,
        frameworkUsed:
          "[Placeholder] Two routes: Transformation + Problem Agitation (scaffold only).",
        concepts: [
          {
            frameworkId: "transformation",
            conceptName: "[Placeholder] Route A",
            hook: "[Placeholder] Before → after hook using transformation logic.",
            rationale: "[Placeholder] Why this fits the strategy.",
            visualDirection: "[Placeholder] Visual notes for Route A.",
            whyItWorksForBrand:
              "[Placeholder] How Route A reinforces positioning and Brand OS emotional register.",
          },
          {
            frameworkId: "problem-agitation",
            conceptName: "[Placeholder] Route B",
            hook: "[Placeholder] Pain-forward hook using agitation logic.",
            rationale: "[Placeholder] Why this fits the strategy.",
            visualDirection: "[Placeholder] Visual notes for Route B.",
            whyItWorksForBrand:
              "[Placeholder] How Route B reinforces positioning and Brand OS emotional register.",
          },
        ],
      };
    case "COPY":
      return {
        ...base,
        frameworkUsed: "transformation",
        headlineOptions: [
          "[Placeholder] Headline A",
          "[Placeholder] Headline B",
          "[Placeholder] Headline C",
        ],
        bodyCopyOptions: [
          "[Placeholder] Short body variant.",
          "[Placeholder] Long body variant.",
        ],
        ctaOptions: ["[Placeholder] CTA 1", "[Placeholder] CTA 2"],
      };
    case "REVIEW_REPORT":
      return {
        ...base,
        scoreSummary: "[Placeholder] Aggregate checklist / score summary",
        verdict: "[Placeholder] PASS_WITH_NOTES",
        issues: ["[Placeholder] Issue 1", "[Placeholder] Issue 2"],
        recommendations: [
          "[Placeholder] Recommendation 1",
          "[Placeholder] Recommendation 2",
        ],
        frameworkAssessment:
          "[Placeholder] Scaffold — framework execution not evaluated.",
        frameworkExecution: "NOT_APPLICABLE" as const,
        qualityVerdict: "ACCEPTABLE" as const,
        distinctivenessAssessment: "[Placeholder] Not evaluated in scaffold.",
        brandAlignmentAssessment: "[Placeholder] Not evaluated in scaffold.",
        toneAlignment: "[Placeholder] Brand OS tone vs draft — not evaluated in scaffold.",
        languageCompliance: "WARN" as const,
        bannedPhraseViolations: [],
        regenerationRecommended: false,
        regenerationReasons: [],
      };
    case "EXPORT":
      return {
        ...base,
        exportStatus: "PLACEHOLDER_READY",
        formats: ["markdown", "json"],
        metadata: {
          packageName: `${ctx.brief.title}-export-placeholder`,
          generatedAt: new Date().toISOString(),
        },
      };
    default:
      return {
        ...base,
        note: "Unknown artifact type for placeholder factory.",
      };
  }
}

export function buildPlaceholderAgentRunInput(
  ctx: PlaceholderContext,
  stage: WorkflowStage,
): Record<string, unknown> {
  return {
    ...SCAFFOLD_MARKER,
    kind: "orchestrator_scaffold_input",
    briefId: ctx.brief.id,
    stage,
  };
}
