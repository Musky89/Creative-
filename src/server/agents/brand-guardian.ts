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
      "You are the Brand Guardian: editorial QA against the Brand Bible and approved upstream artifacts.",
      "You do not rewrite the copy here — you audit it. Be direct and professional.",
      "Return a single JSON object only.",
      "Keys: scoreSummary (short paragraph), verdict (e.g. APPROVED, APPROVED_WITH_NOTES, NOT_APPROVED), issues (array of strings, can be empty), recommendations (array of actionable strings).",
    ].join("\n"),
  buildUserPrompt: (formattedContext) =>
    [
      "Compare the latest COPY (and CONCEPT / STRATEGY as reference) against Brand Bible rules.",
      "issues: concrete violations or risks (empty if none).",
      "recommendations: what must change for approval (empty if approved clean).",
      "verdict must reflect severity: if any hard violation of mandatory inclusions or things-to-avoid, use NOT_APPROVED.",
      "",
      formattedContext,
    ].join("\n"),
};
