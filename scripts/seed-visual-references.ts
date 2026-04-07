/**
 * Idempotent global VisualReference rows (Unsplash Source — license-friendly hotlinking for demos).
 * Run: npx tsx scripts/seed-visual-references.ts
 */
import type { Prisma } from "../src/generated/prisma/client";
import { getPrisma } from "../src/server/db/prisma";

const GLOBAL_REFS: {
  label: string;
  category: "COMPOSITION" | "LIGHTING" | "STYLE" | "BRAND";
  imageUrl: string;
  metadata: Record<string, unknown>;
}[] = [
  {
    label: "Food close-up — appetite macro",
    category: "COMPOSITION",
    imageUrl:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80",
    metadata: {
      tags: ["food", "macro", "texture", "steam", "close-up", "restaurant"],
      mood: "warm appetite appeal",
      composition: "tight hero subject, shallow depth",
      lighting: "soft key from window-side practical",
    },
  },
  {
    label: "Lifestyle brand — candid daylight",
    category: "STYLE",
    imageUrl:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80",
    metadata: {
      tags: ["lifestyle", "friends", "outdoor", "natural", "campaign"],
      mood: "authentic shared moment",
      composition: "environmental portrait spacing",
      lighting: "high-key daylight, soft shadows",
    },
  },
  {
    label: "Product hero — studio softbox",
    category: "LIGHTING",
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80",
    metadata: {
      tags: ["product", "packshot", "clean", "e-commerce"],
      mood: "confident minimal",
      composition: "center-weighted, generous margins",
      lighting: "softbox wrap, controlled specular",
    },
  },
  {
    label: "Outdoor natural light scene",
    category: "LIGHTING",
    imageUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    metadata: {
      tags: ["outdoor", "landscape", "natural", "golden-hour"],
      mood: "expansive calm",
      composition: "wide layering, horizon discipline",
      lighting: "sun backlight with fill from bounce",
    },
  },
  {
    label: "Urban street energy — handheld",
    category: "STYLE",
    imageUrl:
      "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80",
    metadata: {
      tags: ["street", "urban", "motion", "youth", "culture"],
      mood: "kinetic real-world",
      composition: "asymmetric lead room, candid framing",
      lighting: "mixed practicals, night city spill",
    },
  },
];

async function main() {
  const prisma = getPrisma();
  for (const r of GLOBAL_REFS) {
    const existing = await prisma.visualReference.findFirst({
      where: { clientId: null, label: r.label },
    });
    if (existing) continue;
    await prisma.visualReference.create({
      data: {
        clientId: null,
        label: r.label,
        category: r.category,
        imageUrl: r.imageUrl,
        metadata: r.metadata as Prisma.InputJsonValue,
      },
    });
    console.log(`Seeded reference: ${r.label}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
