import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  KFC_SA_REFERENCE_SEED,
  MCDONALDS_SA_REFERENCE_SEED,
  type BrandVisualReferenceSeedRow,
} from "./brand-reference-seed-data";

export type SeedBrandVisualReferencesResult = {
  mcdonaldsClientId: string;
  kfcClientId: string;
  insertedMcdonalds: number;
  insertedKfc: number;
  skipped: number;
};

function rowToCreateData(
  clientId: string,
  row: BrandVisualReferenceSeedRow,
): Prisma.VisualReferenceCreateManyInput {
  const meta = {
    ...row.metadata,
    anchor: row.anchor,
  } satisfies Record<string, unknown>;
  return {
    clientId,
    label: row.label,
    category: row.category,
    imageUrl: row.imageUrl,
    metadata: meta as Prisma.InputJsonValue,
  };
}

/**
 * Idempotent: upserts curated VisualReference rows for McDonald's (Demo — SA) and KFC-style (Demo — SA) clients.
 */
export async function seedBrandVisualReferences(
  db: PrismaClient,
): Promise<SeedBrandVisualReferencesResult> {
  const mac = await db.client.findFirst({
    where: { name: "McDonald's (Demo — SA)", isDemoClient: true },
  });
  const kfc = await db.client.findFirst({
    where: { name: "KFC-style (Demo — SA)", isDemoClient: true },
  });

  if (!mac || !kfc) {
    throw new Error(
      "Demo clients not found. Run seed:demo-brands first (McDonald's (Demo — SA) and KFC-style (Demo — SA)).",
    );
  }

  let insertedMcdonalds = 0;
  let insertedKfc = 0;
  let skipped = 0;

  for (const row of MCDONALDS_SA_REFERENCE_SEED) {
    const exists = await db.visualReference.findFirst({
      where: { clientId: mac.id, label: row.label },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await db.visualReference.create({
      data: rowToCreateData(mac.id, row),
    });
    insertedMcdonalds++;
  }

  for (const row of KFC_SA_REFERENCE_SEED) {
    const exists = await db.visualReference.findFirst({
      where: { clientId: kfc.id, label: row.label },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await db.visualReference.create({
      data: rowToCreateData(kfc.id, row),
    });
    insertedKfc++;
  }

  return {
    mcdonaldsClientId: mac.id,
    kfcClientId: kfc.id,
    insertedMcdonalds,
    insertedKfc,
    skipped,
  };
}
