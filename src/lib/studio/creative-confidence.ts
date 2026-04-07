import {
  averageCreativeQualityScore,
  creativeQualityScoreEntrySchema,
} from "@/lib/creative/creative-quality-score";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseScoreEntry(v: unknown): number | null {
  const p = creativeQualityScoreEntrySchema.safeParse(v);
  if (!p.success) return null;
  return averageCreativeQualityScore(p.data);
}

function avgNumbers(vals: number[]): number | null {
  const n = vals.filter((x) => Number.isFinite(x));
  if (n.length === 0) return null;
  return n.reduce((a, b) => a + b, 0) / n.length;
}

/**
 * Derive 0–10 "creative confidence" and short bullets from latest judge scores on artifacts.
 */
export function computeCreativeConfidence(args: {
  strategyContent: unknown;
  conceptContent: unknown;
  copyContent: unknown;
  reviewContent: unknown;
}): { score10: number | null; bullets: string[] } {
  const scores: number[] = [];
  const bullets: string[] = [];

  const strat = args.strategyContent;
  if (isRecord(strat) && isRecord(strat._agenticforceSelection)) {
    const sc = strat._agenticforceSelection.scores;
    if (isRecord(sc)) {
      for (const v of Object.values(sc)) {
        const a = parseScoreEntry(v);
        if (a != null) scores.push(a);
      }
    }
    if (scores.length) {
      bullets.push("Strategic angles scored strong on-brand and distinct.");
    }
  }

  const concept = args.conceptContent;
  if (isRecord(concept) && isRecord(concept._agenticforceSelection)) {
    const sc = concept._agenticforceSelection.scores;
    if (isRecord(sc)) {
      for (const v of Object.values(sc)) {
        const a = parseScoreEntry(v);
        if (a != null) scores.push(a);
      }
    }
    if (bullets.length < 3) {
      bullets.push("Creative routes ranked for memorability and fit.");
    }
  }

  const copy = args.copyContent;
  if (isRecord(copy) && isRecord(copy._agenticforceSelection)) {
    const sc = copy._agenticforceSelection.scoresByHeadlineIndex;
    if (isRecord(sc)) {
      for (const v of Object.values(sc)) {
        const a = parseScoreEntry(v);
        if (a != null) scores.push(a);
      }
    }
    if (bullets.length < 3) {
      bullets.push("Headlines tournament-selected for clarity and punch.");
    }
  }

  const review = args.reviewContent;
  if (isRecord(review)) {
    const qv = String(review.qualityVerdict ?? "");
    const bar = String(review.creativeBarVerdict ?? "");
    if (qv === "STRONG" || bar === "STRONG") {
      scores.push(0.88);
      if (bullets.length < 3) {
        bullets.push("Brand review flagged the work as campaign-ready.");
      }
    } else if (qv === "ACCEPTABLE" || bar === "ACCEPTABLE") {
      scores.push(0.72);
      if (bullets.length < 3) {
        bullets.push("Brand review: acceptable — room to push further if you want.");
      }
    }
  }

  const avg = avgNumbers(scores);
  const score10 =
    avg != null ? Math.min(10, Math.max(0, Math.round(avg * 10 * 10) / 10)) : null;

  while (bullets.length < 3) {
    if (scores.length === 0) {
      bullets.push("Generate the campaign to unlock scored creative picks.");
      break;
    }
    bullets.push("Selections use pairwise comparison across candidates.");
    if (bullets.length >= 3) break;
    bullets.push("Scores blend distinctiveness, brand fit, and non-generic language.");
    if (bullets.length >= 3) break;
  }

  return {
    score10,
    bullets: bullets.slice(0, 3),
  };
}
