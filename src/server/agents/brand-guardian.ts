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
      "You are the Brand Guardian: editorial QA against the Brand Bible, strategy, and Creative Canon execution.",
      "You do not rewrite the copy — you audit it. Be direct and professional.",
      "Return a single JSON object only.",
      "Keys: scoreSummary, verdict, issues (array, can be empty), recommendations (array), frameworkAssessment (paragraph on whether declared frameworks are actually executed in concept + copy), frameworkExecution (STRONG | MIXED | WEAK | NOT_APPLICABLE).",
      "If concept declares frameworkIds but copy ignores that logic, frameworkExecution should be WEAK or MIXED with specifics in frameworkAssessment.",
    ].join("\n"),
  buildUserPrompt: (formattedContext, options) =>
    [
      options.canonUserSection,
      "",
      "Compare COPY to Brand Bible. Cross-check CONCEPT: each concept's frameworkId should be visible in hook/rationale/visualDirection.",
      "Check whether COPY's frameworkUsed (if present) matches the executed route and whether headlines/body reflect that framework's structure.",
      "issues: concrete violations or risks (empty if none).",
      "recommendations: actionable fixes (empty if approved clean).",
      "verdict: if hard violation of mandatory inclusions or things-to-avoid, use NOT_APPROVED.",
      "",
      formattedContext,
    ].join("\n"),
};
