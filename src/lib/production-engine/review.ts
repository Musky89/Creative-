import type { ProductionEngineInput, ReviewEvaluation } from "./types";
import type { ProductionPlanDocument } from "./production-plan-schema";
import { socialBatchCount } from "./mode-ooh-social";

/**
 * Deterministic checklist + mode-specific review (OOH / SOCIAL).
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

  const modeReviewSummary: string[] = [];

  if (input.mode === "OOH" && plan) {
    const wordCount = input.selectedHeadline.trim().split(/\s+/).filter(Boolean).length;
    checklist.push({
      id: "ooh-text-economy",
      label: "OOH headline word economy (≤10 for on-compose)",
      ok: wordCount <= 10,
      note: wordCount > 10 ? "Composer truncates to 8 words — shorten for clarity." : undefined,
    });
    checklist.push({
      id: "ooh-supporting-offboard",
      label: "OOH supporting copy kept off-board",
      ok: true,
      note:
        input.supportingCopy && input.supportingCopy.trim().length > 280
          ? "Long supporting copy — must not appear in FAL hero; platform type only headline+CTA."
          : undefined,
    });
    modeReviewSummary.push(
      "OOH review: distance readability — headline/CTA composed in platform layer, not in FAL raster.",
      "Hero dominance — plan enforces single focal + negative space budget.",
      "Clutter rejection — targets exclude social UI and fine in-image type.",
      "Handoff — exportDpiNote + wide canvas support print proofing.",
    );
  }

  if (input.mode === "PACKAGING" && plan) {
    checklist.push({
      id: "pack-no-fop-in-fal",
      label: "PACKAGING: plan forbids FOP text in FAL output",
      ok:
        plan.compositionIntent.includes("composer") &&
        plan.compositionIntent.includes("FAL"),
    });
    checklist.push({
      id: "pack-hierarchy",
      label: "PACKAGING: FOP hierarchy described",
      ok: plan.reviewFocus.some((r) => r.toLowerCase().includes("hierarchy")),
    });
    modeReviewSummary.push(
      "PACKAGING: shelf impact — brand + variant band + claims stack are composer-driven.",
      "PACKAGING: FAL targets are ingredient, texture, product-without-label-copy only.",
      "PACKAGING: review variant discrimination + legal strip reservation.",
    );
  }

  if (input.mode === "RETAIL_POS" && plan) {
    checklist.push({
      id: "retail-not-social",
      label: "RETAIL_POS: signage logic (not feed ad)",
      ok: plan.modeConstraints.some(
        (c) => c.includes("signage") || c.includes("shelf"),
      ),
    });
    checklist.push({
      id: "retail-offer-compose",
      label: "RETAIL_POS: offer/price in platform compose",
      ok: plan.reviewFocus.some((r) => r.includes("offer") || r.includes("promo")),
    });
    modeReviewSummary.push(
      "RETAIL_POS: promo board hierarchy — headline, offer line, product window, urgency strip.",
      "RETAIL_POS: FAL avoids baked price; numerals belong in compose bands.",
    );
  }

  if (input.mode === "SOCIAL" && plan) {
    const n = socialBatchCount(input.socialBatchPreset);
    checklist.push({
      id: "social-batch",
      label: `SOCIAL batch configured (${n} slots)`,
      ok: n >= 1,
    });
    checklist.push({
      id: "social-families",
      label: "SOCIAL multi-slot uses content family rotation",
      ok: true,
      note:
        n > 1
          ? "Families rotate PRODUCT_HERO → LIFESTYLE → STATEMENT → OFFER → TEXT_LED for non-clone variety."
          : "Single post — pick layout via archetype / family in compose.",
    });
    modeReviewSummary.push(
      "SOCIAL review: coherence — shared campaign DNA + recurring motif rule in production plan.",
      "Non-repetition — alternating families + lighting hints per slot index.",
      "Scroll-stop — contrast alternation across batch in generation targets.",
      "Variety within system — FAL routes differ by family (text-led vs lifestyle+LoRA).",
    );
  }

  const failed = checklist.filter((c) => !c.ok);
  const verdict =
    failed.length === 0 ? "PASS" : failed.length <= 2 ? ("WARN" as const) : ("FAIL" as const);
  return {
    verdict,
    checklist,
    summary:
      verdict === "PASS"
        ? "Inputs and production plan sufficient for handoff."
        : `Issues: ${failed.map((f) => f.id).join(", ")} — fix before production integration.`,
    modeReviewSummary:
      modeReviewSummary.length > 0 ? modeReviewSummary : undefined,
  };
}
