/**
 * Pre-persist quality assessment (concept / copy / optional strategy).
 * Used by the orchestrator agent runner — not stored as its own artifact type.
 */
import { z } from "zod";

export const prePersistQualitySchema = z.object({
  qualityVerdict: z.enum(["STRONG", "ACCEPTABLE", "WEAK"]),
  frameworkExecution: z.enum(["STRONG", "MIXED", "WEAK"]),
  distinctivenessAssessment: z.string().min(1),
  brandAlignmentAssessment: z.string().min(1),
  regenerationRecommended: z.boolean(),
  regenerationReasons: z.array(z.string()).max(10),
});

export type PrePersistQuality = z.infer<typeof prePersistQualitySchema>;

const GENERIC_PHRASES = [
  "unlock the power",
  "game-changer",
  "game changer",
  "cutting-edge",
  "cutting edge",
  "world-class",
  "world class",
  "best-in-class",
  "best in class",
  "leverage synerg",
  "in today's world",
  "innovative solution",
  "seamless experience",
  "take your business to the next level",
  "next level",
];

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function countGenericPhrases(text: string): number {
  const t = text.toLowerCase();
  let n = 0;
  for (const p of GENERIC_PHRASES) {
    if (t.includes(p)) n++;
  }
  return n;
}

export type DeterministicQualityResult = {
  issues: string[];
  recommendRegeneration: boolean;
};

export function deterministicConceptChecks(content: Record<string, unknown>): DeterministicQualityResult {
  const issues: string[] = [];
  const concepts = content.concepts;
  if (!Array.isArray(concepts) || concepts.length < 2) {
    return { issues, recommendRegeneration: false };
  }

  const texts = concepts.map((c) => {
    if (!c || typeof c !== "object") return "";
    const o = c as Record<string, unknown>;
    return `${String(o.hook ?? "")} ${String(o.rationale ?? "")}`;
  });

  for (let i = 0; i < texts.length; i++) {
    if (countGenericPhrases(texts[i]!) >= 2) {
      issues.push(`Concept ${i + 1}: generic marketing phrasing detected in hook/rationale.`);
    }
    if (String(concepts[i] && typeof concepts[i] === "object" ? (concepts[i] as { hook?: string }).hook : "").length < 28) {
      issues.push(`Concept ${i + 1}: hook is too short to carry a distinct idea.`);
    }
    if (String(concepts[i] && typeof concepts[i] === "object" ? (concepts[i] as { rationale?: string }).rationale : "").length < 90) {
      issues.push(`Concept ${i + 1}: rationale is thin; needs sharper strategic justification.`);
    }
  }

  const sets = texts.map(tokenize);
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const sim = jaccard(sets[i]!, sets[j]!);
      if (sim > 0.52) {
        issues.push(
          `Concepts ${i + 1} and ${j + 1} overlap heavily (${Math.round(sim * 100)}% token overlap) — routes must diverge.`,
        );
      }
    }
  }

  const hooks = concepts.map((c) =>
    c && typeof c === "object" ? String((c as { hook?: string }).hook ?? "").toLowerCase() : "",
  );
  if (hooks[0] && hooks[1] && hooks[0].length > 10 && hooks[1].length > 10) {
    const a = new Set(hooks[0].split(/\s+/).slice(0, 5));
    const b = new Set(hooks[1].split(/\s+/).slice(0, 5));
    let same = 0;
    for (const w of a) if (b.has(w)) same++;
    if (same >= 3) {
      issues.push("Opening hooks share too many of the same opening words — increase contrast.");
    }
  }

  return {
    issues,
    recommendRegeneration: issues.length >= 2 || issues.some((x) => x.includes("overlap")),
  };
}

export function deterministicCopyChecks(content: Record<string, unknown>): DeterministicQualityResult {
  const issues: string[] = [];
  const headlines = content.headlineOptions;
  if (!Array.isArray(headlines) || headlines.length < 2) {
    return { issues, recommendRegeneration: false };
  }
  const hs = headlines.map((h) => String(h).toLowerCase());
  for (let i = 0; i < hs.length; i++) {
    if (countGenericPhrases(hs[i]!) >= 1) {
      issues.push(`Headline ${i + 1} leans on generic marketing language.`);
    }
  }
  const firstWords = hs.map((h) => h.split(/\s+/).slice(0, 2).join(" "));
  const uniq = new Set(firstWords);
  if (uniq.size === 1 && hs.length >= 3) {
    issues.push("Headlines open with the same pattern — diversify angles.");
  }
  const bodies = content.bodyCopyOptions;
  if (Array.isArray(bodies)) {
    const joined = bodies.map((b) => String(b)).join(" ");
    if (countGenericPhrases(joined) >= 3) {
      issues.push("Body copy contains multiple generic filler phrases.");
    }
  }
  return {
    issues,
    recommendRegeneration: issues.length >= 2,
  };
}

export function deterministicStrategyChecks(content: Record<string, unknown>): DeterministicQualityResult {
  const issues: string[] = [];
  const prop = String(content.proposition ?? "");
  if (prop.length < 40) {
    issues.push("Proposition is too short to be single-minded and testable.");
  }
  if (countGenericPhrases(prop) >= 1) {
    issues.push("Proposition uses generic phrasing.");
  }
  const angles = content.strategicAngles;
  if (Array.isArray(angles) && angles.length >= 2) {
    const texts = angles.map((a) =>
      a && typeof a === "object" ? String((a as { angle?: string }).angle ?? "") : "",
    );
    const sim = jaccard(tokenize(texts[0]!), tokenize(texts[1]!));
    if (sim > 0.55) {
      issues.push("Strategic angles overlap — differentiate framework applications.");
    }
  }
  return {
    issues,
    recommendRegeneration: issues.length >= 2,
  };
}
