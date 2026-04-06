/**
 * Deterministic pixel + prompt heuristics for "AI slop" / weak key art.
 * Scores are 0–1 where higher = more slop risk (worse).
 */
import { decode as decodeJpeg } from "jpeg-js";
import { PNG } from "pngjs";

export type SlopPixelSignals = {
  overSaturationScore: number;
  specularGlossScore: number;
  unnaturalSymmetryScore: number;
  cgiLookScore: number;
  lackOfNegativeSpaceScore: number;
  clutteredCompositionScore: number;
  /** Max of the above, for quick gating */
  aggregateSlopScore: number;
  notes: string[];
};

const CGI_PROMPT_PATTERNS = [
  /\bhyper[- ]?realistic\b/i,
  /\b8k\b/i,
  /\bultra[- ]?detailed\b/i,
  /\bstudio lighting\b/i,
  /\bperfect lighting\b/i,
  /\brender\b/i,
  /\bcgi\b/i,
  /\b3d render\b/i,
  /\boctane\b/i,
  /\bunreal engine\b/i,
  /\bglossy\b/i,
  /\bplastic skin\b/i,
];

const CGI_PROMPT_KEYWORDS = [
  "airbrushed",
  "pristine",
  "flawless",
  "too perfect",
  "synthetic",
];

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function decodeImage(buffer: Buffer): { w: number; h: number; rgba: Uint8Array } | null {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    try {
      const png = PNG.sync.read(buffer);
      return { w: png.width, h: png.height, rgba: png.data };
    } catch {
      return null;
    }
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    try {
      const raw = decodeJpeg(buffer, { useTArray: true });
      return { w: raw.width, h: raw.height, rgba: raw.data };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * High saturation: many pixels with strong chroma (max-min of RGB large vs value).
 */
function scoreOverSaturation(rgba: Uint8Array, w: number, h: number): number {
  const step = Math.max(1, Math.floor((w * h) / 12_000));
  let hi = 0;
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4 * step) {
    const r = rgba[i]!;
    const g = rgba[i + 1]!;
    const b = rgba[i + 2]!;
    const v = Math.max(r, g, b) / 255;
    const chroma = (Math.max(r, g, b) - Math.min(r, Math.min(g, b))) / 255;
    if (v > 0.15 && chroma > 0.55) hi++;
    n++;
  }
  return clamp01(n ? hi / n : 0);
}

/**
 * Specular: bright pixels with low channel variance (white-hot highlights).
 */
function scoreSpecularGloss(rgba: Uint8Array, w: number, h: number): number {
  const step = Math.max(1, Math.floor((w * h) / 12_000));
  let hi = 0;
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4 * step) {
    const r = rgba[i]!;
    const g = rgba[i + 1]!;
    const b = rgba[i + 2]!;
    const avg = (r + g + b) / 3;
    const spread = Math.max(r, g, b) - Math.min(r, Math.min(g, b));
    if (avg > 230 && spread < 25) hi++;
    n++;
  }
  return clamp01(n ? (hi / n) * 4 : 0);
}

/**
 * Compare left vs mirrored-right luminance histogram correlation (high = symmetric).
 */
function scoreSymmetry(rgba: Uint8Array, w: number, h: number): number {
  const bins = 16;
  const left = new Array(bins).fill(0);
  const right = new Array(bins).fill(0);
  const mid = Math.floor(w / 2);
  const stepY = Math.max(1, Math.floor(h / 120));
  const stepX = Math.max(1, Math.floor(mid / 80));
  for (let y = 0; y < h; y += stepY) {
    for (let x = 0; x < mid; x += stepX) {
      const li = (y * w + x) * 4;
      const ri = (y * w + (w - 1 - x)) * 4;
      const lr = (rgba[li]! + rgba[li + 1]! + rgba[li + 2]!) / 3;
      const rr = (rgba[ri]! + rgba[ri + 1]! + rgba[ri + 2]!) / 3;
      left[Math.min(bins - 1, Math.floor((lr / 255) * bins))]!++;
      right[Math.min(bins - 1, Math.floor((rr / 255) * bins))]!++;
    }
  }
  let dot = 0;
  let nl = 0;
  let nr = 0;
  for (let i = 0; i < bins; i++) {
    dot += left[i]! * right[i]!;
    nl += left[i]! * left[i]!;
    nr += right[i]! * right[i]!;
  }
  const cos = nl && nr ? dot / (Math.sqrt(nl) * Math.sqrt(nr)) : 0;
  return clamp01((cos - 0.85) / 0.15);
}

function scoreNegativeSpace(rgba: Uint8Array, w: number, h: number): number {
  const step = Math.max(1, Math.floor((w * h) / 14_000));
  let dark = 0;
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4 * step) {
    const r = rgba[i]!;
    const g = rgba[i + 1]!;
    const b = rgba[i + 2]!;
    const lum = (r + g + b) / 3;
    if (lum < 45 || (r + g + b) / 3 < 55) dark++;
    n++;
  }
  const ratio = n ? dark / n : 0;
  return clamp01(1 - ratio * 2.2);
}

function scoreClutter(rgba: Uint8Array, w: number, h: number): number {
  const step = Math.max(2, Math.floor(Math.min(w, h) / 96));
  let strongEdges = 0;
  let n = 0;
  for (let y = step; y < h - step; y += step) {
    for (let x = step; x < w - step; x += step) {
      const i = (y * w + x) * 4;
      const ixp = (y * w + x + step) * 4;
      const iyp = ((y + step) * w + x) * 4;
      const l0 = (rgba[i]! + rgba[i + 1]! + rgba[i + 2]!) / 3;
      const lx = (rgba[ixp]! + rgba[ixp + 1]! + rgba[ixp + 2]!) / 3;
      const ly = (rgba[iyp]! + rgba[iyp + 1]! + rgba[iyp + 2]!) / 3;
      const g = Math.abs(l0 - lx) + Math.abs(l0 - ly);
      if (g > 38) strongEdges++;
      n++;
    }
  }
  return clamp01(n ? (strongEdges / n) * 1.8 : 0);
}

export function scorePromptCgiPatterns(promptUsed: string): number {
  const p = promptUsed.toLowerCase();
  let hits = 0;
  for (const re of CGI_PROMPT_PATTERNS) {
    if (re.test(promptUsed)) hits++;
  }
  for (const k of CGI_PROMPT_KEYWORDS) {
    if (p.includes(k)) hits++;
  }
  return clamp01(hits / 5);
}

/**
 * Full deterministic pass: decode image when possible; always blend prompt CGI hints.
 */
export function detectVisualSlop(args: {
  imageBuffer: Buffer;
  mime: string;
  promptUsed: string;
}): SlopPixelSignals {
  const notes: string[] = [];
  const promptCgi = scorePromptCgiPatterns(args.promptUsed);
  if (promptCgi > 0.35) notes.push("Prompt contains CGI / hyper-polish tropes.");

  const img = decodeImage(args.imageBuffer);
  if (!img) {
    const agg = Math.max(promptCgi, 0.25);
    return {
      overSaturationScore: 0,
      specularGlossScore: 0,
      unnaturalSymmetryScore: 0,
      cgiLookScore: promptCgi,
      lackOfNegativeSpaceScore: 0.3,
      clutteredCompositionScore: 0.3,
      aggregateSlopScore: agg,
      notes: [...notes, "Could not decode image for pixel heuristics."],
    };
  }

  const { w, h, rgba } = img;
  const sat = scoreOverSaturation(rgba, w, h);
  const spec = scoreSpecularGloss(rgba, w, h);
  const sym = scoreSymmetry(rgba, w, h);
  const neg = scoreNegativeSpace(rgba, w, h);
  const clutter = scoreClutter(rgba, w, h);

  if (sat > 0.45) notes.push("High share of saturated pixels.");
  if (spec > 0.35) notes.push("Many specular / flat-white highlight patches.");
  if (sym > 0.55) notes.push("Strong vertical symmetry cue.");
  if (neg > 0.55) notes.push("Little apparent negative space.");
  if (clutter > 0.5) notes.push("High edge density — busy composition.");

  const cgiPixel = clamp01(spec * 0.35 + sat * 0.25 + sym * 0.2 + clutter * 0.2);
  const cgiCombined = clamp01(Math.max(promptCgi, cgiPixel));

  const aggregate = clamp01(
    sat * 0.18 +
      spec * 0.2 +
      sym * 0.14 +
      cgiCombined * 0.22 +
      neg * 0.14 +
      clutter * 0.12,
  );

  return {
    overSaturationScore: sat,
    specularGlossScore: spec,
    unnaturalSymmetryScore: sym,
    cgiLookScore: cgiCombined,
    lackOfNegativeSpaceScore: neg,
    clutteredCompositionScore: clutter,
    aggregateSlopScore: aggregate,
    notes,
  };
}
