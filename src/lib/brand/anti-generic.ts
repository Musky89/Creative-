/**
 * Deterministic anti-generic checks (no ML). Used by pre-persist quality + optional LLM context.
 * Verbal clichés are centralized in `bad-output-blacklist.ts`.
 */
import {
  BAD_OUTPUT_VERBAL_PHRASES,
  findBadOutputVerbalHits,
} from "./bad-output-blacklist";

/** @deprecated Use BAD_OUTPUT_VERBAL_PHRASES — kept for external imports. */
export const DEFAULT_GENERIC_MARKETING_PHRASES = BAD_OUTPUT_VERBAL_PHRASES;

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Substring hits for known generic marketing clichés (bad-output verbal blacklist). */
export function findGenericMarketingHits(text: string): string[] {
  return findBadOutputVerbalHits(text);
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
  stage:
    | "STRATEGY"
    | "CONCEPTING"
    | "VISUAL_DIRECTION"
    | "COPY_DEVELOPMENT"
    | "IDENTITY_STRATEGY"
    | "IDENTITY_ROUTING",
  content: Record<string, unknown>,
): string {
  const parts: string[] = [];
  if (stage === "IDENTITY_STRATEGY") {
    parts.push(
      String(content.brandCoreIdea ?? ""),
      String(content.visualTensions ?? ""),
    );
    for (const key of [
      "symbolicTerritories",
      "identityArchetypes",
      "semanticDirections",
      "whatTheIdentityMustSignal",
      "whatTheIdentityMustAvoid",
      "explorationHooks",
    ] as const) {
      const v = content[key];
      if (Array.isArray(v)) parts.push(...v.map((x) => String(x)));
    }
  } else if (stage === "IDENTITY_ROUTING") {
    parts.push(
      String(content.frameworkUsed ?? ""),
      String(content.routeDifferentiationSummary ?? ""),
    );
    const pd = content.pairwiseDifferentiation;
    if (pd && typeof pd === "object") {
      parts.push(JSON.stringify(pd));
    }
    const routes = content.routes;
    if (Array.isArray(routes)) {
      for (const r of routes) {
        if (!r || typeof r !== "object") continue;
        const o = r as Record<string, unknown>;
        parts.push(
          String(o.routeName ?? ""),
          String(o.routeType ?? ""),
          String(o.coreConcept ?? ""),
          String(o.symbolicLogic ?? ""),
          String(o.typographyLogic ?? ""),
          String(o.geometryLogic ?? ""),
          String(o.distinctivenessRationale ?? ""),
          String(o.whyItWorksForBrand ?? ""),
          String(o.coreTension ?? ""),
          String(o.emotionalCenter ?? ""),
          String(o.whyBeatsCategoryNorm ?? ""),
          String(o.whyCouldFail ?? ""),
          String(o.distinctVisualWorld ?? ""),
          String(o.markExplorationSeed ?? ""),
        );
        const al = o.avoidList;
        if (Array.isArray(al)) parts.push(...al.map((x) => String(x)));
        const rs = o.risks;
        if (Array.isArray(rs)) parts.push(...rs.map((x) => String(x)));
      }
    }
    const lr = content.logoExplorationReadiness;
    if (lr && typeof lr === "object") {
      const o = lr as Record<string, unknown>;
      const c = o.systemConstraintsForMarks;
      if (Array.isArray(c)) parts.push(...c.map((x) => String(x)));
    }
  } else if (stage === "STRATEGY") {
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
    const cpd = content.pairwiseDifferentiation;
    if (cpd && typeof cpd === "object") {
      parts.push(JSON.stringify(cpd));
    }
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
          String(o.coreTension ?? ""),
          String(o.emotionalCenter ?? ""),
          String(o.whyBeatsCategoryNorm ?? ""),
          String(o.whyCouldFail ?? ""),
          String(o.distinctVisualWorld ?? ""),
        );
      }
    }
  } else if (stage === "VISUAL_DIRECTION") {
    const keys = [
      "visualObjective",
      "whyItWorksForBrand",
      "mood",
      "emotionalTone",
      "composition",
      "colorDirection",
      "textureDirection",
      "lightingDirection",
      "typographyDirection",
      "imageStyle",
      "referenceLogic",
      "distinctivenessNotes",
      "optionalPromptSeed",
    ] as const;
    for (const k of keys) {
      parts.push(String(content[k] ?? ""));
    }
    const avoid = content.avoidList;
    if (Array.isArray(avoid)) parts.push(...avoid.map((x) => String(x)));
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
