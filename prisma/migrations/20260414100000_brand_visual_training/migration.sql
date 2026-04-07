CREATE TYPE "BrandVisualTrainingJobStatus" AS ENUM (
  'DRAFT',
  'PREPARING',
  'QUEUED',
  'TRAINING',
  'FINALIZING',
  'COMPLETE',
  'FAILED'
);

CREATE TABLE "BrandVisualTrainingJob" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "BrandVisualTrainingJobStatus" NOT NULL DEFAULT 'DRAFT',
    "trainingQuality" TEXT NOT NULL DEFAULT '',
    "guidanceLines" JSONB NOT NULL DEFAULT '[]',
    "falRequestId" TEXT,
    "falStatusPayload" JSONB,
    "resultPayload" JSONB,
    "errorMessage" TEXT,
    "previousVisualModelRef" TEXT,
    "newVisualModelRef" TEXT,
    "comparisonBaseAssetId" TEXT,
    "comparisonStyledAssetId" TEXT,
    "comparisonNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BrandVisualTrainingJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandVisualTrainingJob_clientId_createdAt_idx" ON "BrandVisualTrainingJob"("clientId", "createdAt" DESC);

ALTER TABLE "BrandVisualTrainingJob" ADD CONSTRAINT "BrandVisualTrainingJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BrandVisualTrainingAsset" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "visualAssetId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "styleTags" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandVisualTrainingAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandVisualTrainingAsset_jobId_idx" ON "BrandVisualTrainingAsset"("jobId");

ALTER TABLE "BrandVisualTrainingAsset" ADD CONSTRAINT "BrandVisualTrainingAsset_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "BrandVisualTrainingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandVisualTrainingAsset" ADD CONSTRAINT "BrandVisualTrainingAsset_visualAssetId_fkey" FOREIGN KEY ("visualAssetId") REFERENCES "VisualAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Client" ADD COLUMN "lastBrandStyleTrainedAt" TIMESTAMP(3);
