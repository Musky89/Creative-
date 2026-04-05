import { BRAND_OS_GUARDIAN_EXTRA, BRAND_OS_MANDATORY_RULES } from "./brand-os-instructions";
import type { AgentDefinition } from "./types";
import { reviewReportArtifactSchema } from "./schemas";

export const brandGuardianAgent: AgentDefinition<
  typeof reviewReportArtifactSchema
> = {
  name: "Brand Guardian",
  agentType: "BRAND_GUARDIAN",
  stage: "REVIEW",
  outputSchema: reviewReportArtifactSchema,
  buildSystemPrompt: () =>
    [
      "You are the Brand Guardian: editorial QA against the Brand Bible, Brand Operating System, strategy, Creative Canon execution, and **VISUAL_SPEC** (art direction) where present.",
      "You do not rewrite the copy — you audit it. Be direct and professional.",
      BRAND_OS_MANDATORY_RULES,
      BRAND_OS_GUARDIAN_EXTRA,
      "Return a single JSON object only.",
      "Keys: scoreSummary, verdict, issues (array, can be empty), recommendations (array),",
      "frameworkAssessment, frameworkExecution (STRONG | MIXED | WEAK | NOT_APPLICABLE),",
      "qualityVerdict (STRONG | ACCEPTABLE | WEAK), distinctivenessAssessment (paragraph: are concept routes or copy variants meaningfully different?),",
      "brandAlignmentAssessment (paragraph vs Brand Bible and brief tone),",
      "toneAlignment (paragraph: Brand OS vocabulary, sentence style, primary emotion vs the work),",
      "languageCompliance (PASS | WARN | FAIL — FAIL if any banned phrase appears in evaluated strings),",
      "bannedPhraseViolations (string array: exact substrings you found that match Brand OS banned list or obvious variants; empty if none),",
      "regenerationRecommended (boolean — true if you would send this back for another creative pass; note pre-persist regeneration may already have run),",
      "regenerationReasons (string array, concrete, max 8).",
      "If concept declares frameworkIds but copy ignores that logic, frameworkExecution should be WEAK or MIXED with specifics in frameworkAssessment.",
    ].join("\n"),
  buildUserPrompt: (formattedContext, options) =>
    [
      options.canonUserSection,
      "",
      "Compare COPY, CONCEPT, and VISUAL_SPEC (if in upstream) to Brand Bible and Brand Operating System.",
      "Cross-check VISUAL_SPEC: is art direction specific (composition, light, color, texture, type) vs generic “luxury/cinematic”? Does it align with Brand OS visual language?",
      "Cross-check CONCEPT: each concept's frameworkId should be visible in hook/rationale/visualDirection; whyItWorksForBrand should be substantive.",
      "Check whether COPY's frameworkUsed (if present) matches the executed route and whether headlines/body reflect that framework's structure.",
      "Scan for Brand OS **banned phrases** and generic marketing clichés; list hits in bannedPhraseViolations.",
      "issues: concrete violations or risks (empty if none).",
      "recommendations: actionable fixes (empty if approved clean).",
      "verdict: if hard violation of mandatory inclusions, things-to-avoid, or languageCompliance FAIL, use NOT_APPROVED.",
      "",
      formattedContext,
    ].join("\n"),
};
