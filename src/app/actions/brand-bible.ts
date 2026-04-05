"use server";

import { revalidatePath } from "next/cache";
import type {
  PersuasionStyle,
  PrimaryEmotion,
  SentenceStyle,
  VocabularyStyle,
} from "@/generated/prisma/client";
import { upsertBrandBible } from "@/server/domain/brand-bible";

export type FormState = { error?: string } | { ok: true } | null;

const VOCAB: VocabularyStyle[] = [
  "SIMPLE",
  "ELEVATED",
  "TECHNICAL",
  "POETIC",
  "MIXED",
];
const SENT: SentenceStyle[] = ["SHORT", "MEDIUM", "LONG", "VARIED"];
const EMOT: PrimaryEmotion[] = [
  "ASPIRATION",
  "TRUST",
  "DESIRE",
  "URGENCY",
  "CALM",
  "BOLD",
];
const PERS: PersuasionStyle[] = ["SUBTLE", "DIRECT", "STORY_LED", "PROOF_LED"];

function parseEnum<T extends string>(allowed: readonly T[], raw: string, fallback: T): T {
  const v = raw.trim() as T;
  return allowed.includes(v) ? v : fallback;
}

export async function saveBrandBibleFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) return { error: "Missing client." };
  return saveBrandBibleAction(clientId, formData);
}

export async function saveBrandBibleAction(clientId: string, formData: FormData) {
  const positioning = String(formData.get("positioning") ?? "").trim();
  const targetAudience = String(formData.get("targetAudience") ?? "").trim();
  const toneOfVoice = String(formData.get("toneOfVoice") ?? "").trim();
  const messagingPillarsRaw = String(formData.get("messagingPillars") ?? "");
  const visualIdentityRaw = String(formData.get("visualIdentity") ?? "");
  const channelGuidelinesRaw = String(formData.get("channelGuidelines") ?? "");
  const mandatoryInclusionsRaw = String(formData.get("mandatoryInclusions") ?? "");
  const thingsToAvoidRaw = String(formData.get("thingsToAvoid") ?? "");
  const vocabularyStyle = parseEnum(VOCAB, String(formData.get("vocabularyStyle") ?? ""), "SIMPLE");
  const sentenceStyle = parseEnum(SENT, String(formData.get("sentenceStyle") ?? ""), "MEDIUM");
  const primaryEmotion = parseEnum(EMOT, String(formData.get("primaryEmotion") ?? ""), "TRUST");
  const persuasionStyle = parseEnum(PERS, String(formData.get("persuasionStyle") ?? ""), "DIRECT");
  const bannedPhrasesRaw = String(formData.get("bannedPhrases") ?? "");
  const preferredPhrasesRaw = String(formData.get("preferredPhrases") ?? "");
  const signaturePatternsRaw = String(formData.get("signaturePatterns") ?? "");
  const emotionalToneDescription = String(
    formData.get("emotionalToneDescription") ?? "",
  ).trim();
  const emotionalBoundariesRaw = String(formData.get("emotionalBoundaries") ?? "");
  const hookStylesRaw = String(formData.get("hookStyles") ?? "");
  const narrativeStylesRaw = String(formData.get("narrativeStyles") ?? "");
  const visualStyle = String(formData.get("visualStyle") ?? "").trim();
  const colorPhilosophy = String(formData.get("colorPhilosophy") ?? "").trim();
  const compositionStyle = String(formData.get("compositionStyle") ?? "").trim();
  const textureFocus = String(formData.get("textureFocus") ?? "").trim();
  const lightingStyle = String(formData.get("lightingStyle") ?? "").trim();

  if (!positioning || !targetAudience || !toneOfVoice) {
    return { error: "Positioning, target audience, and tone of voice are required." };
  }

  const lines = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  await upsertBrandBible(clientId, {
    positioning,
    targetAudience,
    toneOfVoice,
    messagingPillars: lines(messagingPillarsRaw),
    visualIdentity: lines(visualIdentityRaw),
    channelGuidelines: lines(channelGuidelinesRaw),
    mandatoryInclusions: lines(mandatoryInclusionsRaw),
    thingsToAvoid: lines(thingsToAvoidRaw),
    vocabularyStyle,
    sentenceStyle,
    bannedPhrases: lines(bannedPhrasesRaw),
    preferredPhrases: lines(preferredPhrasesRaw),
    signaturePatterns: lines(signaturePatternsRaw),
    primaryEmotion,
    emotionalToneDescription,
    emotionalBoundaries: lines(emotionalBoundariesRaw),
    hookStyles: lines(hookStylesRaw),
    narrativeStyles: lines(narrativeStylesRaw),
    persuasionStyle,
    visualStyle,
    colorPhilosophy,
    compositionStyle,
    textureFocus,
    lightingStyle,
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/brand-bible`);
  return { ok: true as const };
}
