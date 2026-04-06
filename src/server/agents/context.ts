import type { Artifact, BrandBible, ServiceBlueprint } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { stageOrderIndex } from "@/server/orchestrator/v1-pipeline";
import type { WorkflowStage } from "@/generated/prisma/client";
import {
  formatBrandOperatingSystemSection,
  type BrandOperatingSystemContext,
} from "@/server/brand/brand-os-prompt";
import { filterUpstreamToWinningConcept } from "./concept-context-filter";

export type { BrandOperatingSystemContext };

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
  clientId: string;
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
    /** Structured Brand OS (same row as Brand Bible). */
    operatingSystem: BrandOperatingSystemContext;
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

  const idFlow = brief.identityWorkflowEnabled;
  const currentOrder = stageOrderIndex(task.stage, idFlow);
  const upstreamStages = allTasks.filter(
    (t) => stageOrderIndex(t.stage, idFlow) < currentOrder,
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
    clientId: client.id,
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
          operatingSystem: {
            vocabularyStyle: bb.vocabularyStyle,
            sentenceStyle: bb.sentenceStyle,
            bannedPhrases: asStringArray(bb.bannedPhrases, 40),
            preferredPhrases: asStringArray(bb.preferredPhrases, 40),
            signaturePatterns: asStringArray(bb.signaturePatterns, 24),
            primaryEmotion: bb.primaryEmotion,
            emotionalToneDescription: bb.emotionalToneDescription,
            emotionalBoundaries: asStringArray(bb.emotionalBoundaries, 24),
            hookStyles: asStringArray(bb.hookStyles, 16),
            narrativeStyles: asStringArray(bb.narrativeStyles, 16),
            persuasionStyle: bb.persuasionStyle,
            visualStyle: bb.visualStyle,
            colorPhilosophy: bb.colorPhilosophy,
            compositionStyle: bb.compositionStyle,
            textureFocus: bb.textureFocus,
            lightingStyle: bb.lightingStyle,
            languageDnaPhrasesUse: asStringArray(bb.languageDnaPhrasesUse, 40),
            languageDnaPhrasesNever: asStringArray(bb.languageDnaPhrasesNever, 40),
            languageDnaSentenceRhythm: asStringArray(bb.languageDnaSentenceRhythm, 16),
            languageDnaHeadlinePatterns: asStringArray(
              bb.languageDnaHeadlinePatterns,
              20,
            ),
            languageDnaCtaPatterns: asStringArray(bb.languageDnaCtaPatterns, 20),
            categoryTypicalBehavior: bb.categoryTypicalBehavior,
            categoryClichesToAvoid: asStringArray(bb.categoryClichesToAvoid, 32),
            categoryDifferentiation: bb.categoryDifferentiation,
            tensionCoreContradiction: bb.tensionCoreContradiction,
            tensionEmotionalBalance: bb.tensionEmotionalBalance,
            tasteCloserThan: asStringArray(bb.tasteCloserThan, 16),
            tasteShouldFeelLike: bb.tasteShouldFeelLike,
            tasteMustNotFeelLike: bb.tasteMustNotFeelLike,
            visualNeverLooksLike: asStringArray(bb.visualNeverLooksLike, 32),
            visualCompositionTendencies: bb.visualCompositionTendencies,
            visualMaterialTextureDirection: bb.visualMaterialTextureDirection,
            visualLightingTendencies: bb.visualLightingTendencies,
          },
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

export function formatContextForPrompt(
  ctx: TaskAgentContext,
  options?: { conceptWinnerOnly?: boolean },
): string {
  const work =
    options?.conceptWinnerOnly === true
      ? filterUpstreamToWinningConcept(ctx)
      : ctx;
  const lines: string[] = [
    "## Client",
    `- Name: ${work.clientName}`,
    `- Industry: ${work.clientIndustry}`,
    "",
    "## Brief",
    `- Title: ${work.brief.title}`,
    `- Business objective: ${work.brief.businessObjective}`,
    `- Communication objective: ${work.brief.communicationObjective}`,
    `- Target audience (brief): ${work.brief.targetAudience}`,
    `- Key message: ${work.brief.keyMessage}`,
    `- Tone: ${work.brief.tone}`,
    `- Deliverables: ${work.brief.deliverablesSummary || "(none listed)"}`,
    `- Constraints: ${work.brief.constraintsSummary || "(none listed)"}`,
    `- Deadline: ${work.brief.deadlineIso}`,
  ];

  if (work.brand) {
    lines.push(
      "",
      "## Brand Bible (must respect)",
      `- Positioning: ${work.brand.positioning}`,
      `- Brand target audience: ${work.brand.targetAudience}`,
      `- Tone of voice: ${work.brand.toneOfVoice}`,
      `- Messaging pillars: ${work.brand.messagingPillars.join(" | ") || "—"}`,
      `- Mandatory inclusions: ${work.brand.mandatoryInclusions.join("; ") || "—"}`,
      `- Things to avoid: ${work.brand.thingsToAvoid.join("; ") || "—"}`,
      `- Visual identity notes: ${work.brand.visualIdentityBullets.join("; ") || "—"}`,
      `- Channel guidelines: ${work.brand.channelGuidelinesBullets.join("; ") || "—"}`,
      "",
      formatBrandOperatingSystemSection(work.brand.operatingSystem),
    );
  } else {
    lines.push("", "## Brand Bible", "(Not configured — infer carefully from brief.)");
  }

  if (work.blueprint) {
    lines.push(
      "",
      "## Service blueprint",
      `- Template: ${work.blueprint.templateType}`,
      `- Quality threshold (0–1): ${work.blueprint.qualityThreshold}`,
      `- Approval required flag: ${work.blueprint.approvalRequired}`,
      `- Active services: ${work.blueprint.activeServicesLines.join("; ") || "—"}`,
    );
  }

  if (work.upstreamArtifacts.length) {
    lines.push("", "## Upstream work (use as inputs; do not contradict approved strategy)");
    for (const u of work.upstreamArtifacts) {
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
