import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

export type BriefFormInput = {
  title: string;
  businessObjective: string;
  communicationObjective: string;
  targetAudience: string;
  keyMessage: string;
  deliverablesRequested: Prisma.InputJsonValue;
  tone: string;
  constraints: Prisma.InputJsonValue;
  deadline: Date;
};

export async function getBriefForClient(briefId: string, clientId: string) {
  return getPrisma().brief.findFirst({
    where: { id: briefId, clientId },
    include: {
      client: true,
      tasks: {
        orderBy: { id: "asc" },
        include: {
          artifacts: { orderBy: [{ type: "asc" }, { version: "desc" }] },
          reviewItems: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
}

export async function createBrief(clientId: string, data: BriefFormInput) {
  return getPrisma().brief.create({
    data: { clientId, ...data },
  });
}

export async function updateBrief(
  briefId: string,
  clientId: string,
  data: BriefFormInput,
) {
  return getPrisma().brief.update({
    where: { id: briefId, clientId },
    data,
  });
}

export async function listRecentBriefs(limit = 12) {
  return getPrisma().brief.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true } } },
  });
}
