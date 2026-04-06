/**
 * Deterministic specificity engine — flags vague / generic drafts before persistence.
 * Merged into pre-persist quality loop; critiques flow into regeneration user prompt.
 */

/** Mirrors QualityLoopStage — kept local to avoid circular imports with quality-loop.ts */
export type SpecificityQualityStage =
  | "STRATEGY"
  | "IDENTITY_STRATEGY"
  | "IDENTITY_ROUTING"
  | "CONCEPTING"
  | "VISUAL_DIRECTION"
  | "COPY_DEVELOPMENT";

export type SpecificityAnchorContext = {
  /** Lowercase tokens (length ≥ 4) from brief + brand — draft should echo a few. */
  anchorTokens: string[];
  clientName: string;
  briefTitle: string;
};

const STOPWORDS = new Set([
  "that",
  "this",
  "with",
  "from",
  "your",
  "our",
  "their",
  "have",
  "been",
  "will",
  "would",
  "could",
  "should",
  "about",
  "into",
  "through",
  "after",
  "before",
  "between",
  "under",
  "over",
  "more",
  "most",
  "some",
  "such",
  "than",
  "then",
  "them",
  "these",
  "those",
  "what",
  "when",
  "where",
  "which",
  "while",
  "whose",
  "being",
  "each",
  "other",
  "only",
  "also",
  "just",
  "like",
  "make",
  "made",
  "many",
  "much",
  "very",
  "well",
  "work",
  "works",
  "brand",
  "brief",
  "must",
  "need",
  "needs",
]);

/** Abstract / empty superlatives — replace with concrete execution detail. */
const ABSTRACT_SUBSTRINGS = [
  "premium",
  "high-quality",
  "high quality",
  "highest quality",
  "top quality",
  "innovative",
  "innovation",
  "world-class",
  "world class",
  "cutting-edge",
  "cutting edge",
  "best-in-class",
  "best in class",
  "game-changer",
  "game changer",
  "next level",
  "next-level",
  "seamless",
  "holistic",
  "robust",
  "leverage",
  "synergy",
  "elevate",
  "empower",
] as const;

/** Claims that could apply to almost any B2C / brand. */
const GENERIC_CLAIM_SUBSTRINGS = [
  "for everyone",
  "for all your",
  "whatever your",
  "no matter who",
  "trusted by millions",
  "industry leading",
  "industry-leading",
  "leading provider",
  "market leader",
  "the future of",
  "reimagining",
  "reimagine",
  "unlock your",
  "transform your",
  "take your business",
] as const;

/** Hints of concrete visual execution (material, light, lens, layout). */
const VISUAL_CONCRETE_LEXICON = [
  "linen",
  "wool",
  "cotton",
  "silk",
  "glass",
  "paper",
  "metal",
  "steel",
  "wood",
  "concrete",
  "marble",
  "ceramic",
  "leather",
  "fabric",
  "weave",
  "grain",
  "slub",
  "matte",
  "gloss",
  "sheen",
  "macro",
  "wide",
  "overhead",
  "eye level",
  "rim light",
  "daylight",
  "window",
  "softbox",
  "bounce",
  "tungsten",
  "fluorescent",
  "hard light",
  "soft light",
  "negative space",
  "rule of thirds",
  "centered",
  "asymmetric",
  "shallow depth",
  "deep focus",
  "f/1",
  "f/2",
  "f/4",
  "50mm",
  "85mm",
  "backdrop",
  "set build",
  "still life",
  "location",
  "studio",
  "natural light",
  "golden hour",
  "shadow",
  "highlight",
  "specular",
  "diffused",
] as const;

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function findAbstractLanguageHits(text: string): string[] {
  const t = norm(text);
  const hits: string[] = [];
  for (const p of ABSTRACT_SUBSTRINGS) {
    if (t.includes(p)) hits.push(p);
  }
  return [...new Set(hits)];
}

export function findGenericClaimHits(text: string): string[] {
  const t = norm(text);
  const hits: string[] = [];
  for (const p of GENERIC_CLAIM_SUBSTRINGS) {
    if (t.includes(p)) hits.push(p);
  }
  return [...new Set(hits)];
}

function countVisualConcreteTokens(text: string): number {
  const t = norm(text);
  let n = 0;
  for (const w of VISUAL_CONCRETE_LEXICON) {
    if (t.includes(w)) n++;
  }
  return n;
}

/** Extract anchor tokens from founder-facing context strings. */
export type SpecificityBriefContextSlice = {
  clientName: string;
  briefTitle: string;
  briefBusinessObjective: string;
  briefCommunicationObjective: string;
  briefTargetAudience: string;
  briefKeyMessage: string;
  brandPositioning: string;
  brandAudience: string;
  brandTone: string;
  brandPillars: string[];
};

export function buildSpecificityAnchorsFromBriefContext(
  c: SpecificityBriefContextSlice,
): SpecificityAnchorContext {
  const parts = [
    c.clientName,
    c.briefTitle,
    c.briefBusinessObjective,
    c.briefCommunicationObjective,
    c.briefTargetAudience,
    c.briefKeyMessage,
    c.brandPositioning,
    c.brandAudience,
    c.brandTone,
    ...c.brandPillars,
  ];
  return {
    clientName: c.clientName,
    briefTitle: c.briefTitle,
    anchorTokens: buildSpecificityAnchorTokens(parts),
  };
}

export function buildSpecificityAnchorTokens(parts: string[]): string[] {
  const blob = parts.map((p) => norm(p)).join(" ");
  const words = blob.split(/[^a-z0-9]+/i).filter((w) => w.length >= 4);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    const lw = w.toLowerCase();
    if (STOPWORDS.has(lw)) continue;
    if (seen.has(lw)) continue;
    seen.add(lw);
    out.push(lw);
    if (out.length >= 48) break;
  }
  return out;
}

function countAnchorHits(text: string, anchors: string[]): number {
  if (!anchors.length) return 999;
  const t = norm(text);
  let n = 0;
  for (const a of anchors) {
    if (a.length < 4) continue;
    if (t.includes(a)) n++;
  }
  return n;
}

export const SPECIFICITY_REGEN_HINTS = [
  "Replace abstraction with concrete execution detail (materials, behaviors, proof, scene, mechanism).",
  "Anchor every major claim in this client's brand, audience, and brief — name the tension or proof class.",
].join(" ");

export type SpecificityEngineResult = {
  issues: string[];
  recommendRegeneration: boolean;
};

/**
 * Stage-specific specificity checks. Runs after anti-generic merge in the quality loop.
 */
export function mergeSpecificityEngineIssues(
  stage: SpecificityQualityStage,
  content: Record<string, unknown>,
  anchors: SpecificityAnchorContext | null,
): SpecificityEngineResult {
  const issues: string[] = [];
  const anchorList = anchors?.anchorTokens ?? [];
  const minAnchors =
    anchorList.length >= 8 ? 2 : anchorList.length >= 4 ? 1 : 0;

  const pushAbstract = (label: string, text: string) => {
    const abs = findAbstractLanguageHits(text);
    if (abs.length >= 1) {
      issues.push(
        `${label}: abstract/vague vocabulary (${abs.slice(0, 6).join(", ")}) — replace abstraction with concrete execution detail; anchor in brand and audience.`,
      );
    }
    const gen = findGenericClaimHits(text);
    if (gen.length >= 1) {
      issues.push(
        `${label}: generic claim pattern (${gen.slice(0, 4).join(", ")}) — could apply to any brand; anchor in this client and brief.`,
      );
    }
  };

  if (stage === "STRATEGY") {
    const blob = [
      String(content.objective ?? ""),
      String(content.audience ?? ""),
      String(content.insight ?? ""),
      String(content.proposition ?? ""),
    ].join("\n");
    pushAbstract("Strategy", blob);
    if (minAnchors > 0 && countAnchorHits(blob, anchorList) < minAnchors) {
      issues.push(
        `Strategy: weak brief/brand anchoring — echo concrete terms from the client or brief (e.g. "${anchors?.briefTitle.slice(0, 48) ?? "brief"}"). ${SPECIFICITY_REGEN_HINTS}`,
      );
    }
  } else if (stage === "CONCEPTING") {
    const concepts = content.concepts;
    if (Array.isArray(concepts)) {
      concepts.forEach((c, i) => {
        if (!c || typeof c !== "object") return;
        const o = c as Record<string, unknown>;
        const piece = `${String(o.hook ?? "")} ${String(o.rationale ?? "")} ${String(o.visualDirection ?? "")} ${String(o.whyItWorksForBrand ?? "")}`;
        pushAbstract(`Concept ${i + 1}`, piece);
        if (minAnchors > 0 && countAnchorHits(piece, anchorList) < 1) {
          issues.push(
            `Concept ${i + 1}: rationale/visualDirection does not clearly anchor in this brief or brand — name audience tension or product truth. ${SPECIFICITY_REGEN_HINTS}`,
          );
        }
      });
    }
  } else if (stage === "VISUAL_DIRECTION") {
    const blob = [
      String(content.visualObjective ?? ""),
      String(content.composition ?? ""),
      String(content.colorDirection ?? ""),
      String(content.textureDirection ?? ""),
      String(content.lightingDirection ?? ""),
      String(content.imageStyle ?? ""),
      String(content.referenceLogic ?? ""),
      String(content.distinctivenessNotes ?? ""),
      String(content.whyItWorksForBrand ?? ""),
    ].join("\n");
    pushAbstract("Visual spec", blob);
    const concrete = countVisualConcreteTokens(blob);
    if (concrete < 3) {
      issues.push(
        `Visual spec: lack of concrete execution detail — add specific materials, lighting setup, composition, lens/capture, or set logic (not vibes-only). ${SPECIFICITY_REGEN_HINTS}`,
      );
    }
    if (minAnchors > 0 && countAnchorHits(String(content.whyItWorksForBrand ?? ""), anchorList) < 1) {
      issues.push(
        `Visual spec: whyItWorksForBrand must tie visibly to brand/brief vocabulary — not generic praise.`,
      );
    }
  } else if (stage === "COPY_DEVELOPMENT") {
    const heads = content.headlineOptions;
    const bodies = content.bodyCopyOptions;
    const ctas = content.ctaOptions;
    const blob = [
      Array.isArray(heads) ? heads.map((x) => String(x)).join("\n") : "",
      Array.isArray(bodies) ? bodies.map((x) => String(x)).join("\n") : "",
      Array.isArray(ctas) ? ctas.map((x) => String(x)).join("\n") : "",
    ].join("\n");
    pushAbstract("Copy", blob);
    if (minAnchors > 0 && countAnchorHits(blob, anchorList) < minAnchors) {
      issues.push(
        `Copy: weak anchoring in client/brief — weave in audience or offer specifics from the brief. ${SPECIFICITY_REGEN_HINTS}`,
      );
    }
  } else if (stage === "IDENTITY_STRATEGY") {
    const blob = [
      String(content.brandCoreIdea ?? ""),
      String(content.whatTheIdentityMustSignal ?? ""),
      ...(Array.isArray(content.semanticDirections)
        ? content.semanticDirections.map((x) => String(x))
        : []),
    ].join("\n");
    pushAbstract("Identity strategy", blob);
    if (minAnchors > 0 && countAnchorHits(blob, anchorList) < 1) {
      issues.push(
        `Identity strategy: tie symbolic territory to this client's language (brief/brand), not category defaults.`,
      );
    }
  } else if (stage === "IDENTITY_ROUTING") {
    const routes = content.routes;
    if (Array.isArray(routes)) {
      routes.forEach((r, i) => {
        if (!r || typeof r !== "object") return;
        const o = r as Record<string, unknown>;
        const piece = `${String(o.coreConcept ?? "")} ${String(o.symbolicLogic ?? "")} ${String(o.whyItWorksForBrand ?? "")}`;
        pushAbstract(`Identity route ${i + 1}`, piece);
        if (minAnchors > 0 && countAnchorHits(piece, anchorList) < 1) {
          issues.push(
            `Identity route ${i + 1}: weak brand/brief anchoring in whyItWorksForBrand or symbolic logic.`,
          );
        }
      });
    }
  }

  const hasAbstract = issues.some((x) => x.includes("abstract/vague"));
  const hasGenericClaim = issues.some((x) => x.includes("generic claim"));
  const hasConcreteLack = issues.some((x) => x.includes("lack of concrete"));
  const weakRationale = issues.filter(
    (x) => x.includes("anchoring") || x.includes("weak brief"),
  );

  return {
    issues,
    recommendRegeneration:
      hasAbstract ||
      hasGenericClaim ||
      hasConcreteLack ||
      weakRationale.length >= 2 ||
      (weakRationale.length >= 1 && (hasAbstract || hasGenericClaim)),
  };
}
