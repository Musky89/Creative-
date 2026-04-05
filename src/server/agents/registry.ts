import type { WorkflowStage } from "@/generated/prisma/client";
import { ARTIFACT_SHAPE_HINTS } from "@/lib/artifacts/contracts";
import { brandGuardianAgent } from "./brand-guardian";
import { copywriterAgent } from "./copywriter";
import { creativeDirectorAgent } from "./creative-director";
import { strategistAgent } from "./strategist";
import type { AgentDefinition } from "./types";
import type { z } from "zod";

const byStage: Record<
  WorkflowStage,
  AgentDefinition<z.ZodTypeAny> | undefined
> = {
  BRIEF_INTAKE: undefined,
  STRATEGY: strategistAgent,
  CONCEPTING: creativeDirectorAgent,
  COPY_DEVELOPMENT: copywriterAgent,
  REVIEW: brandGuardianAgent,
  EXPORT: undefined,
};

export function getAgentForStage(
  stage: WorkflowStage,
): AgentDefinition<z.ZodTypeAny> | null {
  return byStage[stage] ?? null;
}

export function getArtifactShapeHint(stage: WorkflowStage): string {
  switch (stage) {
    case "STRATEGY":
      return ARTIFACT_SHAPE_HINTS.STRATEGY;
    case "CONCEPTING":
      return ARTIFACT_SHAPE_HINTS.CONCEPT;
    case "COPY_DEVELOPMENT":
      return ARTIFACT_SHAPE_HINTS.COPY;
    case "REVIEW":
      return ARTIFACT_SHAPE_HINTS.REVIEW_REPORT;
    default:
      return "{}";
  }
}
