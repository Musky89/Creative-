import type { ProductionEngineInput, ReviewEvaluation } from "./types";

/**
 * Lightweight deterministic checklist — no vision model.
 */
export function evaluateProductionOutput(input: ProductionEngineInput): ReviewEvaluation {
  const checklist = [
    {
      id: "headline",
      label: "Headline present",
      ok: input.selectedHeadline.trim().length >= 3,
    },
    {
      id: "cta",
      label: "CTA present",
      ok: input.selectedCta.trim().length >= 2,
    },
    {
      id: "visual",
      label: "Visual direction substantive",
      ok: input.visualDirection.trim().length >= 20,
    },
    {
      id: "brand",
      label: "Brand rules summarized",
      ok: input.brandRulesSummary.trim().length >= 10,
    },
    {
      id: "refs",
      label: "At least one reference summary",
      ok: input.referenceSummaries.some((r) => r.trim().length > 0),
    },
  ];
  const failed = checklist.filter((c) => !c.ok);
  const verdict =
    failed.length === 0 ? "PASS" : failed.length <= 2 ? ("WARN" as const) : ("FAIL" as const);
  return {
    verdict,
    checklist,
    summary:
      verdict === "PASS"
        ? "Inputs sufficient for stub handoff."
        : `Issues: ${failed.map((f) => f.id).join(", ")} — fix before production integration.`,
  };
}
