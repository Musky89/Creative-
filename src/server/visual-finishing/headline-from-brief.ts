import { getPrisma } from "@/server/db/prisma";
import { copyArtifactSchema } from "@/lib/artifacts/contracts";

/**
 * First headline from latest COPY artifact for the brief (for compose default).
 */
export async function getDefaultHeadlineForBrief(briefId: string): Promise<string | null> {
  const prisma = getPrisma();
  const copyTask = await prisma.task.findFirst({
    where: { briefId, stage: "COPY_DEVELOPMENT" },
    orderBy: { id: "asc" },
  });
  if (!copyTask) return null;
  const art = await prisma.artifact.findFirst({
    where: { taskId: copyTask.id, type: "COPY" },
    orderBy: { version: "desc" },
  });
  if (!art?.content || typeof art.content !== "object") return null;
  const raw = { ...(art.content as Record<string, unknown>) };
  for (const k of Object.keys(raw)) {
    if (k.startsWith("_")) delete raw[k];
  }
  const p = copyArtifactSchema.safeParse(raw);
  if (!p.success || !p.data.headlineOptions.length) return null;
  return p.data.headlineOptions[0]!.trim() || null;
}
