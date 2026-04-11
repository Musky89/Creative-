/**
 * Smoke: social platform canvas + compose verification (no server).
 * Run: npx tsx scripts/smoke-production-quality.ts
 */

import {
  buildCompositionPlanDocument,
  buildProductionPlan,
  resolveSocialCanvasDimensions,
  verifyComposedOutputContext,
  buildAllSocialVariants,
} from "../src/lib/production-engine";
import type { ProductionEngineInput } from "../src/lib/production-engine/types";

const base: ProductionEngineInput = {
  mode: "SOCIAL",
  briefSummary: "Test",
  selectedConcept: { conceptName: "C" },
  selectedHeadline: "Short headline",
  selectedCta: "Shop now",
  visualDirection: "Bold",
  referenceSummaries: [],
  brandRulesSummary: "Rules",
  socialOutputTarget: { kind: "showcase_master" },
};

const { document: planDoc } = buildProductionPlan(base);
const plan = buildCompositionPlanDocument(base, planDoc);
const variants = buildAllSocialVariants(base);

const v = verifyComposedOutputContext({ input: base, plan, socialVariants: variants });
if (!v.passed && v.checks.some((c) => !c.passed && c.id !== "social-family-coverage")) {
  console.error("Unexpected verification failure", v);
  process.exit(1);
}

const ig = resolveSocialCanvasDimensions({ kind: "platform", platformId: "instagram_story" });
if (ig.width !== 1080 || ig.height !== 1920) {
  console.error("Story dims wrong", ig);
  process.exit(1);
}

console.log("smoke-production-quality: ok", { canvas: `${plan.canvasWidth}×${plan.canvasHeight}`, ig });
