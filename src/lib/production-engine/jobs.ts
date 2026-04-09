import type { ProductionEngineInput, ProductionJob } from "./types";
import { routeFalForProduction } from "./fal-routing";

function jid(): string {
  return `pe-job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Stub job layer — PLANNED jobs only.
 */
export function buildProductionJobs(input: ProductionEngineInput): ProductionJob[] {
  const route = routeFalForProduction(input);
  const jobs: ProductionJob[] = [
    {
      id: jid(),
      kind: "GENERATE",
      label: "Primary visual for mode",
      falEndpointId: route.primaryEndpointId,
      inputSummary: `Concept: ${input.selectedConcept.conceptName}; refs: ${input.referenceSummaries.length}`,
      status: "PLANNED",
    },
  ];
  if (input.brandAssets?.logoUrl) {
    jobs.push({
      id: jid(),
      kind: "EDIT",
      label: "Composite logo lockup",
      falEndpointId: route.fallbackEndpointId,
      inputSummary: "Logo URL provided — compose under safe area.",
      status: "PLANNED",
    });
  }
  jobs.push({
    id: jid(),
    kind: "VARIANT",
    label: "Alt crop / platform variant",
    inputSummary: "Secondary aspect for social/OOH parity (stub).",
    status: "PLANNED",
  });
  return jobs;
}
