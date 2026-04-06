/**
 * CLI: seed Coca-Cola & McDonald's demo clients (SA campaign briefs) + workflows.
 *
 *   npx tsx scripts/seed-demo-brands.ts
 *
 * Requires DATABASE_URL and applied migrations.
 */
import "dotenv/config";
import { seedDemoBrandsIfMissing } from "../src/server/onboarding/seed-demo-brands";

async function main() {
  const r = await seedDemoBrandsIfMissing();
  console.log("Demo seed OK:");
  console.log("  Coca-Cola client:", r.cocaColaClientId, "brief:", r.cocaColaBriefId);
  console.log("  McDonald's client:", r.mcdonaldsClientId, "brief:", r.mcdonaldsBriefId);
  console.log("\nOpen Studio:");
  console.log(
    `  /clients/${r.cocaColaClientId}/briefs/${r.cocaColaBriefId}/studio`,
  );
  console.log(
    `  /clients/${r.mcdonaldsClientId}/briefs/${r.mcdonaldsBriefId}/studio`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
