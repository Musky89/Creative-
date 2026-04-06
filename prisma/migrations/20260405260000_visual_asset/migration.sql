-- CreateEnum
CREATE TYPE "VisualAssetStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "VisualAsset" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sourceArtifactId" TEXT NOT NULL,
    "providerTarget" "VisualPromptProviderTarget" NOT NULL,
    "providerName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptUsed" TEXT NOT NULL,
    "negativePromptUsed" TEXT NOT NULL,
    "status" "VisualAssetStatus" NOT NULL DEFAULT 'PENDING',
    "resultUrl" TEXT,
    "localPath" TEXT,
    "metadata" JSONB,
    "variantLabel" TEXT,
    "generationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisualAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisualAsset_clientId_idx" ON "VisualAsset"("clientId");

-- CreateIndex
CREATE INDEX "VisualAsset_briefId_idx" ON "VisualAsset"("briefId");

-- CreateIndex
CREATE INDEX "VisualAsset_taskId_idx" ON "VisualAsset"("taskId");

-- CreateIndex
CREATE INDEX "VisualAsset_sourceArtifactId_idx" ON "VisualAsset"("sourceArtifactId");

-- CreateIndex
CREATE INDEX "VisualAsset_status_idx" ON "VisualAsset"("status");

-- AddForeignKey
ALTER TABLE "VisualAsset" ADD CONSTRAINT "VisualAsset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualAsset" ADD CONSTRAINT "VisualAsset_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualAsset" ADD CONSTRAINT "VisualAsset_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualAsset" ADD CONSTRAINT "VisualAsset_sourceArtifactId_fkey" FOREIGN KEY ("sourceArtifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
