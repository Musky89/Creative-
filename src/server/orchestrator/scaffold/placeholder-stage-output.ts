/**
 * TEMPORARY SCAFFOLD — NOT AI OUTPUT
 *
 * Deterministic placeholder JSON for each workflow stage so the orchestrator and API
 * can be tested end-to-end without agent integrations. Replace with real agent
 * services that return the same artifact shapes (or evolve them via migration).
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
        pillars: [
          "[Placeholder] Pillar 1",
          "[Placeholder] Pillar 2",
          "[Placeholder] Pillar 3",
        ],
      };
    case "CONCEPT":
      return {
        ...base,
        conceptName: "[Placeholder] Campaign concept name",
        hook: "[Placeholder] Primary hook / angle",
        rationale: "[Placeholder] Why this concept fits the strategy.",
        visualDirection: "[Placeholder] Visual mood and references.",
      };
    case "COPY":
      return {
        ...base,
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
