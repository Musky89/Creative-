-- AlterTable
ALTER TABLE "VisualAsset" ADD COLUMN     "isPreferred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "founderRejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "regenerationAttempt" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VisualAssetReview" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "visualAssetId" TEXT NOT NULL,
    "sourceSpecArtifactId" TEXT,
    "evaluation" JSONB NOT NULL,
    "qualityVerdict" TEXT NOT NULL,
    "regenerationRecommended" BOOLEAN NOT NULL DEFAULT false,
    "evaluator" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisualAssetReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisualAssetReview_visualAssetId_key" ON "VisualAssetReview"("visualAssetId");

-- CreateIndex
CREATE INDEX "VisualAssetReview_clientId_idx" ON "VisualAssetReview"("clientId");

-- CreateIndex
CREATE INDEX "VisualAssetReview_sourceSpecArtifactId_idx" ON "VisualAssetReview"("sourceSpecArtifactId");

-- AddForeignKey
ALTER TABLE "VisualAssetReview" ADD CONSTRAINT "VisualAssetReview_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualAssetReview" ADD CONSTRAINT "VisualAssetReview_visualAssetId_fkey" FOREIGN KEY ("visualAssetId") REFERENCES "VisualAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualAssetReview" ADD CONSTRAINT "VisualAssetReview_sourceSpecArtifactId_fkey" FOREIGN KEY ("sourceSpecArtifactId") REFERENCES "Artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
