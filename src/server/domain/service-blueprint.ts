import type {
  Prisma,
  ServiceBlueprintTemplateType,
} from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

export type ServiceBlueprintFormInput = {
  templateType: ServiceBlueprintTemplateType;
  activeServices: Prisma.InputJsonValue;
  qualityThreshold: number;
  approvalRequired: boolean;
};

export async function upsertServiceBlueprint(
  clientId: string,
  data: ServiceBlueprintFormInput,
) {
  const prisma = getPrisma();
  return prisma.serviceBlueprint.upsert({
    where: { clientId },
    create: { clientId, ...data },
    update: data,
  });
}
