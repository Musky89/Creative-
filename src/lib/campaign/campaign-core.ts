import { z } from "zod";

/** North star for one brief — every downstream stage must stay aligned. */
export const campaignCoreSchema = z.object({
  /** Single-line creative idea the whole campaign proves. */
  singleLineIdea: z.string().min(24).max(400),
  /** Productive emotional tension (e.g. desire vs guilt). */
  emotionalTension: z.string().min(24).max(600),
  /** How the story moves in frame / sequence (visual narrative spine). */
  visualNarrative: z.string().min(24).max(800),
});

export type CampaignCore = z.infer<typeof campaignCoreSchema>;

const STOP = new Set([
  "that",
  "this",
  "with",
  "from",
  "have",
  "will",
  "your",
  "their",
  "what",
  "when",
  "where",
  "which",
  "while",
  "about",
  "after",
  "before",
  "being",
  "through",
  "would",
  "could",
  "should",
  "there",
  "these",
  "those",
  "other",
  "into",
  "than",
  "then",
  "them",
  "some",
  "such",
  "very",
  "just",
  "also",
  "more",
  "most",
  "many",
  "much",
  "make",
  "made",
  "like",
  "only",
  "even",
  "well",
  "back",
  "over",
  "such",
  "same",
  "each",
  "both",
  "been",
  "were",
  "said",
  "here",
]);

function normWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 3 && !STOP.has(w));
}

export function campaignCoreKeywords(core: CampaignCore): Set<string> {
  const blob = [core.singleLineIdea, core.emotionalTension, core.visualNarrative].join(
    " ",
  );
  const words = normWords(blob);
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const scored = [...freq.entries()].sort((a, b) => b[1]! - a[1]!);
  const out = new Set<string>();
  for (const [w] of scored.slice(0, 24)) {
    out.add(w);
  }
  return out;
}

export function formatCampaignCoreSection(core: CampaignCore): string {
  return [
    "CAMPAIGN CORE — ONE IDEA (non-negotiable for this brief):",
    `Single-line idea: ${core.singleLineIdea.trim()}`,
    `Emotional tension: ${core.emotionalTension.trim()}`,
    `Visual narrative: ${core.visualNarrative.trim()}`,
    "",
    "Every output you write must feel like **one campaign** expressing the above. Do not introduce a second big idea, conflicting tension, or a disconnected visual world.",
  ].join("\n");
}

export function parseCampaignCoreFromUnknown(
  raw: unknown,
): CampaignCore | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = campaignCoreSchema.safeParse(raw);
  return p.success ? p.data : null;
}

/**
 * How many distinct campaign-core keywords appear in `text` (case-insensitive).
 */
export function countCoreKeywordHits(text: string, keywords: Set<string>): number {
  if (keywords.size === 0) return 999;
  const hay = normWords(text);
  const haySet = new Set(hay);
  let n = 0;
  for (const k of keywords) {
    if (haySet.has(k)) n++;
  }
  return n;
}

const MIN_HITS_CONCEPT_FIELD = 3;
const MIN_HITS_CONCEPT_PACK = 5;
const MIN_HITS_COPY = 4;
const MIN_HITS_VISUAL_SPEC = 4;
const MIN_HITS_PROMPT_PKG = 3;

/**
 * Deterministic drift check vs Campaign Core. Empty array = OK.
 */
/**
 * STRATEGY stage: ensure campaignCore is not a disconnected third track vs proposition/insight.
 */
export function strategyCampaignCoreCohesionIssues(
  content: Record<string, unknown>,
): string[] {
  const p = parseCampaignCoreFromUnknown(content.campaignCore);
  if (!p) {
    return ["Campaign Core block missing or invalid — strategy must include campaignCore."];
  }
  const prop = String(content.proposition ?? "");
  const ins = String(content.insight ?? "");
  const propWords = new Set(normWords(prop));
  const insWords = new Set(normWords(ins));
  const ideaWords = normWords(p.singleLineIdea);
  let propHits = 0;
  let insHits = 0;
  for (const w of ideaWords) {
    if (propWords.has(w)) propHits++;
    if (insWords.has(w)) insHits++;
  }
  if (prop.length > 12 && propHits < 2) {
    return [
      "Campaign coherence: singleLineIdea must echo concrete language from **proposition** (same story, not a parallel slogan).",
    ];
  }
  if (ins.length > 12 && insHits < 2) {
    return [
      "Campaign coherence: singleLineIdea must echo concrete language from **insight** (the tension the campaign exploits).",
    ];
  }
  return [];
}

export function campaignCoreDriftIssues(args: {
  artifactType: "CONCEPT" | "COPY" | "VISUAL_SPEC" | "VISUAL_PROMPT_PACKAGE";
  content: Record<string, unknown>;
  core: CampaignCore;
}): string[] {
  const keywords = campaignCoreKeywords(args.core);
  const issues: string[] = [];

  if (args.artifactType === "CONCEPT") {
    const concepts = args.content.concepts;
    if (!Array.isArray(concepts)) {
      issues.push("Campaign coherence: concept pack missing concepts array.");
      return issues;
    }
    const winner =
      concepts.find(
        (c) =>
          c &&
          typeof c === "object" &&
          (c as Record<string, unknown>).isSelected === true,
      ) ??
      concepts.find(
        (c) =>
          c &&
          typeof c === "object" &&
          String((c as Record<string, unknown>).conceptId ?? "") ===
            String(
              (args.content._agenticforceSelection as Record<string, unknown> | undefined)
                ?.winnerConceptId ?? "",
            ),
      ) ??
      null;
    if (winner && typeof winner === "object") {
      const w = winner as Record<string, unknown>;
      const blob = [
        w.hook,
        w.rationale,
        w.visualDirection,
        w.distinctivenessVsCategory,
        w.conceptName,
      ]
        .map((x) => String(x ?? ""))
        .join(" ");
      const hits = countCoreKeywordHits(blob, keywords);
      if (hits < MIN_HITS_CONCEPT_FIELD) {
        issues.push(
          `Campaign coherence: primary concept route does not echo Campaign Core enough (keyword overlap ${hits}/${MIN_HITS_CONCEPT_FIELD} required). Tie hook, rationale, and visual direction to the single-line idea and tension.`,
        );
      }
    } else {
      const packBlob = concepts
        .map((c) => {
          if (!c || typeof c !== "object") return "";
          const o = c as Record<string, unknown>;
          return [o.hook, o.rationale, o.visualDirection, o.conceptName]
            .map((x) => String(x ?? ""))
            .join(" ");
        })
        .join(" ");
      const packHits = countCoreKeywordHits(packBlob, keywords);
      if (packHits < MIN_HITS_CONCEPT_PACK) {
        issues.push(
          `Campaign coherence: concept field does not collectively echo Campaign Core (keyword overlap ${packHits}/${MIN_HITS_CONCEPT_PACK} required). Every route should orbit the same campaign idea.`,
        );
      }
    }
  }

  if (args.artifactType === "COPY") {
    const heads = args.content.headlineOptions;
    const bodies = args.content.bodyCopyOptions;
    const blob = [
      ...(Array.isArray(heads) ? heads : []).map((x) => String(x)),
      ...(Array.isArray(bodies) ? bodies : []).map((x) => String(x)),
    ].join(" ");
    const hits = countCoreKeywordHits(blob, keywords);
    if (hits < MIN_HITS_COPY) {
      issues.push(
        `Campaign coherence: copy variants drift from Campaign Core (keyword overlap ${hits}/${MIN_HITS_COPY} required). Headlines and body must prove the same idea and tension.`,
      );
    }
  }

  if (args.artifactType === "VISUAL_SPEC") {
    const blob = [
      args.content.visualObjective,
      args.content.mood,
      args.content.composition,
      args.content.distinctivenessNotes,
      args.content.referenceIntent,
      args.content.emotionalTone,
    ]
      .map((x) => String(x ?? ""))
      .join(" ");
    const hits = countCoreKeywordHits(blob, keywords);
    if (hits < MIN_HITS_VISUAL_SPEC) {
      issues.push(
        `Campaign coherence: VISUAL_SPEC does not carry Campaign Core into art direction (keyword overlap ${hits}/${MIN_HITS_VISUAL_SPEC} required). Mood, composition, and narrative must match the visual narrative spine.`,
      );
    }
  }

  if (args.artifactType === "VISUAL_PROMPT_PACKAGE") {
    const blob = String(args.content.primaryPrompt ?? "");
    const hits = countCoreKeywordHits(blob, keywords);
    if (hits < MIN_HITS_PROMPT_PKG) {
      issues.push(
        `Campaign coherence: assembled prompt package weakly reflects Campaign Core (keyword overlap ${hits}/${MIN_HITS_PROMPT_PKG} required).`,
      );
    }
  }

  return issues;
}
