import type { ArtifactType, WorkflowStage } from "@/generated/prisma/client";
import type { BriefForWorkPlan } from "@/lib/workflow/brief-work-plan";
import { resolveBriefWorkPlan } from "@/lib/workflow/brief-work-plan";
import type { V1PipelineRow } from "@/lib/workflow/pipeline-types";

export type { V1PipelineRow } from "@/lib/workflow/pipeline-types";

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

/**
 * Full pipeline for a brief: engagement type, workstreams, deliverables, and legacy identity flag.
 */
export function buildV1PipelineRowsForBrief(brief: BriefForWorkPlan): readonly V1PipelineRow[] {
  return resolveBriefWorkPlan(brief).rows;
}

/**
 * Backward compatibility: same as a CAMPAIGN brief with empty workstreams/deliverables and optional identity insert (old model).
 */
export function buildV1PipelineRows(identityWorkflowEnabled: boolean): readonly V1PipelineRow[] {
  return buildV1PipelineRowsForBrief({
    engagementType: "CAMPAIGN",
    workstreams: [],
    deliverablesRequested: [],
    identityWorkflowEnabled,
  });
}

/** @deprecated Use buildV1PipelineRowsForBrief */
export const V1_PIPELINE = V1_PIPELINE_STANDARD;

export function stageOrderIndex(stage: WorkflowStage, brief: BriefForWorkPlan): number;
export function stageOrderIndex(stage: WorkflowStage, identityWorkflowEnabled: boolean): number;
export function stageOrderIndex(
  stage: WorkflowStage,
  briefOrFlag: BriefForWorkPlan | boolean,
): number {
  const rows =
    typeof briefOrFlag === "boolean"
      ? buildV1PipelineRows(briefOrFlag)
      : buildV1PipelineRowsForBrief(briefOrFlag);
  const i = rows.findIndex((r) => r.stage === stage);
  if (i < 0) {
    throw new Error(`Unknown workflow stage for this brief: ${stage}`);
  }
  return i;
}

export function getV1PipelineRow(stage: WorkflowStage, brief: BriefForWorkPlan): V1PipelineRow;
export function getV1PipelineRow(stage: WorkflowStage, identityWorkflowEnabled: boolean): V1PipelineRow;
export function getV1PipelineRow(
  stage: WorkflowStage,
  briefOrFlag: BriefForWorkPlan | boolean,
): V1PipelineRow {
  const rows =
    typeof briefOrFlag === "boolean"
      ? buildV1PipelineRows(briefOrFlag)
      : buildV1PipelineRowsForBrief(briefOrFlag);
  const row = rows.find((r) => r.stage === stage);
  if (!row) {
    throw new Error(`Unknown workflow stage for this brief: ${stage}`);
  }
  return row;
}

export function getArtifactTypeForStudioStage(
  stage: WorkflowStage,
  brief: BriefForWorkPlan,
): ArtifactType | null {
  const rows = buildV1PipelineRowsForBrief(brief);
  const row = rows.find((r) => r.stage === stage);
  return row?.artifactType ?? null;
}

/** When brief context unavailable (e.g. legacy callers), use standard + identity artifact map. */
export function getArtifactTypeForStudioStageLegacy(stage: WorkflowStage): ArtifactType | null {
  const row =
    V1_PIPELINE_STANDARD.find((r) => r.stage === stage) ??
    IDENTITY_INSERT.find((r) => r.stage === stage);
  return row?.artifactType ?? null;
}
