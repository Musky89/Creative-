import type { AgentType, ArtifactType, WorkflowStage } from "@/generated/prisma/client";

/**
 * Canonical v1 linear pipeline: one task per stage, strict order.
 * System stages use agentType null (no AgentRun / agent role).
 */
export type V1PipelineRow = {
  stage: WorkflowStage;
  agentType: AgentType | null;
  requiresReview: boolean;
  /** Artifact type produced when this task completes (orchestrator / agents). */
  artifactType: ArtifactType;
};

/** Standard campaign / creative pipeline (no identity stages). */
export const V1_PIPELINE_STANDARD: readonly V1PipelineRow[] = [
  {
    stage: "BRIEF_INTAKE",
    agentType: null,
    requiresReview: false,
    artifactType: "INTAKE_SUMMARY",
  },
  {
    stage: "STRATEGY",
    agentType: "STRATEGIST",
    requiresReview: true,
    artifactType: "STRATEGY",
  },
  {
    stage: "CONCEPTING",
    agentType: "CREATIVE_DIRECTOR",
    requiresReview: true,
    artifactType: "CONCEPT",
  },
  {
    stage: "VISUAL_DIRECTION",
    agentType: "ART_DIRECTOR",
    requiresReview: true,
    artifactType: "VISUAL_SPEC",
  },
  {
    stage: "COPY_DEVELOPMENT",
    agentType: "COPYWRITER",
    requiresReview: true,
    artifactType: "COPY",
  },
  {
    stage: "REVIEW",
    agentType: "BRAND_GUARDIAN",
    requiresReview: true,
    artifactType: "REVIEW_REPORT",
  },
  {
    stage: "EXPORT",
    agentType: null,
    requiresReview: false,
    artifactType: "EXPORT",
  },
] as const;

/** New brand / identity path: symbolic strategy + route pack before campaign creative. */
const IDENTITY_INSERT: readonly V1PipelineRow[] = [
  {
    stage: "IDENTITY_STRATEGY",
    agentType: "IDENTITY_STRATEGIST",
    requiresReview: true,
    artifactType: "IDENTITY_STRATEGY",
  },
  {
    stage: "IDENTITY_ROUTING",
    agentType: "IDENTITY_DIRECTOR",
    requiresReview: true,
    artifactType: "IDENTITY_ROUTES_PACK",
  },
] as const;

export function buildV1PipelineRows(
  identityWorkflowEnabled: boolean,
): readonly V1PipelineRow[] {
  if (!identityWorkflowEnabled) {
    return V1_PIPELINE_STANDARD;
  }
  const head = V1_PIPELINE_STANDARD.slice(0, 2);
  const tail = V1_PIPELINE_STANDARD.slice(2);
  return [...head, ...IDENTITY_INSERT, ...tail] as const;
}

/** Default export for backward compatibility (standard pipeline). */
export const V1_PIPELINE = V1_PIPELINE_STANDARD;

export function stageOrderIndex(
  stage: WorkflowStage,
  identityWorkflowEnabled = false,
): number {
  const rows = buildV1PipelineRows(identityWorkflowEnabled);
  const i = rows.findIndex((r) => r.stage === stage);
  if (i < 0) {
    throw new Error(`Unknown workflow stage: ${stage}`);
  }
  return i;
}

export function getV1PipelineRow(
  stage: WorkflowStage,
  identityWorkflowEnabled = false,
): V1PipelineRow {
  const rows = buildV1PipelineRows(identityWorkflowEnabled);
  const row = rows.find((r) => r.stage === stage);
  if (!row) {
    throw new Error(`Unknown workflow stage: ${stage}`);
  }
  return row;
}

export function getArtifactTypeForStudioStage(
  stage: WorkflowStage,
): ArtifactType | null {
  const row =
    V1_PIPELINE_STANDARD.find((r) => r.stage === stage) ??
    IDENTITY_INSERT.find((r) => r.stage === stage);
  return row?.artifactType ?? null;
}
