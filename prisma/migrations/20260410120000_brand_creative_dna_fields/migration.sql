-- Creative DNA engine: expressive Brand OS fields (extends BrandBible; defaults keep existing rows valid)
ALTER TABLE "BrandBible" ADD COLUMN "voicePrinciples" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "rhythmRules" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "signatureDevices" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "culturalCodes" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandBible" ADD COLUMN "emotionalRange" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "metaphorStyle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "visualPhilosophy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "brandTension" TEXT NOT NULL DEFAULT '';
