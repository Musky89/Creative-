import { z } from "zod";
import { getLlmProvider } from "@/server/llm/get-provider";
import type { BrandBibleFormInput } from "@/server/domain/brand-bible";
import type { ServiceBlueprintFormInput } from "@/server/domain/service-blueprint";
import type { BriefFormInput } from "@/server/domain/briefs";

const lineArray = z.array(z.string()).default([]);

/**
 * Models often emit a single string or prose block for fields we expect as string[].
 * Coerce before Zod so onboarding does not fail on shape alone.
 */
export function coerceStringArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v
      .map((x) => String(x).trim())
      .filter((s) => s.length > 0);
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return [];
    const lines = t
      .split(/\r?\n/)
      .map((s) => s.replace(/^[-*•]\s*/, "").trim())
      .filter((s) => s.length > 0);
    if (lines.length > 1) return lines;
    const semi = t.split(/;\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
    if (semi.length > 1) return semi;
    return [t];
  }
  return [];
}

function coerceMessagingPillars(v: unknown): string[] {
  const arr = coerceStringArray(v);
  if (arr.length >= 2) return arr.slice(0, 8);
  if (arr.length === 1) {
    const one = arr[0]!;
    for (const sep of [/\s*\|\s*/, /\s*\/\s*/, /\s+•\s+/, /\s+–\s+/]) {
      const parts = one.split(sep).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) return parts.slice(0, 8);
    }
    const numbered = one
      .split(/\d+[\.)]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (numbered.length >= 2) return numbered.slice(0, 8);
    return [one, "Refine this pillar split in Brand Bible after review"];
  }
  return ["Audience truth & tension", "Brand role in culture", "Proof or product edge"];
}

const BRAND_BIBLE_ARRAY_KEYS = [
  "visualIdentity",
  "channelGuidelines",
  "mandatoryInclusions",
  "thingsToAvoid",
  "bannedPhrases",
  "preferredPhrases",
  "signaturePatterns",
  "emotionalBoundaries",
  "hookStyles",
  "narrativeStyles",
  "languageDnaPhrasesUse",
  "languageDnaPhrasesNever",
  "languageDnaSentenceRhythm",
  "languageDnaHeadlinePatterns",
  "languageDnaCtaPatterns",
  "categoryClichesToAvoid",
  "tasteCloserThan",
  "visualNeverLooksLike",
  "voicePrinciples",
  "rhythmRules",
  "signatureDevices",
  "culturalCodes",
] as const;

function normalizeOnboardingParsedJson(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const root = { ...(parsed as Record<string, unknown>) };

  const bb = root.brandBible;
  if (bb && typeof bb === "object") {
    const o = { ...(bb as Record<string, unknown>) };
    o.messagingPillars = coerceMessagingPillars(o.messagingPillars);
    for (const key of BRAND_BIBLE_ARRAY_KEYS) {
      if (key in o) o[key] = coerceStringArray(o[key]);
    }
    root.brandBible = o;
  }

  const sp = root.serviceBlueprint;
  if (sp && typeof sp === "object") {
    const o = { ...(sp as Record<string, unknown>) };
    let sv = coerceStringArray(o.activeServices);
    if (sv.length === 0) sv = ["Campaign strategy & creative"];
    o.activeServices = sv;
    root.serviceBlueprint = o;
  }

  const ob = root.optionalBrief;
  if (ob && typeof ob === "object") {
    const o = { ...(ob as Record<string, unknown>) };
    if ("deliverablesRequested" in o) {
      let d = coerceStringArray(o.deliverablesRequested);
      if (d.length === 0) d = ["Hero key visual + social toolkit"];
      o.deliverablesRequested = d;
    }
    if ("constraints" in o) {
      o.constraints = coerceStringArray(o.constraints);
    }
    root.optionalBrief = o;
  }

  return root;
}

/** LLM output shape — map to Prisma enums and domain types downstream. */
export const onboardingLlmDraftSchema = z.object({
  industry: z.string().min(1),
  brandBible: z.object({
    positioning: z.string().min(20),
    targetAudience: z.string().min(20),
    toneOfVoice: z.string().min(20),
    messagingPillars: z.array(z.string().min(1)).min(2).max(8),
    visualIdentity: lineArray,
    channelGuidelines: lineArray,
    mandatoryInclusions: lineArray,
    thingsToAvoid: lineArray,
    vocabularyStyle: z.enum(["SIMPLE", "ELEVATED", "TECHNICAL", "POETIC", "MIXED"]),
    sentenceStyle: z.enum(["SHORT", "MEDIUM", "LONG", "VARIED"]),
    primaryEmotion: z.enum([
      "ASPIRATION",
      "TRUST",
      "DESIRE",
      "URGENCY",
      "CALM",
      "BOLD",
    ]),
    persuasionStyle: z.enum(["SUBTLE", "DIRECT", "STORY_LED", "PROOF_LED"]),
    bannedPhrases: lineArray,
    preferredPhrases: lineArray,
    signaturePatterns: lineArray,
    emotionalToneDescription: z.string(),
    emotionalBoundaries: lineArray,
    hookStyles: lineArray,
    narrativeStyles: lineArray,
    visualStyle: z.string(),
    colorPhilosophy: z.string(),
    compositionStyle: z.string(),
    textureFocus: z.string(),
    lightingStyle: z.string(),
    languageDnaPhrasesUse: lineArray,
    languageDnaPhrasesNever: lineArray,
    languageDnaSentenceRhythm: lineArray,
    languageDnaHeadlinePatterns: lineArray,
    languageDnaCtaPatterns: lineArray,
    categoryTypicalBehavior: z.string(),
    categoryClichesToAvoid: lineArray,
    categoryDifferentiation: z.string(),
    tensionCoreContradiction: z.string(),
    tensionEmotionalBalance: z.string(),
    tasteCloserThan: lineArray,
    tasteShouldFeelLike: z.string(),
    tasteMustNotFeelLike: z.string(),
    visualNeverLooksLike: lineArray,
    visualCompositionTendencies: z.string(),
    visualMaterialTextureDirection: z.string(),
    visualLightingTendencies: z.string(),
    voicePrinciples: lineArray.default([]),
    rhythmRules: lineArray.default([]),
    signatureDevices: lineArray.default([]),
    culturalCodes: lineArray.default([]),
    emotionalRange: z.string().default(""),
    metaphorStyle: z.string().default(""),
    visualPhilosophy: z.string().default(""),
    brandTension: z.string().default(""),
  }),
  serviceBlueprint: z.object({
    templateType: z.enum(["FULL_PIPELINE", "CAMPAIGN_SPRINT", "RETAINER_MONTHLY", "CUSTOM"]),
    activeServices: z.array(z.string()).min(1),
    qualityThreshold: z.number().min(0).max(1),
    approvalRequired: z.boolean(),
  }),
  optionalBrief: z
    .object({
      title: z.string().min(1),
      businessObjective: z.string().min(20),
      communicationObjective: z.string().min(20),
      targetAudience: z.string().min(10),
      keyMessage: z.string().min(10),
      deliverablesRequested: z.array(z.string()).min(1),
      tone: z.string().min(1),
      constraints: z.array(z.string()),
      identityWorkflowEnabled: z.boolean().optional(),
    })
    .optional(),
});

export type OnboardingLlmDraft = z.infer<typeof onboardingLlmDraftSchema>;

export type RoughOnboardingInput = {
  brandName: string;
  websiteUrl: string;
  description: string;
  market: string;
  goal: string;
  notes: string;
  includeBriefDraft: boolean;
};

function systemPrompt(): string {
  return `You are a senior brand strategist helping INTERNAL product testing only.
Output a single JSON object matching the schema described in the user message.
Rules:
- This is a FIRST DRAFT for founder review — be specific, not generic marketing slop.
- Avoid banned clichés: "best in class", "innovative solution", "premium feel", "elevate your".
- Use public-brand-level knowledge only; do not claim confidential documents.
- Arrays of strings: short, actionable lines where appropriate.
- **Critical:** Any field described as string[] MUST be a JSON array, e.g. \`"visualIdentity": ["line one", "line two"]\` — never a single string or comma-joined paragraph for those keys.
- Enums must be exact uppercase tokens as specified.
- If includeBrief is false, omit optionalBrief entirely (null) or use key "optionalBrief": null in JSON — actually omit the key optionalBrief.
`;
}

function userPrompt(input: RoughOnboardingInput): string {
  return `Brand name: ${input.brandName}
Website (may be empty): ${input.websiteUrl || "—"}
One-line description: ${input.description}
Market / geography: ${input.market}
Campaign or project goal: ${input.goal}
Additional notes: ${input.notes || "—"}

Include a first campaign brief draft in JSON: ${input.includeBriefDraft ? "yes" : "no"}

Return JSON with this structure:
{
  "industry": string (concise sector label),
  "brandBible": {
    "positioning", "targetAudience", "toneOfVoice" (text),
    "messagingPillars": string[] (2-8),
    "visualIdentity", "channelGuidelines", "mandatoryInclusions", "thingsToAvoid": string[],
    "vocabularyStyle": "SIMPLE"|"ELEVATED"|"TECHNICAL"|"POETIC"|"MIXED",
    "sentenceStyle": "SHORT"|"MEDIUM"|"LONG"|"VARIED",
    "primaryEmotion": "ASPIRATION"|"TRUST"|"DESIRE"|"URGENCY"|"CALM"|"BOLD",
    "persuasionStyle": "SUBTLE"|"DIRECT"|"STORY_LED"|"PROOF_LED",
    "bannedPhrases", "preferredPhrases", "signaturePatterns": string[],
    "emotionalToneDescription": string,
    "emotionalBoundaries", "hookStyles", "narrativeStyles": string[],
    "visualStyle", "colorPhilosophy", "compositionStyle", "textureFocus", "lightingStyle": string,
    "languageDnaPhrasesUse", "languageDnaPhrasesNever", "languageDnaSentenceRhythm", "languageDnaHeadlinePatterns", "languageDnaCtaPatterns": string[],
    "categoryTypicalBehavior": string,
    "categoryClichesToAvoid": string[],
    "categoryDifferentiation": string,
    "tensionCoreContradiction", "tensionEmotionalBalance": string,
    "tasteCloserThan": string[] (each like "Closer to X than Y"),
    "tasteShouldFeelLike", "tasteMustNotFeelLike": string,
    "visualNeverLooksLike": string[],
    "visualCompositionTendencies", "visualMaterialTextureDirection", "visualLightingTendencies": string,
    "voicePrinciples", "rhythmRules", "signatureDevices", "culturalCodes": string[] (JSON arrays only, not one string),
    "emotionalRange", "metaphorStyle", "visualPhilosophy", "brandTension": string
  },
  "serviceBlueprint": {
    "templateType": "FULL_PIPELINE"|"CAMPAIGN_SPRINT"|"RETAINER_MONTHLY"|"CUSTOM",
    "activeServices": string[],
    "qualityThreshold": number 0-1,
    "approvalRequired": boolean
  }${
    input.includeBriefDraft
      ? `,
  "optionalBrief": {
    "title": string,
    "businessObjective", "communicationObjective", "targetAudience", "keyMessage": string,
    "deliverablesRequested": string[],
    "tone": string,
    "constraints": string[],
    "identityWorkflowEnabled": boolean optional
  }`
      : ""
  }
}

Only output valid JSON, no markdown fences.`;
}

export async function generateOnboardingDraftLlm(
  input: RoughOnboardingInput,
): Promise<{ ok: true; draft: OnboardingLlmDraft } | { ok: false; error: string }> {
  const provider = getLlmProvider();
  if (!provider) {
    return {
      ok: false,
      error:
        "No LLM configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env to generate an AI draft.",
    };
  }

  const messages = [
    { role: "system" as const, content: systemPrompt() },
    { role: "user" as const, content: userPrompt(input) },
  ];

  let text: string;
  try {
    const r = await provider.complete(messages, {
      maxTokens: 8192,
      jsonMode: provider.id === "openai",
    });
    text = r.text.trim();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `LLM call failed: ${msg}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      try {
        parsed = JSON.parse(fence[1]!.trim());
      } catch {
        return { ok: false, error: "Model returned non-JSON. Try again or shorten inputs." };
      }
    } else {
      return { ok: false, error: "Model returned non-JSON. Try again." };
    }
  }

  const normalized = normalizeOnboardingParsedJson(parsed);
  const refined = onboardingLlmDraftSchema.safeParse(normalized);
  if (!refined.success) {
    return {
      ok: false,
      error: `Draft validation: ${refined.error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ")}`,
    };
  }

  const data = { ...refined.data };
  if (!input.includeBriefDraft) {
    delete data.optionalBrief;
  }

  return { ok: true, draft: data };
}

export function mapDraftToBrandBibleInput(
  d: OnboardingLlmDraft["brandBible"],
): BrandBibleFormInput {
  return {
    positioning: d.positioning,
    targetAudience: d.targetAudience,
    toneOfVoice: d.toneOfVoice,
    messagingPillars: d.messagingPillars,
    visualIdentity: d.visualIdentity,
    channelGuidelines: d.channelGuidelines,
    mandatoryInclusions: d.mandatoryInclusions,
    thingsToAvoid: d.thingsToAvoid,
    vocabularyStyle: d.vocabularyStyle,
    sentenceStyle: d.sentenceStyle,
    bannedPhrases: d.bannedPhrases,
    preferredPhrases: d.preferredPhrases,
    signaturePatterns: d.signaturePatterns,
    primaryEmotion: d.primaryEmotion,
    emotionalToneDescription: d.emotionalToneDescription,
    emotionalBoundaries: d.emotionalBoundaries,
    hookStyles: d.hookStyles,
    narrativeStyles: d.narrativeStyles,
    persuasionStyle: d.persuasionStyle,
    visualStyle: d.visualStyle,
    colorPhilosophy: d.colorPhilosophy,
    compositionStyle: d.compositionStyle,
    textureFocus: d.textureFocus,
    lightingStyle: d.lightingStyle,
    languageDnaPhrasesUse: d.languageDnaPhrasesUse,
    languageDnaPhrasesNever: d.languageDnaPhrasesNever,
    languageDnaSentenceRhythm: d.languageDnaSentenceRhythm,
    languageDnaHeadlinePatterns: d.languageDnaHeadlinePatterns,
    languageDnaCtaPatterns: d.languageDnaCtaPatterns,
    categoryTypicalBehavior: d.categoryTypicalBehavior,
    categoryClichesToAvoid: d.categoryClichesToAvoid,
    categoryDifferentiation: d.categoryDifferentiation,
    tensionCoreContradiction: d.tensionCoreContradiction,
    tensionEmotionalBalance: d.tensionEmotionalBalance,
    tasteCloserThan: d.tasteCloserThan,
    tasteShouldFeelLike: d.tasteShouldFeelLike,
    tasteMustNotFeelLike: d.tasteMustNotFeelLike,
    visualNeverLooksLike: d.visualNeverLooksLike,
    visualCompositionTendencies: d.visualCompositionTendencies,
    visualMaterialTextureDirection: d.visualMaterialTextureDirection,
    visualLightingTendencies: d.visualLightingTendencies,
    voicePrinciples: d.voicePrinciples ?? [],
    rhythmRules: d.rhythmRules ?? [],
    signatureDevices: d.signatureDevices ?? [],
    culturalCodes: d.culturalCodes ?? [],
    emotionalRange: d.emotionalRange ?? "",
    metaphorStyle: d.metaphorStyle ?? "",
    visualPhilosophy: d.visualPhilosophy ?? "",
    brandTension: d.brandTension ?? "",
    onboardingSource: "ai_draft",
    aiOnboardingNeedsReview: true,
  };
}

export function mapDraftToServiceBlueprint(
  d: OnboardingLlmDraft["serviceBlueprint"],
): ServiceBlueprintFormInput {
  return {
    templateType: d.templateType,
    activeServices: d.activeServices,
    qualityThreshold: d.qualityThreshold,
    approvalRequired: d.approvalRequired,
  };
}

export function mapOptionalBriefToInput(
  b: NonNullable<OnboardingLlmDraft["optionalBrief"]>,
  deadline: Date,
): BriefFormInput {
  return {
    title: b.title,
    businessObjective: b.businessObjective,
    communicationObjective: b.communicationObjective,
    targetAudience: b.targetAudience,
    keyMessage: b.keyMessage,
    deliverablesRequested: b.deliverablesRequested,
    engagementType: "CUSTOM",
    workstreams: [],
    tone: b.tone,
    constraints: b.constraints,
    deadline,
    identityWorkflowEnabled: b.identityWorkflowEnabled ?? false,
    onboardingSource: "ai_draft",
    aiOnboardingNeedsReview: true,
  };
}
