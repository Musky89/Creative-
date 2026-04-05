import type { ArtifactType, WorkflowStage } from "@/generated/prisma/client";
import { STAGE_LABELS, workflowStageOrderForBrief } from "@/lib/workflow-display";
import { getBriefForClient } from "@/server/domain/briefs";
import { stageOrderIndex } from "@/server/orchestrator/v1-pipeline";

function stripMeta(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_agenticforce")) continue;
    if (k.startsWith("_creativeCanon")) continue;
    if (k === "_agenticforceQuality") continue;
    out[k] = v;
  }
  return out;
}

export async function buildStudioExportJson(
  briefId: string,
  clientId: string,
): Promise<{ filename: string; body: string } | null> {
  const brief = await getBriefForClient(briefId, clientId);
  if (!brief) return null;

  const tasks = [...brief.tasks].sort(
    (a, b) =>
      stageOrderIndex(a.stage, brief.identityWorkflowEnabled) -
      stageOrderIndex(b.stage, brief.identityWorkflowEnabled),
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    brief: {
      id: brief.id,
      title: brief.title,
      clientId: brief.clientId,
      clientName: brief.client.name,
      deadline: brief.deadline.toISOString(),
    },
    stages: tasks.map((t) => {
      const arts = [...t.artifacts].sort((a, b) => b.version - a.version);
      const latestByType = new Map<ArtifactType, (typeof arts)[0]>();
      for (const a of arts) {
        if (!latestByType.has(a.type)) latestByType.set(a.type, a);
      }
      return {
        stage: t.stage,
        stageLabel: STAGE_LABELS[t.stage as keyof typeof STAGE_LABELS],
        taskId: t.id,
        status: t.status,
        artifacts: [...latestByType.values()].map((a) => ({
          type: a.type,
          version: a.version,
          content: stripMeta(a.content as Record<string, unknown>),
        })),
        reviews: t.reviewItems.map((r) => ({
          status: r.status,
          feedback: r.feedback,
          reviewerLabel: r.reviewerLabel,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    }),
  };

  const safeTitle = brief.title.replace(/[^\w\d-]+/g, "-").slice(0, 48);
  return {
    filename: `agenticforce-${safeTitle}-${briefId.slice(0, 8)}.json`,
    body: JSON.stringify(payload, null, 2),
  };
}

function mdSection(title: string, body: string): string {
  return `## ${title}\n\n${body}\n\n`;
}

export async function buildStudioExportMarkdown(
  briefId: string,
  clientId: string,
): Promise<{ filename: string; body: string } | null> {
  const brief = await getBriefForClient(briefId, clientId);
  if (!brief) return null;

  const lines: string[] = [
    `# ${brief.title}`,
    "",
    `**Client:** ${brief.client.name}  `,
    `**Deadline:** ${brief.deadline.toISOString()}  `,
    `**Exported:** ${new Date().toISOString()}`,
    "",
    "---",
    "",
  ];

  for (const stage of workflowStageOrderForBrief(brief.identityWorkflowEnabled)) {
    const t = brief.tasks.find((x) => x.stage === stage);
    if (!t) continue;
    const arts = [...t.artifacts].sort((a, b) => b.version - a.version);
    const best = arts[0];
    lines.push(
      mdSection(
        `${STAGE_LABELS[stage as WorkflowStage]} (${t.status})`,
        best
          ? "```json\n" +
              JSON.stringify(
                stripMeta(best.content as Record<string, unknown>),
                null,
                2,
              ) +
              "\n```"
          : "_No artifact yet._",
      ),
    );
    if (t.reviewItems.length) {
      const rev = [...t.reviewItems]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .map(
          (r) =>
            `- **${r.status}**${r.reviewerLabel ? ` (${r.reviewerLabel})` : ""}: ${r.feedback || "—"}`,
        )
        .join("\n");
      lines.push("**Review log**\n\n", rev, "\n\n");
    }
  }

  const safeTitle = brief.title.replace(/[^\w\d-]+/g, "-").slice(0, 48);
  return {
    filename: `agenticforce-${safeTitle}-${briefId.slice(0, 8)}.md`,
    body: lines.join("\n"),
  };
}
