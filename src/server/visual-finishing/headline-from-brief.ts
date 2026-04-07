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
  const full = art.content as Record<string, unknown>;
  const sel = full._agenticforceSelection;
  if (sel && typeof sel === "object" && !Array.isArray(sel)) {
    const o = sel as Record<string, unknown>;
    if (o.stage === "COPY_HEADLINES" && typeof o.primaryHeadlineIndex === "number") {
      const idx = Math.min(
        p.data.headlineOptions.length - 1,
        Math.max(0, Math.floor(o.primaryHeadlineIndex)),
      );
      const h = p.data.headlineOptions[idx];
      if (h?.trim()) return h.trim();
    }
  }
  return p.data.headlineOptions[0]!.trim() || null;
}

/**
 * First CTA line from latest COPY artifact (for final composer).
 */
export async function getDefaultCtaForBrief(briefId: string): Promise<string | null> {
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
  if (!p.success || !p.data.ctaOptions.length) return null;
  const first = p.data.ctaOptions[0];
  return first?.trim() || null;
}
