/**
 * Pre-persist quality assessment (concept / copy / optional strategy).
 * Used by the orchestrator agent runner — not stored as its own artifact type.
 */
import {
  collectArtifactTextForQuality,
  findBannedPhraseHits,
  findGenericMarketingHits,
  findVagueMarketingAdjectives,
} from "@/lib/brand/anti-generic";
import {
  mergeCreativeDnaToneIssues,
  type BrandCreativeDnaForChecks,
} from "@/lib/brand/creative-dna-tone-checks";
import { mergeBadOutputBlacklistIssues } from "@/lib/brand/bad-output-blacklist";
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

/** Validate pairwiseDifferentiation covers all unordered pairs with valid indices. */
function pairwiseStructureIssues(
  itemCount: number,
  pairwise: unknown,
  label: string,
): string[] {
  const issues: string[] = [];
  if (!pairwise || typeof pairwise !== "object") {
    issues.push(`${label}: pairwiseDifferentiation is required — compare every route pair (overlap, difference, strongest per pair).`);
    return issues;
  }
  const p = pairwise as Record<string, unknown>;
  const pairs = p.pairComparisons;
  if (!Array.isArray(pairs)) {
    issues.push(`${label}: pairwiseDifferentiation.pairComparisons must be an array.`);
    return issues;
  }
  const need = (itemCount * (itemCount - 1)) / 2;
  if (pairs.length !== need) {
    issues.push(
      `${label}: expected ${need} pairwise comparisons for ${itemCount} items, got ${pairs.length}.`,
    );
  }
  const seen = new Set<string>();
  for (const row of pairs) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const li = Number(o.leftIndex);
    const ri = Number(o.rightIndex);
    if (!Number.isInteger(li) || !Number.isInteger(ri) || li === ri) {
      issues.push(`${label}: invalid pair indices in pairwiseDifferentiation.`);
      continue;
    }
    const a = Math.min(li, ri);
    const b = Math.max(li, ri);
    if (a < 0 || b >= itemCount) {
      issues.push(`${label}: pair indices out of range for ${itemCount} items.`);
      continue;
    }
    const key = `${a}-${b}`;
    if (seen.has(key)) {
      issues.push(`${label}: duplicate pair (${a}, ${b}) in pairwiseDifferentiation.`);
    }
    seen.add(key);
  }
  if (pairs.length === need && seen.size !== need) {
    issues.push(`${label}: pairwise set incomplete or duplicate — must cover each unordered pair exactly once.`);
  }
  return issues;
}

export type DeterministicQualityResult = {
  issues: string[];
  recommendRegeneration: boolean;
};

/** Deterministic anti-generic + Brand OS banned phrase pass (feeds quality loop). */
export function mergeAntiGenericIssues(
  stage:
    | "STRATEGY"
    | "CONCEPTING"
    | "VISUAL_DIRECTION"
    | "COPY_DEVELOPMENT"
    | "IDENTITY_STRATEGY"
    | "IDENTITY_ROUTING",
  content: Record<string, unknown>,
  bannedPhrases: string[],
  creativeDna?: BrandCreativeDnaForChecks | null,
): DeterministicQualityResult {
  const blob = collectArtifactTextForQuality(stage, content);
  const issues: string[] = [];
  const gen = findGenericMarketingHits(blob);
  const bannedHits = findBannedPhraseHits(blob, bannedPhrases);
  const vague = findVagueMarketingAdjectives(blob);

  if (bannedHits.length) {
    issues.push(
      `Brand OS banned phrase(s) in draft: ${bannedHits.slice(0, 8).join("; ")} — remove or rephrase.`,
    );
  }
  if (gen.length >= 2) {
    issues.push(
      `Anti-generic: multiple cliché phrases (${gen.slice(0, 5).join(", ")}) — use specific, brand-grounded language.`,
    );
  } else if (
    gen.length === 1 &&
    (stage === "COPY_DEVELOPMENT" ||
      stage === "CONCEPTING" ||
      stage === "VISUAL_DIRECTION")
  ) {
    issues.push(`Anti-generic: "${gen[0]}" reads as generic filler — replace.`);
  }
  if (vague.length >= 4) {
    issues.push(
      `Anti-generic: stacked vague adjectives (${vague.slice(0, 6).join(", ")}) — add concrete proof or imagery.`,
    );
  }

  let recommendRegeneration =
    bannedHits.length > 0 ||
    gen.length >= 2 ||
    (stage === "COPY_DEVELOPMENT" && gen.length >= 1) ||
    (stage === "VISUAL_DIRECTION" && gen.length >= 1) ||
    (stage === "IDENTITY_STRATEGY" && gen.length >= 1) ||
    (stage === "IDENTITY_ROUTING" && gen.length >= 1) ||
    vague.length >= 4;

  const bl = mergeBadOutputBlacklistIssues(stage, content);
  issues.push(...bl.issues);
  recommendRegeneration = recommendRegeneration || bl.recommendRegeneration;

  if (
    creativeDna &&
    (stage === "STRATEGY" ||
      stage === "CONCEPTING" ||
      stage === "VISUAL_DIRECTION" ||
      stage === "COPY_DEVELOPMENT")
  ) {
    const dnaTone = mergeCreativeDnaToneIssues(blob, creativeDna, stage);
    issues.push(...dnaTone.issues);
    recommendRegeneration = recommendRegeneration || dnaTone.recommendRegeneration;
  }

  return { issues, recommendRegeneration };
}

const IDENTITY_SLOP_TERMS = [
  "futuristic",
  "sleek",
  "innovative design",
  "next-gen",
  "next gen",
  "dynamic logo",
  "abstract shapes",
  "meaningful connection",
  "node network",
  "globe icon",
] as const;

export function deterministicIdentityStrategyChecks(
  content: Record<string, unknown>,
): DeterministicQualityResult {
  const issues: string[] = [];
  const core = String(content.brandCoreIdea ?? "");
  if (core.length < 48) {
    issues.push(
      "brandCoreIdea is too thin — needs a single-minded, testable identity idea.",
    );
  }
  const avoid = content.whatTheIdentityMustAvoid;
  if (!Array.isArray(avoid) || avoid.length < 2) {
    issues.push(
      "whatTheIdentityMustAvoid must list concrete clichés and off-brand patterns.",
    );
  } else {
    const joined = avoid.map((x) => String(x).toLowerCase()).join(" ");
    if (joined.length < 40) {
      issues.push(
        "whatTheIdentityMustAvoid entries are too vague — name real tropes to reject.",
      );
    }
  }
  const blob = [
    core,
    String(content.symbolicTerritories ?? ""),
    String(content.semanticDirections ?? ""),
  ]
    .join("\n")
    .toLowerCase();
  for (const t of IDENTITY_SLOP_TERMS) {
    if (blob.includes(t)) {
      issues.push(
        `Identity strategy leans on generic/trend language ("${t}") — replace with brand-specific reasoning.`,
      );
      break;
    }
  }
  return {
    issues,
    recommendRegeneration: issues.length >= 2,
  };
}

export function deterministicIdentityRoutesChecks(
  content: Record<string, unknown>,
): DeterministicQualityResult {
  const issues: string[] = [];
  const routes = content.routes;
  if (!Array.isArray(routes) || routes.length < 3) {
    return {
      issues: ["routes must include 3–5 distinct objects."],
      recommendRegeneration: true,
    };
  }

  issues.push(...pairwiseStructureIssues(routes.length, content.pairwiseDifferentiation, "Identity routes"));

  const pd = content.pairwiseDifferentiation;
  if (pd && typeof pd === "object") {
    const po = pd as Record<string, unknown>;
    const agg = String(po.aggregateOverlap ?? "");
    const ds = String(po.differentiationSummary ?? "");
    if (agg.length < 50) {
      issues.push("Identity pairwise: aggregateOverlap too thin — name where routes blur vs split.");
    }
    if (ds.length < 90) {
      issues.push("Identity pairwise: differentiationSummary too thin — synthesize A vs B vs C.");
    }
    const si = po.strongestRouteIndex;
    const wi = po.weakestRouteIndex;
    if (
      typeof si === "number" &&
      typeof wi === "number" &&
      si === wi &&
      routes.length > 1
    ) {
      issues.push("Identity pairwise: strongest and weakest route index must not be identical when multiple routes exist.");
    }
  }

  const types: string[] = [];
  const blobs: string[] = [];
  for (let i = 0; i < routes.length; i++) {
    const r = routes[i];
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    types.push(String(o.routeType ?? ""));
    const piece = [
      String(o.coreConcept ?? ""),
      String(o.symbolicLogic ?? ""),
      String(o.geometryLogic ?? ""),
      String(o.typographyLogic ?? ""),
      String(o.coreTension ?? ""),
      String(o.distinctVisualWorld ?? ""),
      String(o.whyBeatsCategoryNorm ?? ""),
    ].join(" ");
    blobs.push(piece);
    if (String(o.distinctVisualWorld ?? "").length < 50) {
      issues.push(
        `Route ${i + 1}: distinctVisualWorld is too thin — describe a non-interchangeable visual/mark world.`,
      );
    }
    if (String(o.whyCouldFail ?? "").length < 35) {
      issues.push(`Route ${i + 1}: whyCouldFail must name a real risk.`);
    }
    if (String(o.symbolicLogic ?? "").length < 55) {
      issues.push(
        `Route ${i + 1}: symbolicLogic is too thin — needs executable symbolic reasoning.`,
      );
    }
    if (String(o.distinctivenessRationale ?? "").length < 45) {
      issues.push(
        `Route ${i + 1}: distinctivenessRationale is weak — explain non-interchangeability vs competitors.`,
      );
    }
    const al = o.avoidList;
    if (!Array.isArray(al) || al.length < 2) {
      issues.push(
        `Route ${i + 1}: avoidList must constrain clichés and slop patterns.`,
      );
    }
  }

  const uniqTypes = new Set(types.filter(Boolean));
  if (uniqTypes.size < 2 && routes.length >= 3) {
    issues.push(
      "Routes should vary routeType more (wordmark vs symbol vs monogram, etc.).",
    );
  }

  const sets = blobs.map(tokenize);
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const sim = jaccard(sets[i]!, sets[j]!);
      if (sim > 0.48) {
        issues.push(
          `Routes ${i + 1} and ${j + 1} overlap heavily (${Math.round(sim * 100)}% token overlap) — diverge mark logic and geometry.`,
        );
      }
    }
  }

  const joined = blobs.join("\n").toLowerCase();
  if (IDENTITY_SLOP_TERMS.some((t) => joined.includes(t))) {
    issues.push(
      "Route pack uses trend/slop vocabulary — ground in brand-specific construction logic.",
    );
  }

  return {
    issues,
    recommendRegeneration:
      issues.length >= 2 ||
      issues.some((x) => x.includes("overlap")) ||
      issues.some((x) => x.includes("pairwise")),
  };
}

const VISUAL_VIBE_ONLY = [
  "luxury",
  "high-end",
  "high end",
  "premium feel",
  "cinematic",
  "epic",
  "stunning",
  "beautiful",
  "elegant",
  "sophisticated",
  "minimal",
  "clean",
  "modern",
] as const;

function countVisualVibePhrases(text: string): number {
  const t = text.toLowerCase();
  let n = 0;
  for (const p of VISUAL_VIBE_ONLY) {
    if (t.includes(p)) n++;
  }
  return n;
}

export function deterministicVisualSpecChecks(
  content: Record<string, unknown>,
): DeterministicQualityResult {
  const issues: string[] = [];
  const blob = [
    String(content.visualObjective ?? ""),
    String(content.mood ?? ""),
    String(content.emotionalTone ?? ""),
    String(content.composition ?? ""),
    String(content.colorDirection ?? ""),
    String(content.imageStyle ?? ""),
    String(content.distinctivenessNotes ?? ""),
    String(content.whyItWorksForBrand ?? ""),
  ].join("\n");

  if (countVisualVibePhrases(blob) >= 4) {
    issues.push(
      "Visual spec leans on generic aesthetic words (luxury/cinematic/minimal/etc.) without enough concrete art-direction detail — add specifics.",
    );
  }

  const avoid = content.avoidList;
  if (!Array.isArray(avoid) || avoid.length < 2) {
    issues.push("avoidList must meaningfully constrain what not to do.");
  } else {
    const joined = avoid.map((x) => String(x).toLowerCase()).join(" ");
    if (joined.length < 24) {
      issues.push("avoidList entries are too thin — spell out clichés and AI-slop patterns to exclude.");
    }
  }

  const ref = String(content.referenceLogic ?? "");
  if (ref.length < 35) {
    issues.push("referenceLogic is too vague — define how references are used (era, medium, what to avoid).");
  }

  return {
    issues,
    recommendRegeneration: issues.length >= 1,
  };
}

export function deterministicConceptChecks(content: Record<string, unknown>): DeterministicQualityResult {
  const issues: string[] = [];
  const concepts = content.concepts;
  if (!Array.isArray(concepts) || concepts.length < 6) {
    if (Array.isArray(concepts) && concepts.length > 0 && concepts.length < 6) {
      issues.push("Concept pack must include at least 6 distinct routes for competitive selection.");
    }
    return { issues, recommendRegeneration: issues.length > 0 };
  }

  const fwIds = concepts.map((c) =>
    c && typeof c === "object"
      ? String((c as Record<string, unknown>).frameworkId ?? "").trim()
      : "",
  );
  if (new Set(fwIds.filter(Boolean)).size !== fwIds.filter(Boolean).length) {
    issues.push("Each concept must use a unique frameworkId (no duplicates in the pack).");
  }

  issues.push(...pairwiseStructureIssues(concepts.length, content.pairwiseDifferentiation, "Concept pack"));

  const cpd = content.pairwiseDifferentiation;
  if (cpd && typeof cpd === "object") {
    const po = cpd as Record<string, unknown>;
    const agg = String(po.aggregateOverlap ?? "");
    const ds = String(po.differentiationSummary ?? "");
    if (agg.length < 50) {
      issues.push("Concept pairwise: aggregateOverlap too thin — where do concepts blur?");
    }
    if (ds.length < 90) {
      issues.push("Concept pairwise: differentiationSummary too thin — explain A vs B (vs C) in one synthesis.");
    }
  }

  const texts = concepts.map((c) => {
    if (!c || typeof c !== "object") return "";
    const o = c as Record<string, unknown>;
    return `${String(o.hook ?? "")} ${String(o.rationale ?? "")} ${String(o.whyItWorksForBrand ?? "")} ${String(o.distinctivenessVsCategory ?? "")} ${String(o.distinctVisualWorld ?? "")} ${String(o.coreTension ?? "")} ${String(o.whyBeatsCategoryNorm ?? "")}`;
  });

  for (let i = 0; i < texts.length; i++) {
    if (findGenericMarketingHits(texts[i]!).length >= 2) {
      issues.push(`Concept ${i + 1}: generic marketing phrasing detected in hook/rationale.`);
    }
    if (String(concepts[i] && typeof concepts[i] === "object" ? (concepts[i] as { hook?: string }).hook : "").length < 28) {
      issues.push(`Concept ${i + 1}: hook is too short to carry a distinct idea.`);
    }
    if (String(concepts[i] && typeof concepts[i] === "object" ? (concepts[i] as { rationale?: string }).rationale : "").length < 90) {
      issues.push(`Concept ${i + 1}: rationale is thin; needs sharper strategic justification.`);
    }
    const why = String(
      concepts[i] && typeof concepts[i] === "object"
        ? (concepts[i] as { whyItWorksForBrand?: string }).whyItWorksForBrand
        : "",
    );
    if (why.length < 36) {
      issues.push(
        `Concept ${i + 1}: whyItWorksForBrand is too thin — tie the route to Brand OS and positioning with specifics.`,
      );
    }
    const o = concepts[i] as Record<string, unknown>;
    if (String(o.distinctVisualWorld ?? "").length < 50) {
      issues.push(
        `Concept ${i + 1}: distinctVisualWorld too thin — must be a differentiated visual world, not a rephrase of visualDirection only.`,
      );
    }
    if (String(o.whyBeatsCategoryNorm ?? "").length < 45) {
      issues.push(`Concept ${i + 1}: whyBeatsCategoryNorm must explain edge vs category default.`);
    }
    if (String(o.distinctivenessVsCategory ?? "").length < 45) {
      issues.push(
        `Concept ${i + 1}: distinctivenessVsCategory must state a sharp category edge (not a hook paraphrase).`,
      );
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
    recommendRegeneration:
      issues.length >= 2 ||
      issues.some((x) => x.includes("overlap")) ||
      issues.some((x) => x.includes("pairwise")),
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
    if (findGenericMarketingHits(hs[i]!).length >= 1) {
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
    if (findGenericMarketingHits(joined).length >= 3) {
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
  if (findGenericMarketingHits(prop).length >= 1) {
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
