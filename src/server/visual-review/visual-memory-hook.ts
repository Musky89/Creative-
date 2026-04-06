import type { ArtifactOutcomeType, PrismaClient } from "@/generated/prisma/client";
import { visualSpecArtifactSchema } from "@/lib/artifacts/contracts";
import { recordArtifactOutcomeAndPerformance } from "@/server/canon/outcomes";

/**
 * Extension point: tie visual founder decisions to FrameworkPerformance via VISUAL_SPEC artifact.
 * Uses existing ArtifactOutcome + FrameworkPerformance pipeline.
 */
export async function recordVisualMemoryFromSpecArtifact(
  db: PrismaClient,
  args: {
    clientId: string;
    specArtifactId: string;
    outcome: ArtifactOutcomeType;
    stillWeakAfterRegen?: boolean;
  },
): Promise<void> {
  const art = await db.artifact.findUnique({ where: { id: args.specArtifactId } });
  if (!art || art.type !== "VISUAL_SPEC") return;

  const raw = { ...(art.content as Record<string, unknown>) };
  for (const k of Object.keys(raw)) {
    if (k.startsWith("_")) delete raw[k];
  }
  const parsed = visualSpecArtifactSchema.safeParse(raw);
  if (!parsed.success) return;

  const content = {
    ...parsed.data,
    _creativeCanonFrameworkIds: [parsed.data.frameworkUsed],
    _agenticforceQuality: {
      stillWeakAfterRegen: args.stillWeakAfterRegen === true,
    },
  };

  await recordArtifactOutcomeAndPerformance(db, {
    clientId: args.clientId,
    artifactId: art.id,
    artifactContent: content,
    outcome: args.outcome,
  });
}
