import { createClient } from "@/server/domain/clients";
import { upsertBrandBible } from "@/server/domain/brand-bible";
import { upsertServiceBlueprint } from "@/server/domain/service-blueprint";
import { createBrief } from "@/server/domain/briefs";
import { orchestrator } from "@/server/orchestrator/orchestrator-service";
import {
  cocaColaBrandBible,
  cocaColaBlueprint,
  cocaColaBrief,
  mcdonaldsBrandBible,
  mcdonaldsBlueprint,
  mcdonaldsBrief,
} from "./demo-brands-seed";
import { getPrisma } from "@/server/db/prisma";

export type SeedDemoResult = {
  cocaColaClientId: string;
  cocaColaBriefId: string;
  mcdonaldsClientId: string;
  mcdonaldsBriefId: string;
};

async function ensureBriefAndWorkflow(
  clientId: string,
  titleSubstring: string,
  factory: () => ReturnType<typeof cocaColaBrief>,
) {
  const prisma = getPrisma();
  let brief = await prisma.brief.findFirst({
    where: { clientId, title: { contains: titleSubstring } },
    orderBy: { createdAt: "desc" },
  });
  if (!brief) {
    brief = await createBrief(clientId, factory());
  }
  try {
    await orchestrator.initializeWorkflowForBrief(brief.id);
  } catch {
    // already initialized
  }
  return brief.id;
}

/**
 * Idempotent: upserts brand/blueprint; creates brief + workflow if missing.
 */
export async function seedDemoBrandsIfMissing(): Promise<SeedDemoResult> {
  const prisma = getPrisma();

  let coke = await prisma.client.findFirst({
    where: { name: "Coca-Cola (Demo — SA)", isDemoClient: true },
  });
  if (!coke) {
    coke = await createClient({
      name: "Coca-Cola (Demo — SA)",
      industry: "Beverages — soft drinks (demo)",
      isDemoClient: true,
    });
  }
  await upsertBrandBible(coke.id, cocaColaBrandBible());
  await upsertServiceBlueprint(coke.id, cocaColaBlueprint());
  const cokeBriefId = await ensureBriefAndWorkflow(
    coke.id,
    "Coca-Cola South Africa",
    cocaColaBrief,
  );

  let mac = await prisma.client.findFirst({
    where: { name: "McDonald's (Demo — SA)", isDemoClient: true },
  });
  if (!mac) {
    mac = await createClient({
      name: "McDonald's (Demo — SA)",
      industry: "Quick-service restaurant (demo)",
      isDemoClient: true,
    });
  }
  await upsertBrandBible(mac.id, mcdonaldsBrandBible());
  await upsertServiceBlueprint(mac.id, mcdonaldsBlueprint());
  const macBriefId = await ensureBriefAndWorkflow(
    mac.id,
    "Value & family seasonal",
    mcdonaldsBrief,
  );

  return {
    cocaColaClientId: coke.id,
    cocaColaBriefId: cokeBriefId,
    mcdonaldsClientId: mac.id,
    mcdonaldsBriefId: macBriefId,
  };
}
