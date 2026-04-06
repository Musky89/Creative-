"use server";

import { revalidatePath } from "next/cache";
import { seedDemoBrandsIfMissing } from "@/server/onboarding/seed-demo-brands";

function allowDemoSeed(): boolean {
  if (process.env.AGENTICFORCE_ALLOW_DEMO_SEED === "1") return true;
  return process.env.NODE_ENV === "development";
}

export type DemoSeedState = { error?: string; ok?: string } | null;

export async function seedDemoBrandsAction(): Promise<DemoSeedState> {
  if (!allowDemoSeed()) {
    return { error: "Demo seeding is disabled. Set NODE_ENV=development or AGENTICFORCE_ALLOW_DEMO_SEED=1." };
  }
  try {
    await seedDemoBrandsIfMissing();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg };
  }
  revalidatePath("/");
  revalidatePath("/clients");
  return {
    ok: "Demo clients ready: Coca-Cola (Demo — SA) and McDonald's (Demo — SA). Open each client → Studio on the campaign brief.",
  };
}
