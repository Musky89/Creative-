/**
 * Curated VisualReference rows for McDonald's (Demo — SA) and KFC-style (Demo — SA).
 * Requires demo clients from seed:demo-brands.
 *
 *   npx tsx scripts/seed-brand-visual-references.ts
 */
import "dotenv/config";
import { getPrisma } from "../src/server/db/prisma";
import { seedBrandVisualReferences } from "../src/server/visual-reference/seed-brand-visual-references";

async function main() {
  const prisma = getPrisma();
  const r = await seedBrandVisualReferences(prisma);
  console.log("Brand visual references seed OK:");
  console.log("  McDonald's client:", r.mcdonaldsClientId, "+", r.insertedMcdonalds, "new");
  console.log("  KFC-style client:", r.kfcClientId, "+", r.insertedKfc, "new");
  console.log("  Skipped (already present):", r.skipped);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
