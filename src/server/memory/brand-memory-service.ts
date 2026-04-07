import type {
  BrandMemoryOutcome,
  BrandMemoryType,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client";
import { extractConceptMemory } from "./extract-memory";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export type RecordBrandMemoryArgs = {
  clientId: string;
  type: BrandMemoryType;
  frameworkId?: string | null;
  summary: string;
  attributes: Record<string, unknown>;
  outcome: BrandMemoryOutcome;
  strengthScore: number;
};

export async function recordBrandMemoryEvent(
  db: PrismaClient,
  args: RecordBrandMemoryArgs,
  options?: { skipAggregateRefresh?: boolean },
): Promise<void> {
  const score = Math.min(1, Math.max(0, args.strengthScore));
  await db.brandMemory.create({
    data: {
      clientId: args.clientId,
      type: args.type,
      frameworkId: args.frameworkId?.trim() || null,
      summary: args.summary,
      attributes: args.attributes as Prisma.InputJsonValue,
      outcome: args.outcome,
      strengthScore: score,
    },
  });
  if (!options?.skipAggregateRefresh) {
    await refreshBrandMemoryAggregate(db, args.clientId);
  }
}

/** Recompute rollups from recent memories (last 200). */
export async function refreshBrandMemoryAggregate(
  db: PrismaClient,
  clientId: string,
): Promise<void> {
  const rows = await db.brandMemory.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      type: true,
      frameworkId: true,
      outcome: true,
      strengthScore: true,
      summary: true,
      attributes: true,
    },
  });

  const fwCounts = new Map<
    string,
    { approve: number; reject: number; weightA: number; weightR: number }
  >();
  const preferredPatterns: string[] = [];
  const bannedPatterns: string[] = [];

  for (const r of rows) {
    const fw = r.frameworkId?.trim();
    if (fw) {
      const cur = fwCounts.get(fw) ?? {
        approve: 0,
        reject: 0,
        weightA: 0,
        weightR: 0,
      };
      if (r.outcome === "APPROVED") {
        cur.approve += 1;
        cur.weightA += r.strengthScore;
      } else {
        cur.reject += 1;
        cur.weightR += r.strengthScore;
      }
      fwCounts.set(fw, cur);
    }
    const attrs = r.attributes;
    const kw =
      isRecord(attrs) && Array.isArray(attrs.keywords)
        ? (attrs.keywords as unknown[]).map((x) => String(x))
        : [];
    const traits =
      isRecord(attrs) && Array.isArray(attrs.visualTraits)
        ? (attrs.visualTraits as unknown[]).map((x) => String(x))
        : [];

    if (r.outcome === "APPROVED" && preferredPatterns.length < 40) {
      preferredPatterns.push(r.summary);
      for (const k of kw.slice(0, 3)) {
        if (k && !preferredPatterns.includes(k)) preferredPatterns.push(k);
      }
    }
    if (r.outcome === "REJECTED" && bannedPatterns.length < 40) {
      bannedPatterns.push(r.summary);
      for (const t of traits.slice(0, 4)) {
        if (t && !bannedPatterns.includes(t)) bannedPatterns.push(t);
      }
      for (const k of kw.slice(0, 2)) {
        if (k && !bannedPatterns.includes(k)) bannedPatterns.push(k);
      }
    }
  }

  const preferredFrameworks = [...fwCounts.entries()]
    .map(([frameworkId, v]) => ({
      frameworkId,
      approvals: v.approve,
      rejections: v.reject,
      score:
        v.approve + v.reject > 0
          ? (v.weightA - v.weightR * 0.5) / (v.approve + v.reject)
          : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const bannedFrameworkHints = [...fwCounts.entries()]
    .filter(([, v]) => v.reject >= 2 && v.reject > v.approve)
    .map(([id]) => id)
    .slice(0, 8);

  const aggregatedPatterns: Record<string, unknown> = {
    preferredFrameworks,
    bannedFrameworkHints,
    preferredPatterns: [...new Set(preferredPatterns)].slice(0, 24),
    bannedPatterns: [...new Set(bannedPatterns)].slice(0, 24),
    computedAt: new Date().toISOString(),
  };

  await db.brandMemoryAggregate.upsert({
    where: { clientId },
    create: {
      clientId,
      aggregatedPatterns: aggregatedPatterns as Prisma.InputJsonValue,
    },
    update: {
      aggregatedPatterns: aggregatedPatterns as Prisma.InputJsonValue,
    },
  });
}

export async function recordConceptJudgeMemories(
  db: PrismaClient,
  args: {
    clientId: string;
    content: Record<string, unknown>;
    judgeScores: Record<
      string,
      {
        distinctiveness: number;
        brandAlignment: number;
        clarity: number;
        emotionalImpact: number;
        nonGenericLanguage: number;
      }
    >;
    rejectionReasons: { conceptId: string; reason: string }[];
  },
): Promise<void> {
  const concepts = args.content.concepts;
  if (!Array.isArray(concepts)) return;

  const reasonById = new Map(
    args.rejectionReasons.map((r) => [r.conceptId, r.reason] as const),
  );

  for (const c of concepts) {
    if (!isRecord(c)) continue;
    const id = String(c.conceptId ?? "");
    const isWinner = c.isSelected === true;
    const isRejected = c.isRejected === true;
    if (!isWinner && !isRejected) continue;

    const scores = id ? args.judgeScores[id] : undefined;
    const strength = scores
      ? (scores.distinctiveness +
          scores.brandAlignment +
          scores.clarity +
          scores.emotionalImpact +
          scores.nonGenericLanguage) /
        5
      : isWinner
        ? 0.75
        : 0.35;

    const ext = extractConceptMemory({
      concept: c,
      outcome: isWinner ? "APPROVED" : "REJECTED",
      judgeReason: reasonById.get(id) ?? null,
    });

    await recordBrandMemoryEvent(
      db,
      {
        clientId: args.clientId,
        type: "CONCEPT",
        frameworkId: String(c.frameworkId ?? "").trim() || null,
        summary: ext.summary,
        attributes: ext.attributes,
        outcome: isWinner ? "APPROVED" : "REJECTED",
        strengthScore: strength,
      },
      { skipAggregateRefresh: true },
    );
  }
  await refreshBrandMemoryAggregate(db, args.clientId);
}

export type BrandMemoryPromptSlice = {
  approvedLines: string[];
  rejectedLines: string[];
  preferredFrameworks: string[];
  /** Framework ids that tended to fail — soft deprioritize in selection, not ban. */
  avoidFrameworkIds: string[];
  avoidPatterns: string[];
};

export async function loadBrandMemoryForPrompt(
  db: PrismaClient,
  clientId: string,
  limit = 10,
): Promise<BrandMemoryPromptSlice> {
  const [approved, rejected, agg] = await Promise.all([
    db.brandMemory.findMany({
      where: { clientId, outcome: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { summary: true, frameworkId: true, type: true },
    }),
    db.brandMemory.findMany({
      where: { clientId, outcome: "REJECTED" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { summary: true, frameworkId: true, type: true },
    }),
    db.brandMemoryAggregate.findUnique({
      where: { clientId },
      select: { aggregatedPatterns: true },
    }),
  ]);

  const patterns = agg?.aggregatedPatterns;
  const p = isRecord(patterns) ? patterns : {};

  const preferredFrameworks: string[] = [];
  const pfw = p.preferredFrameworks;
  if (Array.isArray(pfw)) {
    for (const x of pfw) {
      if (isRecord(x) && typeof x.frameworkId === "string" && x.frameworkId.trim()) {
        preferredFrameworks.push(x.frameworkId.trim());
      }
    }
  }

  const avoidPatterns: string[] = [];
  const banned = p.bannedPatterns;
  const bannedFw = p.bannedFrameworkHints;
  const avoidFrameworkIds: string[] = [];
  if (Array.isArray(banned)) {
    avoidPatterns.push(...banned.map((x) => String(x)).filter(Boolean).slice(0, 15));
  }
  if (Array.isArray(bannedFw)) {
    for (const id of bannedFw.map((x) => String(x)).filter(Boolean).slice(0, 8)) {
      avoidFrameworkIds.push(id);
      avoidPatterns.push(`Framework ${id} often struggled — explore carefully`);
    }
  }

  return {
    approvedLines: approved.map(
      (r) =>
        `[${r.type}]${r.frameworkId ? ` ${r.frameworkId}:` : ""} ${r.summary}`,
    ),
    rejectedLines: rejected.map(
      (r) =>
        `[${r.type}]${r.frameworkId ? ` ${r.frameworkId}:` : ""} ${r.summary}`,
    ),
    preferredFrameworks: preferredFrameworks.slice(0, 8),
    avoidFrameworkIds,
    avoidPatterns: [...new Set(avoidPatterns)].slice(0, 12),
  };
}

export async function getBrandLearningPanelData(
  db: PrismaClient,
  clientId: string,
) {
  const agg = await db.brandMemoryAggregate.findUnique({
    where: { clientId },
    select: { aggregatedPatterns: true, updatedAt: true },
  });
  const patterns = agg?.aggregatedPatterns;
  const p = isRecord(patterns) ? patterns : {};

  const pref = Array.isArray(p.preferredPatterns)
    ? p.preferredPatterns.map((x) => String(x)).filter(Boolean).slice(0, 3)
    : [];
  const ban = Array.isArray(p.bannedPatterns)
    ? p.bannedPatterns.map((x) => String(x)).filter(Boolean).slice(0, 3)
    : [];

  if (pref.length < 3 || ban.length < 3) {
    const recent = await db.brandMemory.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { summary: true, outcome: true },
    });
    for (const r of recent) {
      if (r.outcome === "APPROVED" && pref.length < 3 && !pref.includes(r.summary)) {
        pref.push(r.summary);
      }
      if (r.outcome === "REJECTED" && ban.length < 3 && !ban.includes(r.summary)) {
        ban.push(r.summary);
      }
    }
  }

  return {
    preferred: pref.slice(0, 3),
    rejected: ban.slice(0, 3),
    updatedAt: agg?.updatedAt ?? null,
  };
}
