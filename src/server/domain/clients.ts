import { cache } from "react";
import { getPrisma } from "@/server/db/prisma";

export async function listClients() {
  return getPrisma().client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { briefs: true } },
    },
  });
}

export async function getClient(id: string) {
  return getPrisma().client.findUnique({
    where: { id },
    include: {
      brandBible: true,
      serviceBlueprint: true,
      briefs: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createClient(data: { name: string; industry: string }) {
  return getPrisma().client.create({ data });
}

export const getClientCached = cache(async (id: string) => {
  return getClient(id);
});
