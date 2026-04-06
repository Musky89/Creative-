import type {
  ArtifactOutcomeType,
  PrismaClient,
} from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Framework ids tied to an artifact (Canon selection + structured output).
 */
export function extractFrameworkIdsFromArtifactContent(
  content: unknown,
): string[] {
  if (!isRecord(content)) return [];
  const ids = new Set<string>();

  const canon = content._creativeCanonFrameworkIds;
  if (Array.isArray(canon)) {
    for (const x of canon) {
      const s = String(x).trim();
      if (s) ids.add(s);
    }
  }

  const angles = content.strategicAngles;
  if (Array.isArray(angles)) {
    for (const a of angles) {
      if (isRecord(a) && typeof a.frameworkId === "string" && a.frameworkId.trim()) {
        ids.add(a.frameworkId.trim());
      }
    }
  }

  const concepts = content.concepts;
  if (Array.isArray(concepts)) {
    for (const c of concepts) {
      if (isRecord(c) && typeof c.frameworkId === "string" && c.frameworkId.trim()) {
        ids.add(c.frameworkId.trim());
      }
    }
  }

  const fw = content.frameworkUsed;
  if (typeof fw === "string" && fw.trim()) {
    ids.add(fw.trim());
  }

  return [...ids];
}

export function extractStillWeakFromArtifact(content: unknown): boolean {
  if (!isRecord(content)) return false;
  const q = content._agenticforceQuality;
  if (!isRecord(q)) return false;
  return q.stillWeakAfterRegen === true;
}

export async function recordArtifactOutcomeAndPerformance(
  db: PrismaClient,
  args: {
    clientId: string;
    artifactId: string;
    artifactContent: unknown;
    outcome: ArtifactOutcomeType;
  },
): Promise<void> {
  const frameworkIds = extractFrameworkIdsFromArtifactContent(args.artifactContent);
  const stillWeak = extractStillWeakFromArtifact(args.artifactContent);

  await db.$transaction(async (tx) => {
    await tx.artifactOutcome.create({
      data: {
        clientId: args.clientId,
        artifactId: args.artifactId,
        frameworkIds: frameworkIds as Prisma.InputJsonValue,
        outcome: args.outcome,
        stillWeakAfterRegen: stillWeak,
      },
    });

    const now = new Date();
    for (const frameworkId of frameworkIds) {
      const incApproval = args.outcome === "APPROVED" ? 1 : 0;
      const incRevision = args.outcome === "REVISED" ? 1 : 0;
      const incReject = args.outcome === "REJECTED" ? 1 : 0;
      const incWeak = stillWeak ? 1 : 0;

      await tx.frameworkPerformance.upsert({
        where: {
          clientId_frameworkId: {
            clientId: args.clientId,
            frameworkId,
          },
        },
        create: {
          clientId: args.clientId,
          frameworkId,
          timesUsed: 1,
          approvals: incApproval,
          revisions: incRevision,
          rejections: incReject,
          stillWeakAfterRegenCount: incWeak,
          lastUsedAt: now,
        },
        update: {
          timesUsed: { increment: 1 },
          approvals: { increment: incApproval },
          revisions: { increment: incRevision },
          rejections: { increment: incReject },
          stillWeakAfterRegenCount: { increment: incWeak },
          lastUsedAt: now,
        },
      });
    }
  });
}
