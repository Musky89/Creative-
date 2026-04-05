import type { WorkflowStage } from "@/generated/prisma/client";
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
