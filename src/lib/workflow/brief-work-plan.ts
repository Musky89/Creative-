import type { BriefEngagementType, Prisma } from "@/generated/prisma/client";
import type { V1PipelineRow } from "@/lib/workflow/pipeline-types";

/** Canonical workstream slugs — extend over time without breaking stored briefs. */
export const CREATIVE_WORKSTREAMS = [
  "STRATEGY",
  "CREATIVE_DIRECTION",
  "COPY",
  "ART_DIRECTION",
  "STATIC_VISUALS",
  "SOCIAL_CONTENT",
  "OOH_PRINT",
  "TVC_SCRIPTING",
  "STORYBOARDING",
  "PRODUCT_VISUALS",
  "BRAND_IDENTITY",
  "LOGO_EXPLORATION",
  "PRESENTATION_EXPORT",
  "FINAL_EXPORTS",
] as const;
export type CreativeWorkstreamId = (typeof CREATIVE_WORKSTREAMS)[number];

/** Agency-style deliverable keys — stored as strings; unknown values are ignored for gating but preserved. */
export const AGENCY_DELIVERABLE_KEYS = [
  "STRATEGIC_BRIEF",
  "CAMPAIGN_DIRECTION",
  "CONCEPT_ROUTES",
  "COPY_BANK",
  "HEADLINES",
  "CAPTIONS",
  "CTA_SET",
  "VISUAL_SPEC",
  "VISUAL_PROMPT_PACKAGE",
  "IMAGE_VARIANTS",
  "OOH_CONCEPT",
  "PRINT_AD_CONCEPT",
  "SOCIAL_POST_SET",
  "PRODUCT_HERO_VISUAL",
  "TVC_SCRIPT",
  "SCENE_BREAKDOWN",
  "STORYBOARD",
  "IDENTITY_STRATEGY",
  "IDENTITY_ROUTES",
  "LOGO_EXPLORATION_PACK",
  "EXPORT_PACK",
  "PRESENTATION_DECK",
] as const;
export type AgencyDeliverableKey = (typeof AGENCY_DELIVERABLE_KEYS)[number];

const DELIVERABLE_SET = new Set<string>(AGENCY_DELIVERABLE_KEYS);
const WORKSTREAM_SET = new Set<string>(CREATIVE_WORKSTREAMS);

function asStringArray(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.map((x) => String(x).trim()).filter(Boolean);
}

function hasAny(haystack: string[], needles: readonly string[]): boolean {
  const s = new Set(haystack.map((x) => x.toUpperCase()));
  return needles.some((n) => s.has(n));
}

export type BriefForWorkPlan = {
  engagementType: BriefEngagementType;
  workstreams: Prisma.JsonValue;
  deliverablesRequested: Prisma.JsonValue;
  identityWorkflowEnabled: boolean;
};

/** Normalize a DB brief row for pipeline + Studio resolution. */
export function briefRecordToWorkPlan(
  b: Pick<
    BriefForWorkPlan,
    "engagementType" | "workstreams" | "deliverablesRequested" | "identityWorkflowEnabled"
  >,
): BriefForWorkPlan {
  return {
    engagementType: b.engagementType,
    workstreams: b.workstreams,
    deliverablesRequested: b.deliverablesRequested,
    identityWorkflowEnabled: b.identityWorkflowEnabled,
  };
}

export type BriefWorkPlan = {
  engagementType: BriefEngagementType;
  workstreams: string[];
  deliverables: string[];
  /** Pipeline rows actually instantiated for this brief */
  rows: readonly V1PipelineRow[];
  showIdentityStudio: boolean;
  showCampaignCreative: boolean;
  showVisualDirectionStage: boolean;
  showImageGeneration: boolean;
  showCopyModule: boolean;
  showSocialModule: boolean;
  showOohPrintModule: boolean;
  showTvcModule: boolean;
  showExportModule: boolean;
  showPresentationModule: boolean;
};

const IDENTITY_DELIVERABLES = [
  "IDENTITY_STRATEGY",
  "IDENTITY_ROUTES",
  "LOGO_EXPLORATION_PACK",
] as const;
const COPY_DELIVERABLES = [
  "COPY_BANK",
  "HEADLINES",
  "CAPTIONS",
  "CTA_SET",
  "SOCIAL_POST_SET",
] as const;
const VISUAL_STAGE_DELIVERABLES = [
  "VISUAL_SPEC",
  "VISUAL_PROMPT_PACKAGE",
  "IMAGE_VARIANTS",
  "PRODUCT_HERO_VISUAL",
  "OOH_CONCEPT",
  "PRINT_AD_CONCEPT",
] as const;
const IMAGE_GEN_DELIVERABLES = [
  "VISUAL_PROMPT_PACKAGE",
  "IMAGE_VARIANTS",
  "PRODUCT_HERO_VISUAL",
  "SOCIAL_POST_SET",
] as const;
const OOH_DELIVERABLES = ["OOH_CONCEPT", "PRINT_AD_CONCEPT"] as const;
const TVC_DELIVERABLES = ["TVC_SCRIPT", "SCENE_BREAKDOWN", "STORYBOARD"] as const;

/**
 * Resolves orchestration + Studio module visibility from brief fields.
 * Legacy briefs (empty workstreams / free-text deliverables) get full campaign pipeline for compatibility.
 */
export function resolveBriefWorkPlan(brief: BriefForWorkPlan): BriefWorkPlan {
  const rawWs = asStringArray(brief.workstreams);
  const workstreams = rawWs.filter((w) => WORKSTREAM_SET.has(w.toUpperCase())).map((w) => w.toUpperCase());
  const rawDel = asStringArray(brief.deliverablesRequested);
  const deliverablesKnown = rawDel.filter((d) => DELIVERABLE_SET.has(d.toUpperCase())).map((d) => d.toUpperCase());
  const deliverables = deliverablesKnown.length > 0 ? deliverablesKnown : rawDel.map((d) => d.toUpperCase());

  const legacyMode = workstreams.length === 0 && deliverablesKnown.length === 0 && rawDel.length > 0;
  const emptyPlan = workstreams.length === 0 && deliverablesKnown.length === 0 && rawDel.length === 0;

  const engagementType = brief.engagementType;

  const identityFromBriefFlag = brief.identityWorkflowEnabled;
  const identityFromPlan =
    hasAny(workstreams, ["BRAND_IDENTITY", "LOGO_EXPLORATION"]) ||
    hasAny(deliverables, [...IDENTITY_DELIVERABLES]);
  const identityFromEngagement = engagementType === "BRAND_IDENTITY";
  const showIdentityStudio =
    identityFromEngagement || identityFromBriefFlag || identityFromPlan;

  const creativeStrategyOnly = engagementType === "CREATIVE_STRATEGY_ONLY";

  let includeConcepting = true;
  if (creativeStrategyOnly) {
    includeConcepting =
      hasAny(deliverables, ["CONCEPT_ROUTES", "CAMPAIGN_DIRECTION"]) ||
      hasAny(workstreams, ["CREATIVE_DIRECTION"]);
  }

  let includeVisualDirection = true;
  if (creativeStrategyOnly && !legacyMode) {
    includeVisualDirection =
      hasAny(deliverables, [...VISUAL_STAGE_DELIVERABLES]) ||
      hasAny(workstreams, ["ART_DIRECTION", "STATIC_VISUALS", "PRODUCT_VISUALS", "OOH_PRINT"]);
  }
  if (emptyPlan && engagementType !== "CREATIVE_STRATEGY_ONLY") {
    includeVisualDirection = true;
  }

  let includeCopy = true;
  if (creativeStrategyOnly && !legacyMode) {
    includeCopy =
      hasAny(deliverables, [...COPY_DELIVERABLES]) || hasAny(workstreams, ["COPY", "SOCIAL_CONTENT"]);
  }
  if (emptyPlan && engagementType !== "CREATIVE_STRATEGY_ONLY") {
    includeCopy = true;
  }

  const includeReview = true;

  let includeExport = true;
  if (!emptyPlan && !legacyMode) {
    includeExport =
      hasAny(deliverables, ["EXPORT_PACK", "PRESENTATION_DECK", "STRATEGIC_BRIEF"]) ||
      hasAny(workstreams, ["FINAL_EXPORTS", "PRESENTATION_EXPORT"]) ||
      !creativeStrategyOnly;
  }
  if (creativeStrategyOnly && !hasAny(deliverables, ["EXPORT_PACK", "PRESENTATION_DECK"]) && !legacyMode) {
    includeExport = true;
  }

  let showImageGeneration = true;
  if (!emptyPlan || deliverablesKnown.length > 0) {
    showImageGeneration =
      hasAny(deliverables, [...IMAGE_GEN_DELIVERABLES]) ||
      hasAny(workstreams, ["STATIC_VISUALS", "PRODUCT_VISUALS", "SOCIAL_CONTENT"]);
  }
  if (creativeStrategyOnly && !legacyMode) {
    showImageGeneration =
      hasAny(deliverables, [...IMAGE_GEN_DELIVERABLES]) ||
      hasAny(workstreams, ["STATIC_VISUALS", "PRODUCT_VISUALS"]);
  }
  if (!includeVisualDirection) {
    showImageGeneration = false;
  }

  const rows: V1PipelineRow[] = [];
  const push = (r: V1PipelineRow) => rows.push(r);

  push({
    stage: "BRIEF_INTAKE",
    agentType: null,
    requiresReview: false,
    artifactType: "INTAKE_SUMMARY",
  });
  push({
    stage: "STRATEGY",
    agentType: "STRATEGIST",
    requiresReview: true,
    artifactType: "STRATEGY",
  });

  if (showIdentityStudio) {
    push({
      stage: "IDENTITY_STRATEGY",
      agentType: "IDENTITY_STRATEGIST",
      requiresReview: true,
      artifactType: "IDENTITY_STRATEGY",
    });
    push({
      stage: "IDENTITY_ROUTING",
      agentType: "IDENTITY_DIRECTOR",
      requiresReview: true,
      artifactType: "IDENTITY_ROUTES_PACK",
    });
  }

  if (includeConcepting) {
    push({
      stage: "CONCEPTING",
      agentType: "CREATIVE_DIRECTOR",
      requiresReview: true,
      artifactType: "CONCEPT",
    });
  }

  if (includeVisualDirection) {
    push({
      stage: "VISUAL_DIRECTION",
      agentType: "ART_DIRECTOR",
      requiresReview: true,
      artifactType: "VISUAL_SPEC",
    });
  }

  if (includeCopy) {
    push({
      stage: "COPY_DEVELOPMENT",
      agentType: "COPYWRITER",
      requiresReview: true,
      artifactType: "COPY",
    });
  }

  if (includeReview) {
    push({
      stage: "REVIEW",
      agentType: "BRAND_GUARDIAN",
      requiresReview: true,
      artifactType: "REVIEW_REPORT",
    });
  }

  if (includeExport) {
    push({
      stage: "EXPORT",
      agentType: null,
      requiresReview: false,
      artifactType: "EXPORT",
    });
  }

  const showCampaignCreative = includeConcepting || includeVisualDirection || includeCopy;
  const showSocialModule =
    hasAny(workstreams, ["SOCIAL_CONTENT"]) || hasAny(deliverables, ["SOCIAL_POST_SET", "CAPTIONS"]);
  const showOohPrintModule =
    hasAny(workstreams, ["OOH_PRINT"]) || hasAny(deliverables, [...OOH_DELIVERABLES]);
  const showTvcModule =
    hasAny(workstreams, ["TVC_SCRIPTING", "STORYBOARDING"]) ||
    hasAny(deliverables, [...TVC_DELIVERABLES]);
  const showPresentationModule =
    hasAny(workstreams, ["PRESENTATION_EXPORT"]) || hasAny(deliverables, ["PRESENTATION_DECK"]);
  const showExportModule =
    includeExport &&
    (hasAny(workstreams, ["FINAL_EXPORTS"]) ||
      hasAny(deliverables, ["EXPORT_PACK"]) ||
      emptyPlan ||
      legacyMode);

  return {
    engagementType,
    workstreams,
    deliverables: rawDel.length ? rawDel : deliverables,
    rows,
    showIdentityStudio,
    showCampaignCreative,
    showVisualDirectionStage: includeVisualDirection,
    showImageGeneration,
    showCopyModule: includeCopy,
    showSocialModule,
    showOohPrintModule,
    showTvcModule,
    showExportModule,
    showPresentationModule,
  };
}

export function stageOrderIndexInPlan(stage: V1PipelineRow["stage"], rows: readonly V1PipelineRow[]): number {
  const i = rows.findIndex((r) => r.stage === stage);
  if (i < 0) throw new Error(`Stage ${stage} not in brief pipeline`);
  return i;
}

export function getPipelineRowForStage(
  stage: V1PipelineRow["stage"],
  rows: readonly V1PipelineRow[],
): V1PipelineRow {
  const row = rows.find((r) => r.stage === stage);
  if (!row) throw new Error(`Unknown workflow stage for this brief: ${stage}`);
  return row;
}

export function getArtifactTypeForStudioStageInPlan(
  stage: V1PipelineRow["stage"],
  rows: readonly V1PipelineRow[],
): V1PipelineRow["artifactType"] | null {
  const row = rows.find((r) => r.stage === stage);
  return row?.artifactType ?? null;
}

export const ENGAGEMENT_TYPE_LABELS: Record<BriefEngagementType, string> = {
  CAMPAIGN: "Campaign",
  BRAND_IDENTITY: "Brand identity",
  CONTENT_SYSTEM: "Content system",
  PRODUCT_LAUNCH: "Product launch",
  ALWAYS_ON_SOCIAL: "Always-on social",
  RETAIL_PROMOTION: "Retail / promotion",
  EDITORIAL_PRINT: "Editorial / print",
  OOH: "Out-of-home",
  TVC_FILM: "TVC / film",
  CREATIVE_STRATEGY_ONLY: "Creative strategy only",
  CUSTOM: "Custom",
};
