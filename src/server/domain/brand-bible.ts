import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

export type BrandBibleFormInput = {
  positioning: string;
  targetAudience: string;
  toneOfVoice: string;
  messagingPillars: Prisma.InputJsonValue;
  visualIdentity: Prisma.InputJsonValue;
  channelGuidelines: Prisma.InputJsonValue;
  mandatoryInclusions: Prisma.InputJsonValue;
  thingsToAvoid: Prisma.InputJsonValue;
};

export async function upsertBrandBible(
  clientId: string,
  data: BrandBibleFormInput,
) {
  const prisma = getPrisma();
  return prisma.brandBible.upsert({
    where: { clientId },
    create: { clientId, ...data },
    update: data,
  });
}
