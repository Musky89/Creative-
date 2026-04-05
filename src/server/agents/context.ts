import type { Artifact, BrandBible, ServiceBlueprint } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { stageOrderIndex } from "@/server/orchestrator/v1-pipeline";
import type { WorkflowStage } from "@/generated/prisma/client";

export type UpstreamArtifactSummary = {
  stage: WorkflowStage;
  type: string;
  version: number;
  content: unknown;
};

/**
 * Purpose-built context for prompts — not a raw DB dump.
 */
export type TaskAgentContext = {
  clientName: string;
  clientIndustry: string;
  brief: {
    title: string;
    businessObjective: string;
    communicationObjective: string;
    targetAudience: string;
    keyMessage: string;
    tone: string;
    deliverablesSummary: string;
    constraintsSummary: string;
    deadlineIso: string;
  };
  brand: {
    positioning: string;
    targetAudience: string;
    toneOfVoice: string;
    messagingPillars: string[];
    mandatoryInclusions: string[];
    thingsToAvoid: string[];
    visualIdentityBullets: string[];
    channelGuidelinesBullets: string[];
  } | null;
  blueprint: {
    templateType: string;
    qualityThreshold: number;
    approvalRequired: boolean;
    activeServicesLines: string[];
  } | null;
  upstreamArtifacts: UpstreamArtifactSummary[];
};

function asStringArray(json: unknown, maxItems: number): string[] {
  if (!Array.isArray(json)) return [];
  return json
    .slice(0, maxItems)
    .map((x) => String(x).trim())
    .filter(Boolean);
}

export async function loadTaskAgentContext(taskId: string): Promise<{
  task: { id: string; briefId: string; stage: WorkflowStage; agentType: string | null };
  context: TaskAgentContext;
}> {
  const prisma = getPrisma();
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      brief: {
        include: {
          client: {
            include: {
              brandBible: true,
              serviceBlueprint: true,
            },
          },
        },
      },
    },
  });

  const brief = task.brief;
  const client = brief.client;

  const allTasks = await prisma.task.findMany({
    where: { briefId: brief.id },
    orderBy: { id: "asc" },
  });

  const currentOrder = stageOrderIndex(task.stage);
  const upstreamStages = allTasks.filter(
    (t) => stageOrderIndex(t.stage) < currentOrder,
  );
  const upstreamIds = upstreamStages.map((t) => t.id);

  const upstreamArtifactsDb =
    upstreamIds.length === 0
      ? []
      : await prisma.artifact.findMany({
          where: { taskId: { in: upstreamIds } },
          orderBy: [{ taskId: "asc" }, { version: "desc" }],
        });

  const latestByTaskId = new Map<string, Artifact>();
  for (const a of upstreamArtifactsDb) {
    if (!latestByTaskId.has(a.taskId)) {
      latestByTaskId.set(a.taskId, a);
    }
  }

  const upstreamArtifacts: UpstreamArtifactSummary[] = [];
  for (const st of upstreamStages) {
    const best = latestByTaskId.get(st.id);
    if (!best) continue;
    upstreamArtifacts.push({
      stage: st.stage,
      type: best.type,
      version: best.version,
      content: best.content,
    });
  }

  const bb: BrandBible | null = client.brandBible;
  const bp: ServiceBlueprint | null = client.serviceBlueprint;

  const context: TaskAgentContext = {
    clientName: client.name,
    clientIndustry: client.industry,
    brief: {
      title: brief.title,
      businessObjective: brief.businessObjective,
      communicationObjective: brief.communicationObjective,
      targetAudience: brief.targetAudience,
      keyMessage: brief.keyMessage,
      tone: brief.tone,
      deliverablesSummary: asStringArray(brief.deliverablesRequested, 12).join(
        "; ",
      ),
      constraintsSummary: asStringArray(brief.constraints, 12).join("; "),
      deadlineIso: brief.deadline.toISOString(),
    },
    brand: bb
      ? {
          positioning: bb.positioning,
          targetAudience: bb.targetAudience,
          toneOfVoice: bb.toneOfVoice,
          messagingPillars: asStringArray(bb.messagingPillars, 12),
          mandatoryInclusions: asStringArray(bb.mandatoryInclusions, 12),
          thingsToAvoid: asStringArray(bb.thingsToAvoid, 12),
          visualIdentityBullets: asStringArray(bb.visualIdentity, 12),
          channelGuidelinesBullets: asStringArray(bb.channelGuidelines, 12),
        }
      : null,
    blueprint: bp
      ? {
          templateType: bp.templateType,
          qualityThreshold: bp.qualityThreshold,
          approvalRequired: bp.approvalRequired,
          activeServicesLines: asStringArray(bp.activeServices, 20),
        }
      : null,
    upstreamArtifacts,
  };

  return {
    task: {
      id: task.id,
      briefId: task.briefId,
      stage: task.stage,
      agentType: task.agentType,
    },
    context,
  };
}

export function formatContextForPrompt(ctx: TaskAgentContext): string {
  const lines: string[] = [
    "## Client",
    `- Name: ${ctx.clientName}`,
    `- Industry: ${ctx.clientIndustry}`,
    "",
    "## Brief",
    `- Title: ${ctx.brief.title}`,
    `- Business objective: ${ctx.brief.businessObjective}`,
    `- Communication objective: ${ctx.brief.communicationObjective}`,
    `- Target audience (brief): ${ctx.brief.targetAudience}`,
    `- Key message: ${ctx.brief.keyMessage}`,
    `- Tone: ${ctx.brief.tone}`,
    `- Deliverables: ${ctx.brief.deliverablesSummary || "(none listed)"}`,
    `- Constraints: ${ctx.brief.constraintsSummary || "(none listed)"}`,
    `- Deadline: ${ctx.brief.deadlineIso}`,
  ];

  if (ctx.brand) {
    lines.push(
      "",
      "## Brand Bible (must respect)",
      `- Positioning: ${ctx.brand.positioning}`,
      `- Brand target audience: ${ctx.brand.targetAudience}`,
      `- Tone of voice: ${ctx.brand.toneOfVoice}`,
      `- Messaging pillars: ${ctx.brand.messagingPillars.join(" | ") || "—"}`,
      `- Mandatory inclusions: ${ctx.brand.mandatoryInclusions.join("; ") || "—"}`,
      `- Things to avoid: ${ctx.brand.thingsToAvoid.join("; ") || "—"}`,
      `- Visual identity notes: ${ctx.brand.visualIdentityBullets.join("; ") || "—"}`,
      `- Channel guidelines: ${ctx.brand.channelGuidelinesBullets.join("; ") || "—"}`,
    );
  } else {
    lines.push("", "## Brand Bible", "(Not configured — infer carefully from brief.)");
  }

  if (ctx.blueprint) {
    lines.push(
      "",
      "## Service blueprint",
      `- Template: ${ctx.blueprint.templateType}`,
      `- Quality threshold (0–1): ${ctx.blueprint.qualityThreshold}`,
      `- Approval required flag: ${ctx.blueprint.approvalRequired}`,
      `- Active services: ${ctx.blueprint.activeServicesLines.join("; ") || "—"}`,
    );
  }

  if (ctx.upstreamArtifacts.length) {
    lines.push("", "## Upstream work (use as inputs; do not contradict approved strategy)");
    for (const u of ctx.upstreamArtifacts) {
      lines.push(
        `### ${u.stage} (${u.type} v${u.version})`,
        "```json",
        JSON.stringify(u.content, null, 2),
        "```",
      );
    }
  }

  return lines.join("\n");
}
