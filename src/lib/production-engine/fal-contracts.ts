/**
 * Request/response contracts for fal jobs (queue/webhook-ready metadata).
 */

import type { ProductionMode } from "./modes";
import type { GenerationTarget } from "./generation-targets";
import type { FalPathKind } from "./fal-paths";

export type QualityTier = "draft" | "standard" | "high" | "premium";

export type FalPromptPackage = {
  positivePrompt: string;
  negativePrompt?: string;
  structuredNotes?: string;
};

export type FalExecutionRequest = {
  requestId: string;
  sourceTargetId: string;
  generationTarget: GenerationTarget;
  resolvedPath: {
    pathId: string;
    kind: FalPathKind;
  };
  promptPackage: FalPromptPackage;
  referenceImageUrls: string[];
  styleModelRef?: string;
  loraRef?: string;
  batchSize: number;
  executionMetadata: {
    qualityTier: QualityTier;
    productionMode: ProductionMode;
    /** Correlation for async queue / webhook (future). */
    correlationId: string;
    /** Hint for subscriber logs / polling key. */
    pollOrWebhookHint?: string;
    routerReasons: string[];
  };
};

export type FalAssetMetadata = {
  assetId: string;
  width?: number;
  height?: number;
  format?: string;
  uri?: string;
  seed?: number;
};

export type FalExecutionResponse = {
  requestId: string;
  sourceTargetId: string;
  falPathUsed: string;
  assets: FalAssetMetadata[];
  traceId: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  /** Vision / QA hooks — populated after eval pass in future. */
  evaluationPlaceholder?: {
    notes: string;
    scores?: Record<string, number>;
  };
};

export type RoutedFalExecution = {
  target: GenerationTarget;
  route: {
    pathId: string;
    kind: FalPathKind;
    reasons: string[];
    alternativesConsidered: string[];
  };
  request: FalExecutionRequest;
  /** Stub until fal.subscribe is wired; SKIPPED for composition-only. */
  response: FalExecutionResponse;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildFalExecutionRequest(args: {
  target: GenerationTarget;
  pathId: string;
  kind: FalPathKind;
  qualityTier: QualityTier;
  routerReasons: string[];
  referenceImageUrls?: string[];
}): FalExecutionRequest {
  const t = args.target;
  const correlationId = newId("pe-corr");
  const positive = [
    t.subjectIntent,
    t.compositionIntent,
    t.lightingIntent,
    t.backgroundIntent,
    `Realism: ${t.realismBias}.`,
    t.brandVisualConstraints,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    requestId: newId("pe-req"),
    sourceTargetId: t.id,
    generationTarget: t,
    resolvedPath: { pathId: args.pathId, kind: args.kind },
    promptPackage: {
      positivePrompt: positive.slice(0, 4000),
      negativePrompt: t.negativeRules.join(", ").slice(0, 1500),
      structuredNotes: `Refs: ${t.referenceSummary.slice(0, 500)}`,
    },
    referenceImageUrls: args.referenceImageUrls ?? [],
    styleModelRef: t.styleModelRef,
    loraRef: t.loraRef,
    batchSize: Math.max(1, t.desiredBatchSize),
    executionMetadata: {
      qualityTier: args.qualityTier,
      productionMode: t.productionMode,
      correlationId,
      pollOrWebhookHint: `poll:${correlationId}`,
      routerReasons: args.routerReasons,
    },
  };
}

export function buildStubFalResponse(req: FalExecutionRequest): FalExecutionResponse {
  if (req.resolvedPath.pathId === "internal/composition-only") {
    return {
      requestId: req.requestId,
      sourceTargetId: req.sourceTargetId,
      falPathUsed: req.resolvedPath.pathId,
      assets: [],
      traceId: newId("pe-trace"),
      status: "SKIPPED",
      evaluationPlaceholder: {
        notes: "No fal image call for composition-only path.",
      },
    };
  }
  return {
    requestId: req.requestId,
    sourceTargetId: req.sourceTargetId,
    falPathUsed: req.resolvedPath.pathId,
    assets: Array.from({ length: req.batchSize }, (_, i) => ({
      assetId: newId(`pe-asset-${i}`),
      format: "png",
      uri: `fal://stub/${req.resolvedPath.pathId}/${req.sourceTargetId}/${i}`,
    })),
    traceId: newId("pe-trace"),
    status: "QUEUED",
    evaluationPlaceholder: {
      notes: "Awaiting fal subscribe; placeholder for slop/brand QA scores.",
      scores: { placeholder: 0 },
    },
  };
}
