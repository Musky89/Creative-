import type { ProductionEngineInput, ReviewEvaluation } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";

/**
 * Lightweight deterministic checklist — no vision model.
 * When plan is provided, adds mode-config-driven checks from reviewFocus.
 */
export function evaluateProductionOutput(
  input: ProductionEngineInput,
  plan?: ProductionPlanDocument,
): ReviewEvaluation {
  const checklist: ReviewEvaluation["checklist"] = [
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

  if (plan) {
    checklist.push({
      id: "plan-export-targets",
      label: "Production plan lists export targets",
      ok: plan.exportTargets.length > 0,
    });
    checklist.push({
      id: "plan-review-focus",
      label: "Production plan defines review focus",
      ok: plan.reviewFocus.length > 0,
    });
    checklist.push({
      id: "plan-mode-constraints",
      label: "Mode constraints captured",
      ok: plan.modeConstraints.length > 0,
    });
  }

  const failed = checklist.filter((c) => !c.ok);
  const verdict =
    failed.length === 0 ? "PASS" : failed.length <= 2 ? ("WARN" as const) : ("FAIL" as const);
  return {
    verdict,
    checklist,
    summary:
      verdict === "PASS"
        ? "Inputs and production plan sufficient for stub handoff."
        : `Issues: ${failed.map((f) => f.id).join(", ")} — fix before production integration.`,
  };
}
