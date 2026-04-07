import { getPrisma } from "@/server/db/prisma";
import {
  deadlineForTestBrief,
  INTERNAL_TEST_BRIEF_TEMPLATES,
} from "./internal-test-briefs";

/**
 * Idempotent: creates missing [TEST] briefs for a client (matched by title + isTestBrief).
 */
export async function ensureInternalTestBriefs(clientId: string): Promise<{
  created: number;
  existing: number;
}> {
  const prisma = getPrisma();
  let created = 0;
  let existing = 0;

  for (const t of INTERNAL_TEST_BRIEF_TEMPLATES) {
    const found = await prisma.brief.findFirst({
      where: {
        clientId,
        isTestBrief: true,
        title: t.title,
      },
    });
    if (found) {
      existing++;
      continue;
    }
    await prisma.brief.create({
      data: {
        clientId,
        isTestBrief: true,
        testCategory: t.testCategory,
        engagementType: "CAMPAIGN",
        workstreams: [],
        title: t.title,
        businessObjective: t.businessObjective,
        communicationObjective: t.communicationObjective,
        targetAudience: t.targetAudience,
        keyMessage: t.keyMessage,
        deliverablesRequested: t.deliverablesRequested,
        tone: t.tone,
        constraints: t.constraints,
        deadline: deadlineForTestBrief(),
      },
    });
    created++;
  }

  return { created, existing };
}
