/**
 * Deterministic checks for Brand Creative DNA (rhythm, devices, generic tone).
 * Used by pre-persist quality alongside anti-generic phrase scans.
 */

export type BrandCreativeDnaForChecks = {
  rhythmRules: string[];
  signatureDevices: string[];
  voicePrinciples: string[];
};

const FORMAL_OPENERS =
  /\b(therefore|furthermore|moreover|consequently|in conclusion|it is important to note|we are pleased to|we strive to)\b/gi;

const NEUTRAL_CONNECTORS =
  /\b(in order to|facilitate|leverage|utilize|solutions?\s+for|best[- ]in[- ]class)\b/gi;

/** Split into sentence-like units (rough but good enough for rhythm heuristics). */
export function splitSentenceLikeUnits(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function wordCount(s: string): number {
  return s.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Low coefficient of variation on sentence lengths → "flat rhythm".
 * Needs several sentences to be meaningful.
 */
export function detectFlatRhythm(text: string, minUnits = 5): boolean {
  const units = splitSentenceLikeUnits(text);
  if (units.length < minUnits) return false;
  const lengths = units.map((u) => wordCount(u)).filter((n) => n > 0);
  if (lengths.length < minUnits) return false;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean < 4) return false;
  const variance =
    lengths.reduce((acc, n) => acc + (n - mean) ** 2, 0) / lengths.length;
  const sd = Math.sqrt(variance);
  const cv = mean > 0 ? sd / mean : 0;
  return cv < 0.22;
}

export function countRepeatedGenericNgrams(
  text: string,
  minLen = 4,
  minRepeats = 2,
): number {
  const t = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const words = t.split(/\s+/).filter((w) => w.length > 3);
  const counts = new Map<string, number>();
  for (let i = 0; i <= words.length - minLen; i++) {
    const gram = words.slice(i, i + minLen).join(" ");
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  let bad = 0;
  for (const c of counts.values()) {
    if (c >= minRepeats) bad++;
  }
  return bad;
}

function normPhrase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

/**
 * Heuristic: at least one signature device label or a distinctive substring appears in text.
 */
export function signatureDevicePresentInText(
  text: string,
  devices: string[],
): boolean {
  if (!devices.length) return true;
  const blob = text.toLowerCase();
  for (const d of devices) {
    const n = normPhrase(d);
    if (n.length < 4) continue;
    const tokens = n.split(/\s+/).filter((t) => t.length > 3);
    if (tokens.length >= 2) {
      if (tokens.every((t) => blob.includes(t))) return true;
    }
    if (blob.includes(n.slice(0, Math.min(40, n.length)))) return true;
  }
  return false;
}

export function detectOverlyFormalNeutralTone(text: string): {
  formalHits: number;
  neutralHits: number;
} {
  const formal = [...text.matchAll(FORMAL_OPENERS)].length;
  const neutral = [...text.matchAll(NEUTRAL_CONNECTORS)].length;
  return { formalHits: formal, neutralHits: neutral };
}

export type CreativeDnaToneIssues = {
  issues: string[];
  recommendRegeneration: boolean;
};

/**
 * Runs when Brand OS lists Creative DNA fields; empty DNA → no extra flags.
 */
export function mergeCreativeDnaToneIssues(
  textBlob: string,
  dna: BrandCreativeDnaForChecks,
  /** COPY stage gets stricter rhythm / device enforcement */
  stage: "COPY_DEVELOPMENT" | "CONCEPTING" | "STRATEGY" | "VISUAL_DIRECTION",
): CreativeDnaToneIssues {
  const issues: string[] = [];
  let recommendRegeneration = false;

  const hasRhythmRules = dna.rhythmRules.some((r) => r.trim().length > 2);
  const hasDevices = dna.signatureDevices.some((d) => d.trim().length > 2);

  if (hasRhythmRules && detectFlatRhythm(textBlob)) {
    issues.push(
      "Brand Creative DNA: flat rhythm — sentence lengths are too uniform vs rhythmRules; vary cadence (short + long, deliberate fragments).",
    );
    if (stage === "COPY_DEVELOPMENT" || stage === "CONCEPTING") {
      recommendRegeneration = true;
    }
  }

  const repeats = countRepeatedGenericNgrams(textBlob);
  if (repeats >= 2) {
    issues.push(
      `Brand Creative DNA: repeated generic phrasing (${repeats} repeated 4-word patterns) — rewrite with sharper, less interchangeable language.`,
    );
    recommendRegeneration = true;
  }

  if (hasDevices && !signatureDevicePresentInText(textBlob, dna.signatureDevices)) {
    issues.push(
      "Brand Creative DNA: no signature device used — apply at least one listed signatureDevices pattern visibly in hooks/headlines/body (structure or device, not a label).",
    );
    if (stage === "COPY_DEVELOPMENT" || stage === "CONCEPTING") {
      recommendRegeneration = true;
    }
  }

  const { formalHits, neutralHits } = detectOverlyFormalNeutralTone(textBlob);
  if (formalHits >= 2 || neutralHits >= 3) {
    issues.push(
      "Brand Creative DNA: generic tone — overly formal connectors or neutral corporate phrasing; align with voicePrinciples and avoid bland 'solutions' register.",
    );
    if (stage === "COPY_DEVELOPMENT" || formalHits >= 3) {
      recommendRegeneration = true;
    }
  }

  return { issues, recommendRegeneration };
}
