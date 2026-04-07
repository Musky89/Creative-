import type { BriefEngagementType, Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

export type BriefFormInput = {
  title: string;
  businessObjective: string;
  communicationObjective: string;
  targetAudience: string;
  keyMessage: string;
  deliverablesRequested: Prisma.InputJsonValue;
  engagementType: BriefEngagementType;
  workstreams: Prisma.InputJsonValue;
  tone: string;
  constraints: Prisma.InputJsonValue;
  deadline: Date;
  identityWorkflowEnabled: boolean;
  onboardingSource?: string;
  aiOnboardingNeedsReview?: boolean;
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
      visualAssets: { orderBy: { createdAt: "desc" } },
    },
  });
}

/** Studio page: includes Brand Bible for readiness messaging. */
export async function getBriefForStudio(briefId: string, clientId: string) {
  return getPrisma().brief.findFirst({
    where: { id: briefId, clientId },
    include: {
      client: { include: { brandBible: true } },
      tasks: {
        orderBy: { id: "asc" },
        include: {
          artifacts: { orderBy: [{ type: "asc" }, { version: "desc" }] },
          reviewItems: { orderBy: { createdAt: "desc" } },
        },
      },
      visualAssets: {
        orderBy: { createdAt: "desc" },
        include: { review: true },
      },
    },
  });
}

export async function createBrief(clientId: string, data: BriefFormInput) {
  const {
    onboardingSource = "",
    aiOnboardingNeedsReview = false,
    ...rest
  } = data;
  return getPrisma().brief.create({
    data: {
      clientId,
      ...rest,
      onboardingSource,
      aiOnboardingNeedsReview,
    },
  });
}

export async function updateBrief(
  briefId: string,
  clientId: string,
  data: BriefFormInput,
) {
  const {
    onboardingSource,
    aiOnboardingNeedsReview,
    ...rest
  } = data;
  return getPrisma().brief.update({
    where: { id: briefId, clientId },
    data: {
      ...rest,
      ...(onboardingSource !== undefined ? { onboardingSource } : {}),
      ...(aiOnboardingNeedsReview !== undefined
        ? { aiOnboardingNeedsReview }
        : {}),
    },
  });
}

export async function listRecentBriefs(limit = 12) {
  return getPrisma().brief.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true } } },
  });
}
