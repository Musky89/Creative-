import { getPrisma } from "@/server/db/prisma";

export async function listDashboardBriefRows(limit = 12) {
  return getPrisma().brief.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      tasks: { select: { status: true, stage: true, requiresReview: true } },
    },
  });
}

export async function countPendingReviewsGlobally() {
  return getPrisma().task.count({
    where: { status: "AWAITING_REVIEW" },
  });
}

/** Briefs with at least one task still open (not all stages completed). */
export async function countActiveWorkflowBriefs() {
  return getPrisma().brief.count({
    where: {
      tasks: { some: { status: { not: "COMPLETED" } } },
    },
  });
}
