import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ExtractedVisualIdentity } from "./extract-visual-identity";

const MAX_PER_BUCKET = 24;
const CONFIRMATIONS_FOR_FULL_CONFIDENCE = 8;
const WEIGHT_NEW = 0.22;
const WEIGHT_EXISTING = 0.78;

function asLines(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.map((x) => String(x).trim()).filter((s) => s.length > 2);
}

function mergeWeightedLists(
  existing: string[],
  incoming: string[],
): string[] {
  const scores = new Map<string, { display: string; score: number }>();
  for (const x of existing) {
    const k = x.toLowerCase();
    const cur = scores.get(k);
    const next = (cur?.score ?? 0) + 1;
    scores.set(k, { display: cur?.display ?? x, score: next });
  }
  for (const x of incoming) {
    const k = x.toLowerCase();
    const cur = scores.get(k);
    const add = WEIGHT_NEW * 4;
    scores.set(k, {
      display: cur?.display ?? x,
      score: (cur?.score ?? 0) + add,
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((v) => v.display)
    .slice(0, MAX_PER_BUCKET);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Merge extracted traits after a preferred selection. Slow confidence ramp (anti-overfit).
 */
export async function mergeBrandVisualProfileOnPreferredSelection(
  db: PrismaClient,
  args: { clientId: string; extracted: ExtractedVisualIdentity },
): Promise<{ profileId: string; traitsUsed: string[] }> {
  const row = await db.brandVisualProfile.findUnique({
    where: { clientId: args.clientId },
  });

  const traitsUsed: string[] = [
    ...args.extracted.lightingPatterns.slice(0, 3),
    ...args.extracted.compositionPatterns.slice(0, 3),
    ...args.extracted.colorSignatures.slice(0, 2),
  ];

  if (!row) {
    const created = await db.brandVisualProfile.create({
      data: {
        clientId: args.clientId,
        styleKeywords: args.extracted.styleKeywords as Prisma.InputJsonValue,
        lightingPatterns: args.extracted.lightingPatterns as Prisma.InputJsonValue,
        compositionPatterns: args.extracted.compositionPatterns as Prisma.InputJsonValue,
        colorSignatures: args.extracted.colorSignatures as Prisma.InputJsonValue,
        texturePatterns: args.extracted.texturePatterns as Prisma.InputJsonValue,
        framingRules: args.extracted.framingRules as Prisma.InputJsonValue,
        negativeTraits: args.extracted.negativeTraits as Prisma.InputJsonValue,
        confirmationCount: 1,
        rejectionCount: 0,
        confidenceScore: 0.12,
      },
    });
    return { profileId: created.id, traitsUsed };
  }

  const nextConfirm = row.confirmationCount + 1;
  const confRaw =
    WEIGHT_EXISTING * row.confidenceScore +
    WEIGHT_NEW * Math.min(1, 0.35 + nextConfirm * 0.04);
  const confidenceScore = clamp01(
    Math.min(confRaw, nextConfirm / CONFIRMATIONS_FOR_FULL_CONFIDENCE),
  );

  const merged = {
    styleKeywords: mergeWeightedLists(
      asLines(row.styleKeywords),
      args.extracted.styleKeywords,
    ),
    lightingPatterns: mergeWeightedLists(
      asLines(row.lightingPatterns),
      args.extracted.lightingPatterns,
    ),
    compositionPatterns: mergeWeightedLists(
      asLines(row.compositionPatterns),
      args.extracted.compositionPatterns,
    ),
    colorSignatures: mergeWeightedLists(
      asLines(row.colorSignatures),
      args.extracted.colorSignatures,
    ),
    texturePatterns: mergeWeightedLists(
      asLines(row.texturePatterns),
      args.extracted.texturePatterns,
    ),
    framingRules: mergeWeightedLists(
      asLines(row.framingRules),
      args.extracted.framingRules,
    ),
    negativeTraits: mergeWeightedLists(
      asLines(row.negativeTraits),
      args.extracted.negativeTraits,
    ),
  };

  const updated = await db.brandVisualProfile.update({
    where: { clientId: args.clientId },
    data: {
      ...merged,
      confirmationCount: nextConfirm,
      confidenceScore,
    },
  });

  return { profileId: updated.id, traitsUsed };
}

/**
 * Light touch on founder reject — reinforce negativeTraits without jumping confidence.
 */
export async function mergeBrandVisualProfileOnRejection(
  db: PrismaClient,
  args: { clientId: string; negativeHints: string[] },
): Promise<void> {
  if (args.negativeHints.length === 0) return;

  const row = await db.brandVisualProfile.findUnique({
    where: { clientId: args.clientId },
  });
  if (!row) {
    await db.brandVisualProfile.create({
      data: {
        clientId: args.clientId,
        styleKeywords: [],
        lightingPatterns: [],
        compositionPatterns: [],
        colorSignatures: [],
        texturePatterns: [],
        framingRules: [],
        negativeTraits: args.negativeHints as Prisma.InputJsonValue,
        confirmationCount: 0,
        rejectionCount: 1,
        confidenceScore: 0.05,
      },
    });
    return;
  }

  const neg = mergeWeightedLists(asLines(row.negativeTraits), args.negativeHints);
  await db.brandVisualProfile.update({
    where: { clientId: args.clientId },
    data: {
      negativeTraits: neg as Prisma.InputJsonValue,
      rejectionCount: { increment: 1 },
      confidenceScore: clamp01(row.confidenceScore * 0.98),
    },
  });
}

export type BrandVisualProfileForPrompt = {
  id: string;
  styleKeywords: string[];
  lightingPatterns: string[];
  compositionPatterns: string[];
  colorSignatures: string[];
  texturePatterns: string[];
  framingRules: string[];
  negativeTraits: string[];
  confidenceScore: number;
  confirmationCount: number;
};

export async function loadBrandVisualProfileForPrompt(
  db: PrismaClient,
  clientId: string,
): Promise<BrandVisualProfileForPrompt | null> {
  const row = await db.brandVisualProfile.findUnique({
    where: { clientId },
  });
  if (!row) return null;
  return {
    id: row.id,
    styleKeywords: asLines(row.styleKeywords),
    lightingPatterns: asLines(row.lightingPatterns),
    compositionPatterns: asLines(row.compositionPatterns),
    colorSignatures: asLines(row.colorSignatures),
    texturePatterns: asLines(row.texturePatterns),
    framingRules: asLines(row.framingRules),
    negativeTraits: asLines(row.negativeTraits),
    confidenceScore: row.confidenceScore,
    confirmationCount: row.confirmationCount,
  };
}
