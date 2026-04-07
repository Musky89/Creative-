-- Learned visual DNA per client + LoRA / fine-tune hook on Client
CREATE TABLE "BrandVisualProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "styleKeywords" JSONB NOT NULL DEFAULT '[]',
    "lightingPatterns" JSONB NOT NULL DEFAULT '[]',
    "compositionPatterns" JSONB NOT NULL DEFAULT '[]',
    "colorSignatures" JSONB NOT NULL DEFAULT '[]',
    "texturePatterns" JSONB NOT NULL DEFAULT '[]',
    "framingRules" JSONB NOT NULL DEFAULT '[]',
    "negativeTraits" JSONB NOT NULL DEFAULT '[]',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confirmationCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandVisualProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandVisualProfile_clientId_key" ON "BrandVisualProfile"("clientId");

ALTER TABLE "BrandVisualProfile" ADD CONSTRAINT "BrandVisualProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Client" ADD COLUMN "visualModelRef" TEXT;
