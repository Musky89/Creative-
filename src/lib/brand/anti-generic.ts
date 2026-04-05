/**
 * Deterministic anti-generic checks (no ML). Used by pre-persist quality + optional LLM context.
 */

export const DEFAULT_GENERIC_MARKETING_PHRASES = [
  "high quality",
  "highest quality",
  "premium feel",
  "best in class",
  "best-in-class",
  "world class",
  "world-class",
  "innovative solution",
  "cutting edge",
  "cutting-edge",
  "unlock the power",
  "game-changer",
  "game changer",
  "seamless experience",
  "next level",
  "take your business to the next level",
  "leverage synerg",
  "in today's world",
  "leading provider",
  "customer-centric",
  "state of the art",
  "state-of-the-art",
  "think outside the box",
  "synergy",
  "holistic approach",
  "robust solution",
  "empower your",
  "revolutionize",
] as const;

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Substring hits for known generic marketing clichés. */
export function findGenericMarketingHits(text: string): string[] {
  const t = norm(text);
  const hits: string[] = [];
  for (const p of DEFAULT_GENERIC_MARKETING_PHRASES) {
    if (t.includes(p)) hits.push(p);
  }
  return [...new Set(hits)];
}

/** Client-configured banned phrases (substring match, case-insensitive). */
export function findBannedPhraseHits(text: string, banned: string[]): string[] {
  if (!banned.length || !text.trim()) return [];
  const t = norm(text);
  const hits: string[] = [];
  for (const raw of banned) {
    const p = norm(raw);
    if (p.length < 2) continue;
    if (t.includes(p)) hits.push(raw.trim());
  }
  return [...new Set(hits)];
}

/** Common vague / empty marketing adjectives (word-boundary match). */
const VAGUE_ADJECTIVES = [
  "innovative",
  "powerful",
  "dynamic",
  "unique",
  "amazing",
  "incredible",
  "exceptional",
  "outstanding",
  "remarkable",
] as const;

export function findVagueMarketingAdjectives(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  for (const w of VAGUE_ADJECTIVES) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(t)) found.push(w);
  }
  return [...new Set(found)];
}

export function collectArtifactTextForQuality(
  stage: "STRATEGY" | "CONCEPTING" | "COPY_DEVELOPMENT",
  content: Record<string, unknown>,
): string {
  const parts: string[] = [];
  if (stage === "STRATEGY") {
    parts.push(
      String(content.objective ?? ""),
      String(content.audience ?? ""),
      String(content.insight ?? ""),
      String(content.proposition ?? ""),
    );
    const pillars = content.messagePillars;
    if (Array.isArray(pillars)) parts.push(...pillars.map((x) => String(x)));
    const angles = content.strategicAngles;
    if (Array.isArray(angles)) {
      for (const a of angles) {
        if (a && typeof a === "object" && "angle" in a) {
          parts.push(String((a as { angle?: string }).angle ?? ""));
        }
      }
    }
  } else if (stage === "CONCEPTING") {
    const concepts = content.concepts;
    if (Array.isArray(concepts)) {
      for (const c of concepts) {
        if (!c || typeof c !== "object") continue;
        const o = c as Record<string, unknown>;
        parts.push(
          String(o.hook ?? ""),
          String(o.rationale ?? ""),
          String(o.visualDirection ?? ""),
          String(o.whyItWorksForBrand ?? ""),
        );
      }
    }
  } else {
    const heads = content.headlineOptions;
    const bodies = content.bodyCopyOptions;
    const ctas = content.ctaOptions;
    if (Array.isArray(heads)) parts.push(...heads.map((x) => String(x)));
    if (Array.isArray(bodies)) parts.push(...bodies.map((x) => String(x)));
    if (Array.isArray(ctas)) parts.push(...ctas.map((x) => String(x)));
  }
  return parts.join("\n");
}
