import type { VisualSpecArtifact } from "@/lib/artifacts/contracts";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqCap(arr: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const t = x.trim();
    if (t.length < 3) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

export type ExtractedVisualIdentity = {
  styleKeywords: string[];
  lightingPatterns: string[];
  compositionPatterns: string[];
  colorSignatures: string[];
  texturePatterns: string[];
  framingRules: string[];
  negativeTraits: string[];
};

function heuristicLighting(text: string): string[] {
  const t = norm(text);
  const out: string[] = [];
  if (/\b(natural|window|daylight|sun|golden|overcast)\b/.test(t)) {
    out.push("soft natural / daylight motivated light");
  }
  if (/\b(studio|softbox|key\s*light|three[- ]point)\b/.test(t)) {
    out.push("controlled studio lighting");
  }
  if (/\b(hard|dramatic|contrast|chiaroscuro|rim)\b/.test(t)) {
    out.push("directional high-contrast lighting");
  }
  if (/\b(practical|motivated|on[- ]set)\b/.test(t)) {
    out.push("practical / motivated sources");
  }
  if (out.length === 0 && t.length > 20) {
    out.push("lighting per approved visual spec");
  }
  return out;
}

function heuristicComposition(text: string): string[] {
  const t = norm(text);
  const out: string[] = [];
  if (/\b(close|macro|tight|hero)\b/.test(t)) {
    out.push("close-up / hero subject scale");
  }
  if (/\b(rule\s*of\s*thirds|thirds|asymmetr)\b/.test(t)) {
    out.push("asymmetric / rule-of-thirds framing");
  }
  if (/\b(center|centred|centered|symmetr)\b/.test(t)) {
    out.push("center-weighted composition");
  }
  if (/\b(negative\s*space|breathing\s*room|margin)\b/.test(t)) {
    out.push("generous negative space");
  }
  if (/\b(wide|establishing|environmental)\b/.test(t)) {
    out.push("environmental / wide context");
  }
  if (out.length === 0 && t.length > 20) {
    out.push("composition per approved visual spec");
  }
  return out;
}

function heuristicColor(text: string): string[] {
  const t = norm(text);
  const out: string[] = [];
  if (/\b(warm|amber|golden|sunset)\b/.test(t)) {
    out.push("warm palette bias");
  }
  if (/\b(cool|cyan|blue|moon)\b/.test(t)) {
    out.push("cool palette bias");
  }
  if (/\b(muted|desaturat|matte|low[- ]chroma)\b/.test(t)) {
    out.push("muted / restrained saturation");
  }
  if (/\b(bold|vibrant|saturat|pop)\b/.test(t)) {
    out.push("bold color contrast");
  }
  if (/\b(monochrome|black\s*and\s*white|bw)\b/.test(t)) {
    out.push("monochrome or tonal discipline");
  }
  return out;
}

function heuristicTexture(text: string): string[] {
  const t = norm(text);
  const out: string[] = [];
  if (/\b(matte|flat|paper|fabric)\b/.test(t)) {
    out.push("matte surfaces / tactile realism");
  }
  if (/\b(gloss|sheen|specular|wet)\b/.test(t)) {
    out.push("controlled specular / believable sheen");
  }
  if (/\b(grain|film|analog|texture)\b/.test(t)) {
    out.push("subtle grain / analog texture");
  }
  return out;
}

function heuristicFraming(text: string): string[] {
  const t = norm(text);
  const out: string[] = [];
  if (/\b(handheld|documentary|candid)\b/.test(t)) {
    out.push("handheld / candid camera feel");
  }
  if (/\b(tripod|locked|stable)\b/.test(t)) {
    out.push("stable camera / deliberate framing");
  }
  if (/\b(shallow|bokeh|depth)\b/.test(t)) {
    out.push("shallow depth of field when motivated");
  }
  return out;
}

function fromEvaluation(ev: Record<string, unknown> | null): {
  styleKeywords: string[];
  negativeTraits: string[];
} {
  if (!ev) {
    return { styleKeywords: [], negativeTraits: [] };
  }
  const styleKeywords: string[] = [];
  const negativeTraits: string[] = [];

  const slop = String(ev.slopRisk ?? "").toUpperCase();
  if (slop === "LOW") {
    styleKeywords.push("photographic realism (low slop signal)");
  } else if (slop === "HIGH") {
    negativeTraits.push("generic AI polish / high slop risk");
  }

  const rs = typeof ev.realismScore === "number" ? ev.realismScore : null;
  if (rs != null && rs >= 0.72) {
    styleKeywords.push("believable real-world capture");
  } else if (rs != null && rs < 0.45) {
    negativeTraits.push("plastic or synthetic rendering");
  }

  const det = ev.slopDetection;
  if (isRecord(det)) {
    const flags = det.flags;
    if (Array.isArray(flags)) {
      for (const f of flags) {
        negativeTraits.push(`avoid: ${String(f)}`);
      }
    }
  }

  return { styleKeywords: uniqCap(styleKeywords, 8), negativeTraits: uniqCap(negativeTraits, 10) };
}

/**
 * Derive structured visual identity traits from an approved path (spec + optional eval + prompts).
 */
export function extractVisualIdentityFromAsset(args: {
  visualSpec: VisualSpecArtifact;
  promptUsed: string;
  promptPackageSnippet?: string | null;
  evaluation: Record<string, unknown> | null;
}): ExtractedVisualIdentity {
  const spec = args.visualSpec;
  const blob = [
    spec.lightingDirection,
    spec.composition,
    spec.colorDirection,
    spec.textureDirection,
    spec.imageStyle,
    spec.mood,
    spec.emotionalTone,
    spec.distinctivenessNotes,
  ].join("\n");

  const lightingPatterns = heuristicLighting(blob);
  const compositionPatterns = heuristicComposition(blob);
  const colorSignatures = heuristicColor(blob);
  const texturePatterns = heuristicTexture(blob);
  const framingRules = heuristicFraming(blob + "\n" + spec.composition);

  const styleKeywords = uniqCap(
    [
      ...spec.referenceStyleHints ?? [],
      spec.referenceIntent?.trim() ?? "",
      spec.imageStyle.slice(0, 120),
    ].filter(Boolean),
    12,
  );

  const evDerived = fromEvaluation(args.evaluation);
  styleKeywords.push(...evDerived.styleKeywords);

  const negFromSpec = spec.avoidList.slice(0, 6).map((x) => `spec avoid: ${x}`);
  const negativeTraits = uniqCap([...negFromSpec, ...evDerived.negativeTraits], 16);

  const pkgHint = args.promptPackageSnippet?.slice(0, 600) ?? "";
  if (pkgHint) {
    lightingPatterns.push(...heuristicLighting(pkgHint));
    compositionPatterns.push(...heuristicComposition(pkgHint));
  }

  return {
    styleKeywords: uniqCap(styleKeywords, 14),
    lightingPatterns: uniqCap(lightingPatterns, 12),
    compositionPatterns: uniqCap(compositionPatterns, 12),
    colorSignatures: uniqCap(colorSignatures, 10),
    texturePatterns: uniqCap(texturePatterns, 10),
    framingRules: uniqCap(framingRules, 10),
    negativeTraits,
  };
}
