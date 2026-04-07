import { z } from "zod";

/** Minimal shape for composition voting (matches selected reference rows). */
export type ReferenceLikeForComposition = {
  label: string;
  category: string;
  metadata: unknown;
  imageUrl?: string | null;
};

export const framingTypeSchema = z.enum([
  "close-up",
  "medium",
  "wide",
  "overhead",
  "macro",
  "hero-centered",
]);
export const subjectPlacementSchema = z.enum([
  "center",
  "left-weighted",
  "right-weighted",
  "rule-of-thirds",
]);
export const cameraAngleSchema = z.enum([
  "eye-level",
  "top-down",
  "low-angle",
  "three-quarter",
]);
export const backgroundTreatmentSchema = z.enum([
  "clean",
  "environmental",
  "gradient",
  "shallow-depth",
]);
export const depthStyleSchema = z.enum(["flat", "shallow-depth", "layered-depth"]);
export const negativeSpaceUsageSchema = z.enum(["low", "medium", "high"]);
export const productScaleInFrameSchema = z.enum(["tight", "balanced", "spacious"]);
export const lightingSpreadSchema = z.enum([
  "focused",
  "broad",
  "rim-lit",
  "side-lit",
]);
export const realismBiasSchema = z.enum([
  "editorial",
  "campaign-photo",
  "studio",
  "lifestyle",
]);

export const referenceCompositionProfileSchema = z.object({
  framingType: framingTypeSchema,
  subjectPlacement: subjectPlacementSchema,
  cameraAngle: cameraAngleSchema,
  backgroundTreatment: backgroundTreatmentSchema,
  depthStyle: depthStyleSchema,
  negativeSpaceUsage: negativeSpaceUsageSchema,
  productScaleInFrame: productScaleInFrameSchema,
  lightingSpread: lightingSpreadSchema,
  realismBias: realismBiasSchema,
});

export type ReferenceCompositionProfile = z.infer<
  typeof referenceCompositionProfileSchema
>;

type Counter = Map<string, number>;

function addVote(c: Counter, key: string, w = 1) {
  c.set(key, (c.get(key) ?? 0) + w);
}

function winner<T extends string>(c: Counter, fallback: T): T {
  let best: T = fallback;
  let n = -1;
  for (const [k, v] of c) {
    if (v > n) {
      n = v;
      best = k as T;
    }
  }
  return best;
}

function refTextBlob(r: ReferenceLikeForComposition): string {
  const parts = [r.label, r.category];
  const m = r.metadata;
  if (m && typeof m === "object" && !Array.isArray(m)) {
    const o = m as Record<string, unknown>;
    for (const k of ["mood", "composition", "lighting", "style", "region"]) {
      if (typeof o[k] === "string") parts.push(o[k] as string);
    }
    const tags = o.tags;
    if (Array.isArray(tags)) parts.push(...tags.map((x) => String(x)));
    const cues = o.brandCues;
    if (Array.isArray(cues)) parts.push(...cues.map((x) => String(x)));
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Deterministic vote from selected references' metadata + labels + categories.
 */
export function buildReferenceCompositionProfile(
  references: ReferenceLikeForComposition[],
): ReferenceCompositionProfile {
  const framing = new Map<string, number>();
  const placement = new Map<string, number>();
  const angle = new Map<string, number>();
  const bg = new Map<string, number>();
  const depth = new Map<string, number>();
  const negSpace = new Map<string, number>();
  const scale = new Map<string, number>();
  const lightSpread = new Map<string, number>();
  const realism = new Map<string, number>();

  if (references.length === 0) {
    return referenceCompositionProfileSchema.parse({
      framingType: "medium",
      subjectPlacement: "center",
      cameraAngle: "eye-level",
      backgroundTreatment: "shallow-depth",
      depthStyle: "shallow-depth",
      negativeSpaceUsage: "medium",
      productScaleInFrame: "balanced",
      lightingSpread: "broad",
      realismBias: "campaign-photo",
    });
  }

  for (const r of references) {
    const t = refTextBlob(r);
    const cat = r.category;
    const w = cat === "COMPOSITION" ? 1.4 : cat === "LIGHTING" ? 1.2 : 1;

    if (/\b(overhead|top[- ]?down|flatlay|bird|table\s*top)\b/.test(t)) {
      addVote(framing, "overhead", w);
      addVote(angle, "top-down", w);
    }
    if (/\b(macro|extreme\s*close|texture\s*forward|crispy\s*detail)\b/.test(t)) {
      addVote(framing, "macro", w);
    }
    if (/\b(close[- ]?up|tight\s*crop|hero\s*macro|tight\s*hero)\b/.test(t)) {
      addVote(framing, "close-up", w);
      addVote(scale, "tight", w);
    }
    if (/\b(wide|establishing|environmental\s*context|landscape)\b/.test(t)) {
      addVote(framing, "wide", w);
      addVote(scale, "spacious", w);
    }
    if (/\b(center|centered|center-weighted|symmetr|logo-safe)\b/.test(t)) {
      addVote(placement, "center", w);
      addVote(framing, "hero-centered", w * 0.9);
    }
    if (/\b(rule\s*of\s*thirds|asymmetr|off-center|lead\s*room)\b/.test(t)) {
      addVote(placement, "rule-of-thirds", w);
    }
    if (/\b(left|negative\s*space\s*right)\b/.test(t)) {
      addVote(placement, "left-weighted", w * 0.8);
    }
    if (/\b(right)\b/.test(t)) addVote(placement, "right-weighted", w * 0.8);

    if (/\b(low[- ]?angle|worm|looking\s*up|monumental)\b/.test(t)) {
      addVote(angle, "low-angle", w);
    }
    if (/\b(eye[- ]?level|table\s*height|dining\s*height)\b/.test(t)) {
      addVote(angle, "eye-level", w);
    }
    if (/\b(three[- ]?quarter|3\/4|oblique)\b/.test(t)) {
      addVote(angle, "three-quarter", w);
    }

    if (/\b(clean\s*background|seamless|minimal\s*bg|simple\s*bg)\b/.test(t)) {
      addVote(bg, "clean", w);
    }
    if (/\b(environmental|restaurant|street|lifestyle\s*context|real\s*world)\b/.test(t)) {
      addVote(bg, "environmental", w);
    }
    if (/\b(gradient|color\s*block|graphic\s*bg)\b/.test(t)) {
      addVote(bg, "gradient", w);
    }
    if (/\b(shallow\s*dof|bokeh|depth\s*separation|subject\s*pop)\b/.test(t)) {
      addVote(bg, "shallow-depth", w);
      addVote(depth, "shallow-depth", w);
    }
    if (/\b(layered|foreground|depth\s*layers)\b/.test(t)) {
      addVote(depth, "layered-depth", w);
    }
    if (/\b(flat\s*light|even\s*fill|catalog)\b/.test(t)) {
      addVote(depth, "flat", w);
    }

    if (/\b(generous\s*negative|breathing\s*room|margins|logo\s*adjacency)\b/.test(t)) {
      addVote(negSpace, "high", w);
    }
    if (/\b(fill\s*frame|packed|dense)\b/.test(t)) {
      addVote(negSpace, "low", w);
    }
    if (/\b(balanced\s*space|readable\s*hierarchy)\b/.test(t)) {
      addVote(negSpace, "medium", w);
    }

    if (/\b(hero\s*scale|balanced\s*product)\b/.test(t)) addVote(scale, "balanced", w);
    if (/\b(spacious|airy|wide\s*margins)\b/.test(t)) addVote(scale, "spacious", w);

    if (/\b(rim|edge\s*light|backlight)\b/.test(t)) addVote(lightSpread, "rim-lit", w);
    if (/\b(side[- ]?light|directional\s*key|rake)\b/.test(t)) {
      addVote(lightSpread, "side-lit", w);
    }
    if (/\b(softbox\s*wrap|broad\s*source|high[- ]?key|even\s*fill)\b/.test(t)) {
      addVote(lightSpread, "broad", w);
    }
    if (/\b(spot|focused\s*pool|narrow\s*beam|dramatic\s*pool)\b/.test(t)) {
      addVote(lightSpread, "focused", w);
    }

    if (/\b(editorial|magazine|sophisticated)\b/.test(t)) addVote(realism, "editorial", w);
    if (/\b(campaign|billboard|key\s*visual|ooh)\b/.test(t)) {
      addVote(realism, "campaign-photo", w);
    }
    if (/\b(studio|packshot|controlled)\b/.test(t)) addVote(realism, "studio", w);
    if (/\b(lifestyle|candid|documentary|outdoor|picnic|table)\b/.test(t)) {
      addVote(realism, "lifestyle", w);
    }
  }

  return referenceCompositionProfileSchema.parse({
    framingType: winner(framing, "medium"),
    subjectPlacement: winner(placement, "center"),
    cameraAngle: winner(angle, "eye-level"),
    backgroundTreatment: winner(bg, "shallow-depth"),
    depthStyle: winner(depth, "shallow-depth"),
    negativeSpaceUsage: winner(negSpace, "medium"),
    productScaleInFrame: winner(scale, "balanced"),
    lightingSpread: winner(lightSpread, "broad"),
    realismBias: winner(realism, "campaign-photo"),
  });
}

export function formatCompositionControlBlock(p: ReferenceCompositionProfile): string {
  const lines = [
    "COMPOSITION CONTROL (mandatory — derived from selected creative references):",
    `- Framing: ${p.framingType.replace(/-/g, " ")} — commit to this shot scale for the hero subject.`,
    `- Subject placement: ${p.subjectPlacement.replace(/-/g, " ")} — do not drift to accidental symmetry unless spec demands it.`,
    `- Camera angle: ${p.cameraAngle.replace(/-/g, " ")} — believable lens height for food / product advertising.`,
    `- Background: ${p.backgroundTreatment.replace(/-/g, " ")} — background must support hierarchy, not compete.`,
    `- Depth: ${p.depthStyle.replace(/-/g, " ")} — separate subject from background with real optical cues.`,
    `- Negative space: ${p.negativeSpaceUsage} — reserve clear area for campaign readability (type / logo breathing room when applicable).`,
    `- Product scale in frame: ${p.productScaleInFrame} — avoid random float scale; anchor subject to a real surface or believable context.`,
    `- Lighting spread: ${p.lightingSpread.replace(/-/g, " ")} — motivated light, no floating studio UFO.`,
    `- Realism bias: ${p.realismBias.replace(/-/g, " ")} — photograph captured on set, not a 3D render.`,
    "Hard bans: no floating product without cast shadow / contact shadow; no impossible levitation; no hyper-symmetric CGI product turntable unless spec explicitly asks; busy prop clutter must stay out of the hero plane.",
  ];
  return lines.join("\n");
}

export function campaignCompositionNegativeLines(p: ReferenceCompositionProfile): string[] {
  const out: string[] = [
    "floating product with no surface contact or shadow",
    "cluttered prop salad with no single hero",
    "impossible floating food geometry",
  ];
  if (p.negativeSpaceUsage === "high") {
    out.push("cramped frame with zero breathing room for type or logo lockups");
  }
  if (p.backgroundTreatment === "clean") {
    out.push("busy environmental chaos behind hero");
  }
  if (p.realismBias === "campaign-photo" || p.realismBias === "editorial") {
    out.push("video-game turntable product render");
    out.push("fisheye or distorted wide food lens unless spec requests it");
  }
  return out;
}

/** Concise rows for Studio "Composition guidance". */
export function compositionGuidanceSummary(p: ReferenceCompositionProfile): {
  framing: string;
  cameraAngle: string;
  subjectPlacement: string;
  backgroundTreatment: string;
  realismBias: string;
} {
  return {
    framing: p.framingType.replace(/-/g, " "),
    cameraAngle: p.cameraAngle.replace(/-/g, " "),
    subjectPlacement: p.subjectPlacement.replace(/-/g, " "),
    backgroundTreatment: p.backgroundTreatment.replace(/-/g, " "),
    realismBias: p.realismBias.replace(/-/g, " "),
  };
}

export type CompositionGuidanceSummary = ReturnType<typeof compositionGuidanceSummary>;

/** Short block for provider adapters — placed before scene description. */
export function formatCompositionLeadIn(p: ReferenceCompositionProfile): string {
  const g = compositionGuidanceSummary(p);
  return [
    "CAMPAIGN COMPOSITION (execute first — non-negotiable):",
    `Framing: ${g.framing}. Camera: ${g.cameraAngle}. Subject placement: ${g.subjectPlacement}.`,
    `Background: ${g.backgroundTreatment}. Realism target: ${g.realismBias}.`,
    `Depth: ${p.depthStyle.replace(/-/g, " ")}. Negative space: ${p.negativeSpaceUsage}. Product scale: ${p.productScaleInFrame}. Lighting spread: ${p.lightingSpread.replace(/-/g, " ")}.`,
  ].join("\n");
}

/**
 * Deterministic prompt checks vs derived profile (no CV).
 */
export function compositionProfilePromptIssues(
  promptUsed: string,
  profile: ReferenceCompositionProfile,
): string[] {
  const p = promptUsed.toLowerCase();
  const issues: string[] = [];

  if (/\b(floating|levitat|hovering|mid-air)\b/.test(p)) {
    const grounded =
      /\b(table|counter|tray|surface|board|hand\s*hold|contact\s*shadow|cast\s*shadow|wood|slate|paper)\b/.test(
        p,
      );
    if (!grounded) {
      issues.push(
        "Prompt suggests floating subject without grounding — conflicts with campaign composition control.",
      );
    }
  }

  if (profile.negativeSpaceUsage === "high") {
    if (/\b(fill\s*(the\s*)?frame|edge\s*to\s*edge|no\s*negative\s*space|dense\s*pack)\b/.test(p)) {
      issues.push("Prompt language fights high negative-space composition profile.");
    }
  }

  if (profile.backgroundTreatment === "clean") {
    if (/\b(busy\s*street|crowd\s*chaos|maximalist\s*props|cluttered\s*kitchen\s*everywhere)\b/.test(p)) {
      issues.push("Prompt pushes busy background vs clean background treatment from references.");
    }
  }

  if (profile.realismBias === "campaign-photo" || profile.realismBias === "editorial") {
    if (/\b(fisheye|ultra\s*wide\s*distortion|impossible\s*angle)\b/.test(p)) {
      issues.push("Unrealistic lens / angle language for campaign-photo realism bias.");
    }
  }

  if (/\b(turntable|360|product\s*render|cg\s*model)\b/.test(p)) {
    issues.push("CG / turntable language conflicts with photographic campaign composition profile.");
  }

  return issues;
}
