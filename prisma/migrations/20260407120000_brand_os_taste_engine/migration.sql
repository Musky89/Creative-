-- Brand OS: high-precision taste engine (language DNA, category, tension, taste refs, visual rules)
ALTER TABLE "BrandBible" ADD COLUMN "languageDnaPhrasesUse" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "languageDnaPhrasesNever" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "languageDnaSentenceRhythm" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "languageDnaHeadlinePatterns" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "languageDnaCtaPatterns" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "categoryTypicalBehavior" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "categoryClichesToAvoid" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "categoryDifferentiation" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "tensionCoreContradiction" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "tensionEmotionalBalance" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "tasteCloserThan" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "tasteShouldFeelLike" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "tasteMustNotFeelLike" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "visualNeverLooksLike" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "visualCompositionTendencies" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "visualMaterialTextureDirection" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "visualLightingTendencies" TEXT NOT NULL DEFAULT '';
