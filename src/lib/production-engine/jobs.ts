import type { ProductionEngineInput, ProductionJob, VisualExecutionBundle } from "./types";

function jid(): string {
  return `pe-job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Job layer aligned with FAL routed executions (still PLANNED until subscribe).
 */
export function buildProductionJobs(
  input: ProductionEngineInput,
  visual: VisualExecutionBundle,
): ProductionJob[] {
  return visual.routedExecutions.map((r) => {
    const kind =
      r.route.kind === "IMAGE_EDIT" || r.route.kind === "LORA_IMAGE_EDIT"
        ? ("EDIT" as const)
        : r.route.kind === "SPECIALTY" && r.route.pathId.includes("upscale")
          ? ("UPSCALE" as const)
          : r.request.batchSize > 1
            ? ("VARIANT" as const)
            : ("GENERATE" as const);

    return {
      id: jid(),
      kind,
      label: `${r.target.targetType} (${r.target.id})`,
      falEndpointId: r.route.pathId,
      inputSummary: r.route.reasons.join(" · ").slice(0, 240),
      status: "PLANNED" as const,
    };
  });
}
