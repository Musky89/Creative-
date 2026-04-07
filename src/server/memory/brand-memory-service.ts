import type {
  BrandMemoryOutcome,
  BrandMemoryType,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client";
import {
  extractConceptMemory,
  extractStrategyAngleMemory,
} from "./extract-memory";

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

  const positiveOutcomes = new Set<BrandMemoryOutcome>([
    "APPROVED",
    "SELECTED",
  ]);
  const negativeOutcomes = new Set<BrandMemoryOutcome>([
    "REJECTED",
    "FAILED",
  ]);

  const preferredVisualTraits: string[] = [];
  const rejectedVisualTraits: string[] = [];
  const preferredTonePatterns: string[] = [];
  const rejectedTonePatterns: string[] = [];
  const preferredCompositionPatterns: string[] = [];
  const winningCampaignPatterns: string[] = [];

  for (const r of rows) {
    const fw = r.frameworkId?.trim();
    if (fw) {
      const cur = fwCounts.get(fw) ?? {
        approve: 0,
        reject: 0,
        weightA: 0,
        weightR: 0,
      };
      if (positiveOutcomes.has(r.outcome)) {
        cur.approve += 1;
        cur.weightA += r.strengthScore;
      } else if (negativeOutcomes.has(r.outcome)) {
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
    const structHints =
      isRecord(attrs) && Array.isArray(attrs.structureHints)
        ? (attrs.structureHints as unknown[]).map((x) => String(x))
        : [];

    if (positiveOutcomes.has(r.outcome) && preferredPatterns.length < 40) {
      preferredPatterns.push(r.summary);
      for (const k of kw.slice(0, 3)) {
        if (k && !preferredPatterns.includes(k)) preferredPatterns.push(k);
      }
      if (r.type === "VISUAL") {
        for (const t of traits.slice(0, 4)) {
          if (t && !preferredVisualTraits.includes(t)) preferredVisualTraits.push(t);
        }
      }
      if (r.type === "TONE" || r.type === "COPY") {
        for (const k of kw.slice(0, 4)) {
          if (k && !preferredTonePatterns.includes(k)) preferredTonePatterns.push(k);
        }
      }
      if (
        r.type === "CAMPAIGN_PATTERN" ||
        structHints.includes("composed_final_output")
      ) {
        if (!winningCampaignPatterns.includes(r.summary)) {
          winningCampaignPatterns.push(r.summary);
        }
      }
      const compFromAttrs = isRecord(attrs)
        ? String(attrs.compositionProfileSummary ?? "").trim()
        : "";
      if (compFromAttrs && !preferredCompositionPatterns.includes(compFromAttrs)) {
        preferredCompositionPatterns.push(compFromAttrs);
      }
    }
    if (negativeOutcomes.has(r.outcome) && bannedPatterns.length < 40) {
      bannedPatterns.push(r.summary);
      for (const t of traits.slice(0, 4)) {
        if (t && !bannedPatterns.includes(t)) bannedPatterns.push(t);
      }
      for (const k of kw.slice(0, 2)) {
        if (k && !bannedPatterns.includes(k)) bannedPatterns.push(k);
      }
      if (r.type === "VISUAL") {
        for (const t of traits.slice(0, 4)) {
          if (t && !rejectedVisualTraits.includes(t)) rejectedVisualTraits.push(t);
        }
      }
      if (r.type === "TONE" || r.type === "COPY") {
        for (const k of kw.slice(0, 3)) {
          if (k && !rejectedTonePatterns.includes(k)) rejectedTonePatterns.push(k);
        }
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
    preferredVisualTraits: preferredVisualTraits.slice(0, 16),
    rejectedVisualTraits: rejectedVisualTraits.slice(0, 16),
    preferredTonePatterns: preferredTonePatterns.slice(0, 16),
    rejectedTonePatterns: rejectedTonePatterns.slice(0, 16),
    preferredCompositionPatterns: preferredCompositionPatterns.slice(0, 12),
    winningCampaignPatterns: winningCampaignPatterns.slice(0, 12),
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
      outcome: isWinner ? "SELECTED" : "REJECTED",
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
        outcome: isWinner ? "SELECTED" : "REJECTED",
        strengthScore: strength,
      },
      { skipAggregateRefresh: true },
    );
  }
  await refreshBrandMemoryAggregate(db, args.clientId);
}

export async function recordStrategyJudgeMemories(
  db: PrismaClient,
  args: { clientId: string; content: Record<string, unknown> },
): Promise<void> {
  const angles = args.content.strategicAngles;
  if (!Array.isArray(angles)) return;

  for (const a of angles) {
    if (!isRecord(a)) continue;
    const isPrimary = a.isSelectedPrimary === true;
    const isAlt = a.isAlternate === true;
    if (!isPrimary && !isAlt) continue;

    const ext = extractStrategyAngleMemory({
      strategy: args.content,
      angle: a,
      isPrimary,
    });
    const fw = String(a.frameworkId ?? "").trim() || null;
    const sel = args.content._agenticforceSelection;
    const scores = isRecord(sel) ? sel.scores : null;
    const scoreEntry =
      fw && scores && isRecord(scores) && isRecord(scores[fw])
        ? (scores[fw] as Record<string, unknown>)
        : null;
    const strength = scoreEntry
      ? (["distinctiveness", "brandAlignment", "clarity", "emotionalImpact", "nonGenericLanguage"] as const)
          .map((k) => (typeof scoreEntry[k] === "number" ? (scoreEntry[k] as number) : 0))
          .reduce((s, v) => s + v, 0) / 5
      : isPrimary
        ? 0.82
        : 0.68;

    await recordBrandMemoryEvent(
      db,
      {
        clientId: args.clientId,
        type: "STRATEGY",
        frameworkId: fw,
        summary: ext.summary,
        attributes: ext.attributes,
        outcome: "SELECTED",
        strengthScore: strength,
      },
      { skipAggregateRefresh: true },
    );
  }
  await refreshBrandMemoryAggregate(db, args.clientId);
}

export async function recordCopyJudgeMemories(
  db: PrismaClient,
  args: {
    clientId: string;
    content: Record<string, unknown>;
    headlines: string[];
  },
): Promise<void> {
  const sel = args.content._agenticforceSelection;
  if (!isRecord(sel) || sel.stage !== "COPY_HEADLINES") return;

  const primaryIdx = typeof sel.primaryHeadlineIndex === "number"
    ? sel.primaryHeadlineIndex
    : 0;
  const altRaw = Array.isArray(sel.alternateHeadlineIndices)
    ? (sel.alternateHeadlineIndices as unknown[])
    : [];
  const alternateIdxs = new Set(
    altRaw
      .map((x) => (typeof x === "number" ? x : parseInt(String(x), 10)))
      .filter((n) => Number.isFinite(n)),
  );

  const scoresBy = isRecord(sel.scoresByHeadlineIndex)
    ? (sel.scoresByHeadlineIndex as Record<string, unknown>)
    : {};

  const recordOne = async (idx: number, role: "primary" | "alternate") => {
    const text = String(args.headlines[idx] ?? "").trim();
    if (!text) return;
    const key = `h${idx}`;
    const scoreEntry = scoresBy[key];
    const s = isRecord(scoreEntry)
      ? (["distinctiveness", "brandAlignment", "clarity", "emotionalImpact", "nonGenericLanguage"] as const)
          .map((k) => (typeof scoreEntry[k] === "number" ? (scoreEntry[k] as number) : 0))
          .reduce((acc, v) => acc + v, 0) / 5
      : role === "primary"
        ? 0.8
        : 0.65;

    const keywords = text
      .toLowerCase()
      .split(/[^\w]+/)
      .filter((w) => w.length > 3)
      .slice(0, 8);

    await recordBrandMemoryEvent(
      db,
      {
        clientId: args.clientId,
        type: "COPY",
        frameworkId: String(args.content.frameworkUsed ?? "").trim() || null,
        summary: clipSummary(
          role === "primary"
            ? `Primary headline selected — ${text.slice(0, 100)}${text.length > 100 ? "…" : ""}`
            : `Alternate headline kept — ${text.slice(0, 90)}${text.length > 90 ? "…" : ""}`,
          220,
        ),
        attributes: {
          headlineRole: role,
          headlineIndex: idx,
          headlineSnippet: text.slice(0, 200),
          keywords,
          structureHints:
            role === "primary"
              ? ["primary_headline_selected"]
              : ["alternate_headline_kept"],
        },
        outcome: "SELECTED",
        strengthScore: s,
      },
      { skipAggregateRefresh: true },
    );
  };

  await recordOne(primaryIdx, "primary");
  for (const i of alternateIdxs) {
    if (i !== primaryIdx) await recordOne(i, "alternate");
  }
  await refreshBrandMemoryAggregate(db, args.clientId);
}

function clipSummary(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type BrandLearningAggregateExplainable = {
  preferredFrameworks: string[];
  rejectedFrameworks: string[];
  preferredVisualTraits: string[];
  rejectedVisualTraits: string[];
  preferredTonePatterns: string[];
  winningCampaignPatterns: string[];
};

export async function getBrandLearningAggregateExplainable(
  db: PrismaClient,
  clientId: string,
): Promise<BrandLearningAggregateExplainable> {
  const agg = await db.brandMemoryAggregate.findUnique({
    where: { clientId },
    select: { aggregatedPatterns: true },
  });
  const p = isRecord(agg?.aggregatedPatterns) ? agg!.aggregatedPatterns : {};

  const preferredFrameworks: string[] = [];
  const pfw = p.preferredFrameworks;
  if (Array.isArray(pfw)) {
    for (const x of pfw) {
      if (isRecord(x) && typeof x.frameworkId === "string" && x.frameworkId.trim()) {
        preferredFrameworks.push(String(x.frameworkId).trim());
      }
    }
  }

  const rejectedFrameworks = Array.isArray(p.bannedFrameworkHints)
    ? p.bannedFrameworkHints.map((x) => String(x)).filter(Boolean).slice(0, 8)
    : [];

  const asStrList = (v: unknown, n: number): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, n) : [];

  return {
    preferredFrameworks,
    rejectedFrameworks,
    preferredVisualTraits: asStrList(p.preferredVisualTraits, 8),
    rejectedVisualTraits: asStrList(p.rejectedVisualTraits, 8),
    preferredTonePatterns: asStrList(p.preferredTonePatterns, 8),
    winningCampaignPatterns: asStrList(p.winningCampaignPatterns, 6),
  };
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
      where: { clientId, outcome: { in: ["APPROVED", "SELECTED"] } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { summary: true, frameworkId: true, type: true },
    }),
    db.brandMemory.findMany({
      where: { clientId, outcome: { in: ["REJECTED", "FAILED"] } },
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

  const takeStrArr = (v: unknown, n: number) =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, n) : [];

  const pref = Array.isArray(p.preferredPatterns)
    ? p.preferredPatterns.map((x) => String(x)).filter(Boolean).slice(0, 3)
    : [];
  const ban = Array.isArray(p.bannedPatterns)
    ? p.bannedPatterns.map((x) => String(x)).filter(Boolean).slice(0, 3)
    : [];

  const likesVisual = takeStrArr(p.preferredVisualTraits, 3);
  const avoidVisual = takeStrArr(p.rejectedVisualTraits, 3);
  const likesTone = takeStrArr(p.preferredTonePatterns, 3);
  const winsLayout = takeStrArr(p.winningCampaignPatterns, 2);

  if (pref.length < 3 || ban.length < 3) {
    const recent = await db.brandMemory.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { summary: true, outcome: true },
    });
    for (const r of recent) {
      const pos = r.outcome === "APPROVED" || r.outcome === "SELECTED";
      const neg = r.outcome === "REJECTED" || r.outcome === "FAILED";
      if (pos && pref.length < 3 && !pref.includes(r.summary)) {
        pref.push(r.summary);
      }
      if (neg && ban.length < 3 && !ban.includes(r.summary)) {
        ban.push(r.summary);
      }
    }
  }

  return {
    preferred: pref.slice(0, 3),
    rejected: ban.slice(0, 3),
    likesVisual,
    avoidVisual,
    likesTone,
    winsLayout,
    updatedAt: agg?.updatedAt ?? null,
  };
}
