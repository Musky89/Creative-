import type {
  PersuasionStyle,
  PrimaryEmotion,
  Prisma,
  SentenceStyle,
  VocabularyStyle,
} from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

export type BrandBibleFormInput = {
  positioning: string;
  targetAudience: string;
  toneOfVoice: string;
  messagingPillars: Prisma.InputJsonValue;
  visualIdentity: Prisma.InputJsonValue;
  channelGuidelines: Prisma.InputJsonValue;
  mandatoryInclusions: Prisma.InputJsonValue;
  thingsToAvoid: Prisma.InputJsonValue;
  vocabularyStyle: VocabularyStyle;
  sentenceStyle: SentenceStyle;
  bannedPhrases: Prisma.InputJsonValue;
  preferredPhrases: Prisma.InputJsonValue;
  signaturePatterns: Prisma.InputJsonValue;
  primaryEmotion: PrimaryEmotion;
  emotionalToneDescription: string;
  emotionalBoundaries: Prisma.InputJsonValue;
  hookStyles: Prisma.InputJsonValue;
  narrativeStyles: Prisma.InputJsonValue;
  persuasionStyle: PersuasionStyle;
  visualStyle: string;
  colorPhilosophy: string;
  compositionStyle: string;
  textureFocus: string;
  lightingStyle: string;
};

export async function upsertBrandBible(
  clientId: string,
  data: BrandBibleFormInput,
) {
  const prisma = getPrisma();
  return prisma.brandBible.upsert({
    where: { clientId },
    create: { clientId, ...data },
    update: data,
  });
}
