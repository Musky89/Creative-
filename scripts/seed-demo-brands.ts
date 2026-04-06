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
  console.log("  KFC-style client:", r.kfcStyleClientId);
  console.log("  McDonald's rib LTO brief:", r.mcdonaldsRibBriefId);
  console.log("  KFC-style rib LTO brief:", r.kfcRibBriefId);
  console.log("\nOpen Studio:");
  console.log(
    `  /clients/${r.cocaColaClientId}/briefs/${r.cocaColaBriefId}/studio`,
  );
  console.log(
    `  /clients/${r.mcdonaldsClientId}/briefs/${r.mcdonaldsBriefId}/studio`,
  );
  console.log(
    `  /clients/${r.mcdonaldsClientId}/briefs/${r.mcdonaldsRibBriefId}/studio#studio-image-generation`,
  );
  console.log(
    `  /clients/${r.kfcStyleClientId}/briefs/${r.kfcRibBriefId}/studio#studio-image-generation`,
  );
  console.log(
    "\nCompare images (CLI, needs LLM + image keys): npx tsx scripts/qa-rib-burger-visual-compare.ts",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
