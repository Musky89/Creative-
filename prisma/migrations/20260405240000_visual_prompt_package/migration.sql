-- CreateEnum
CREATE TYPE "VisualPromptProviderTarget" AS ENUM ('GENERIC', 'GEMINI_IMAGE', 'GPT_IMAGE');

-- AlterEnum
ALTER TYPE "ArtifactType" ADD VALUE 'VISUAL_PROMPT_PACKAGE';
