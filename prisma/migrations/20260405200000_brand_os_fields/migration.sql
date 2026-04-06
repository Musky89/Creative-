-- CreateEnum
CREATE TYPE "VocabularyStyle" AS ENUM ('SIMPLE', 'ELEVATED', 'TECHNICAL', 'POETIC', 'MIXED');

-- CreateEnum
CREATE TYPE "SentenceStyle" AS ENUM ('SHORT', 'MEDIUM', 'LONG', 'VARIED');

-- CreateEnum
CREATE TYPE "PrimaryEmotion" AS ENUM ('ASPIRATION', 'TRUST', 'DESIRE', 'URGENCY', 'CALM', 'BOLD');

-- CreateEnum
CREATE TYPE "PersuasionStyle" AS ENUM ('SUBTLE', 'DIRECT', 'STORY_LED', 'PROOF_LED');

-- AlterTable
ALTER TABLE "BrandBible" ADD COLUMN     "vocabularyStyle" "VocabularyStyle" NOT NULL DEFAULT 'SIMPLE',
ADD COLUMN     "sentenceStyle" "SentenceStyle" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "bannedPhrases" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "preferredPhrases" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "signaturePatterns" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "primaryEmotion" "PrimaryEmotion" NOT NULL DEFAULT 'TRUST',
ADD COLUMN     "emotionalToneDescription" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "emotionalBoundaries" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "hookStyles" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "narrativeStyles" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "persuasionStyle" "PersuasionStyle" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "visualStyle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "colorPhilosophy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "compositionStyle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "textureFocus" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lightingStyle" TEXT NOT NULL DEFAULT '';
