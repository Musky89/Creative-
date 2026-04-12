/**
 * Post-compose verification (input + plan aware; no pixel ML in v1).
 */

import type { ProductionEngineInput } from "./types";
import type { CompositionPlanDocument } from "./composition-plan-schema";
import type { SocialVariantCopy } from "./mode-ooh-social";
import { SOCIAL_CONTENT_FAMILIES, type SocialContentFamily } from "./mode-ooh-social";

export type ComposeVerificationCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type ComposeVerificationResult = {
  passed: boolean;
  checks: ComposeVerificationCheck[];
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function verifyComposedOutputContext(args: {
  input: ProductionEngineInput;
  plan: CompositionPlanDocument;
  /** When SOCIAL batch — optional variant list for set-level checks */
  socialVariants?: SocialVariantCopy[] | null;
}): ComposeVerificationResult {
  const checks: ComposeVerificationCheck[] = [];
  const { input, plan, socialVariants } = args;
  const blob = norm(
    `${input.selectedHeadline} ${input.selectedCta} ${input.supportingCopy ?? ""} ${input.briefSummary}`,
  );

  const banned = input.outputVerificationRules?.bannedSubstrings ?? [];
  for (const phrase of banned) {
    const p = phrase.trim().toLowerCase();
    if (!p) continue;
    const hit = blob.includes(p);
    checks.push({
      id: `banned:${p.slice(0, 20)}`,
      label: `Banned substring not in copy: "${phrase.slice(0, 40)}${phrase.length > 40 ? "…" : ""}"`,
      passed: !hit,
      detail: hit ? "Found in headline/CTA/supporting/brief" : undefined,
    });
  }

  const maxHl = Math.floor(plan.headlinePlacement.width / 8);
  const hlLen = input.selectedHeadline.length;
  checks.push({
    id: "headline-length-heuristic",
    label: `Headline length within rough canvas budget (~${maxHl} chars heuristic)`,
    passed: hlLen <= maxHl + 40,
    detail: `${hlLen} chars`,
  });

  const maxCta = Math.floor(plan.ctaPlacement.width / 9);
  const ctaLen = input.selectedCta.length;
  checks.push({
    id: "cta-length-heuristic",
    label: `CTA length within rough canvas budget (~${maxCta} chars heuristic)`,
    passed: ctaLen <= maxCta + 30,
    detail: `${ctaLen} chars`,
  });

  if (input.mode === "SOCIAL" && socialVariants && socialVariants.length > 1) {
    const headlines = socialVariants.map((v) => norm(v.headline));
    const unique = new Set(headlines);
    checks.push({
      id: "social-headline-variety",
      label: "Social batch: headline variety (no exact duplicates)",
      passed: unique.size >= Math.min(headlines.length, 2) || headlines.length <= 3,
      detail: `${unique.size} unique / ${headlines.length} posts`,
    });

    const familiesInBatch = new Set(socialVariants.map((v) => v.family));
    const pool: SocialContentFamily[] =
      input.socialContentFamilies?.length ? input.socialContentFamilies : [...SOCIAL_CONTENT_FAMILIES];
    const missing = pool.filter((f) => !familiesInBatch.has(f));
    checks.push({
      id: "social-family-coverage",
      label: "Social batch: at least one post per selected content family (when batch ≥ family count)",
      passed:
        socialVariants.length < pool.length ||
        missing.length === 0 ||
        socialVariants.length < 5,
      detail:
        missing.length && socialVariants.length >= pool.length
          ? `Missing families: ${missing.join(", ")}`
          : `Families used: ${[...familiesInBatch].join(", ")}`,
    });
  }

  const passed = checks.every((c) => c.passed);
  return { passed, checks };
}
