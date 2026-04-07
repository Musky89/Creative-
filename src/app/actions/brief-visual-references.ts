"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/server/db/prisma";

function studioPath(clientId: string, briefId: string) {
  return `/clients/${clientId}/briefs/${briefId}/studio`;
}

/** One URL per line in the form; max 5 stored. */
export async function saveBriefVisualReferenceUrlsAction(
  clientId: string,
  briefId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const raw = String(formData.get("referenceUrls") ?? "");
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
  const urls = lines
    .filter((s) => s.startsWith("http://") || s.startsWith("https://"))
    .slice(0, 5);

  const prisma = getPrisma();
  const brief = await prisma.brief.findFirst({
    where: { id: briefId, clientId },
  });
  if (!brief) return { error: "Brief not found." };

  await prisma.brief.update({
    where: { id: briefId },
    data: { visualReferenceOverrides: urls },
  });

  revalidatePath(studioPath(clientId, briefId));
  return { ok: true as const };
}
