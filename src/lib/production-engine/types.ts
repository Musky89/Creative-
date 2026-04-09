/**
 * Creative Production Engine — shared types (no platform/orchestrator imports).
 */

import type { ProductionPlanDocument } from "./production-plan-schema";
import type { ProductionMode } from "./modes";
import type { GenerationTarget } from "./generation-targets";
import type { QualityTier } from "./fal-contracts";
import type { RoutedFalExecution } from "./fal-contracts";
import type { CompositionPlanDocument } from "./composition-plan-schema";
import type { CompositionLayerManifestEntry } from "./composition-plan-schema";
import type { LayoutArchetype } from "./layout-archetypes";

export { PRODUCTION_MODES, type ProductionMode } from "./modes";

export type BrandAssetFonts = {
  family: string;
  weights?: string[];
  sourceNote?: string;
};

export type BrandAssetColors = {
  name?: string;
  hex: string;
  role?: string;
};

export type BrandAssetsInput = {
  logoUrl?: string;
  logoDescription?: string;
  fonts?: BrandAssetFonts[];
  colors?: BrandAssetColors[];
  otherAssetNotes?: string;
};

export type ProductionEngineInput = {
  mode: ProductionMode;
  briefSummary: string;
  campaignCore?: {
    singleLineIdea?: string;
    emotionalTension?: string;
    visualNarrative?: string;
  };
  selectedConcept: {
    conceptId?: string;
    conceptName: string;
    hook?: string;
    rationale?: string;
    visualDirection?: string;
  };
  selectedHeadline: string;
  selectedCta: string;
  supportingCopy?: string;
  visualDirection: string;
  visualSpecNotes?: string;
  referenceSummaries: string[];
  brandRulesSummary: string;
  brandOperatingSystemSummary?: string;
  brandAssets?: BrandAssetsInput;
  visualStyleRef?: string;
  modelRef?: string;
  /** FAL router quality tier (defaults to standard in pipeline if omitted). */
  visualQualityTier?: QualityTier;
  /** Override default layout archetype from mode. */
  layoutArchetype?: LayoutArchetype;
  /** Optional raster URLs for server compose (FAL output or stock). */
  heroImageUrl?: string;
  secondaryImageUrl?: string;
};

export type ProductionPlanStep = {
  id: string;
  title: string;
  description: string;
  dependsOn?: string[];
};

/** @deprecated Use ProductionPlanDocument + buildOperationalPlan from planning.ts */
export type ProductionPlan = {
  mode: ProductionMode;
  objective: string;
  steps: ProductionPlanStep[];
  deliverableHints: string[];
};

export type FalRouteDecision = {
  mode: ProductionMode;
  /** First routed path (legacy summary). */
  primaryEndpointId: string;
  fallbackEndpointId?: string;
  reason: string;
};

export type VisualExecutionBundle = {
  qualityTier: QualityTier;
  targets: GenerationTarget[];
  routedExecutions: RoutedFalExecution[];
};

export type ProductionJobKind = "GENERATE" | "EDIT" | "UPSCALE" | "VARIANT";

export type ProductionJob = {
  id: string;
  kind: ProductionJobKind;
  label: string;
  falEndpointId?: string;
  inputSummary: string;
  status: "PLANNED" | "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
};

/** @deprecated Legacy stub; use CompositionPlanDocument */
export type CompositionLayer = {
  id: string;
  role: string;
  zIndex: number;
  source: "GENERATED" | "BRAND_ASSET" | "TEXT" | "SOLID";
  notes?: string;
};

/** @deprecated Use CompositionPlanDocument */
export type CompositionPlan = {
  canvasAspect: string;
  safeAreaNotes: string;
  layers: CompositionLayer[];
};

export type ComposedArtifact = {
  id: string;
  format: "png" | "svg" | "pdf" | "markdown";
  description: string;
  placeholderUri?: string;
  /** Base64 PNG when server composer ran (API only). */
  dataBase64?: string;
};

export type ReviewVerdict = "PASS" | "WARN" | "FAIL";

export type ReviewEvaluation = {
  verdict: ReviewVerdict;
  checklist: { id: string; label: string; ok: boolean; note?: string }[];
  summary: string;
};

export type HandoffPackage = {
  mode: ProductionMode;
  bundleName: string;
  items: { path: string; description: string }[];
  readme: string;
};

export type ProductionEngineRunResult = {
  input: ProductionEngineInput;
  /** Schema-valid mode-aware production plan (shared + mode-specific fields). */
  productionPlan: ProductionPlanDocument;
  /** Execution checklist derived from plan + mode config. */
  operationalPlan: ProductionPlan;
  falRouting: FalRouteDecision;
  /** FAL-first visual layer: targets + per-target routes and stub contracts. */
  visualExecution: VisualExecutionBundle;
  jobs: ProductionJob[];
  /** Validated platform-owned layout plan. */
  compositionPlanDocument: CompositionPlanDocument;
  layerManifest: CompositionLayerManifestEntry[];
  assemblyExplanation: string[];
  composed: ComposedArtifact[];
  review: ReviewEvaluation;
  handoff: HandoffPackage;
};
