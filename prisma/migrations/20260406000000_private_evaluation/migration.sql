-- CreateEnum
CREATE TYPE "PrivateEvaluationStage" AS ENUM ('STRATEGY', 'CONCEPT', 'VISUAL_SPEC', 'COPY', 'VISUAL_ASSET');

-- CreateEnum
CREATE TYPE "PrivateEvaluationVerdict" AS ENUM ('PASS', 'FAIL', 'NEEDS_WORK');

-- AlterTable
ALTER TABLE "Brief" ADD COLUMN     "isTestBrief" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "testCategory" TEXT;

-- CreateIndex
CREATE INDEX "Brief_clientId_isTestBrief_idx" ON "Brief"("clientId", "isTestBrief");

-- CreateTable
CREATE TABLE "PrivateEvaluationSession" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateEvaluationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateEvaluationRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "sessionId" TEXT,
    "stage" "PrivateEvaluationStage" NOT NULL,
    "verdict" "PrivateEvaluationVerdict" NOT NULL,
    "notes" TEXT NOT NULL,
    "feltGeneric" BOOLEAN NOT NULL DEFAULT false,
    "brandAlignmentStrong" BOOLEAN,
    "wouldUse" BOOLEAN,
    "artifactId" TEXT,
    "visualAssetId" TEXT,
    "detectedStillWeakAfterRegen" BOOLEAN NOT NULL DEFAULT false,
    "detectedFrameworkIds" JSONB,
    "issueTags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateEvaluationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivateEvaluationSession_briefId_idx" ON "PrivateEvaluationSession"("briefId");

-- CreateIndex
CREATE INDEX "PrivateEvaluationSession_createdAt_idx" ON "PrivateEvaluationSession"("createdAt");

-- CreateIndex
CREATE INDEX "PrivateEvaluationRecord_clientId_idx" ON "PrivateEvaluationRecord"("clientId");

-- CreateIndex
CREATE INDEX "PrivateEvaluationRecord_briefId_idx" ON "PrivateEvaluationRecord"("briefId");

-- CreateIndex
CREATE INDEX "PrivateEvaluationRecord_clientId_createdAt_idx" ON "PrivateEvaluationRecord"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "PrivateEvaluationRecord_stage_idx" ON "PrivateEvaluationRecord"("stage");

-- AddForeignKey
ALTER TABLE "PrivateEvaluationSession" ADD CONSTRAINT "PrivateEvaluationSession_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateEvaluationRecord" ADD CONSTRAINT "PrivateEvaluationRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateEvaluationRecord" ADD CONSTRAINT "PrivateEvaluationRecord_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateEvaluationRecord" ADD CONSTRAINT "PrivateEvaluationRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PrivateEvaluationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateEvaluationRecord" ADD CONSTRAINT "PrivateEvaluationRecord_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateEvaluationRecord" ADD CONSTRAINT "PrivateEvaluationRecord_visualAssetId_fkey" FOREIGN KEY ("visualAssetId") REFERENCES "VisualAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
