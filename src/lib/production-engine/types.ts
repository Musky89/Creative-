/**
 * Creative Production Engine — shared types (no platform/orchestrator imports).
 */

export const PRODUCTION_MODES = [
  "OOH",
  "SOCIAL",
  "PACKAGING",
  "RETAIL_POS",
  "IDENTITY",
  "ECOMMERCE_FASHION",
  "EXPORT_PRESENTATION",
] as const;

export type ProductionMode = (typeof PRODUCTION_MODES)[number];

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
};

export type ProductionPlanStep = {
  id: string;
  title: string;
  description: string;
  dependsOn?: string[];
};

export type ProductionPlan = {
  mode: ProductionMode;
  objective: string;
  steps: ProductionPlanStep[];
  deliverableHints: string[];
};

export type FalRouteDecision = {
  mode: ProductionMode;
  /** Logical endpoint id for future wiring — not invoked here. */
  primaryEndpointId: string;
  fallbackEndpointId?: string;
  reason: string;
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

export type CompositionLayer = {
  id: string;
  role: string;
  zIndex: number;
  source: "GENERATED" | "BRAND_ASSET" | "TEXT" | "SOLID";
  notes?: string;
};

export type CompositionPlan = {
  canvasAspect: string;
  safeAreaNotes: string;
  layers: CompositionLayer[];
};

export type ComposedArtifact = {
  id: string;
  format: "png" | "svg" | "pdf" | "markdown";
  description: string;
  /** Placeholder — real bytes/URLs wired at integration time. */
  placeholderUri?: string;
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
  plan: ProductionPlan;
  falRouting: FalRouteDecision;
  jobs: ProductionJob[];
  compositionPlan: CompositionPlan;
  composed: ComposedArtifact[];
  review: ReviewEvaluation;
  handoff: HandoffPackage;
};
