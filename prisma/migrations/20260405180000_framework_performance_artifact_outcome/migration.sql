-- CreateEnum
CREATE TYPE "ArtifactOutcomeType" AS ENUM ('APPROVED', 'REVISED', 'REJECTED');

-- CreateTable
CREATE TABLE "FrameworkPerformance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "approvals" INTEGER NOT NULL DEFAULT 0,
    "revisions" INTEGER NOT NULL DEFAULT 0,
    "rejections" INTEGER NOT NULL DEFAULT 0,
    "stillWeakAfterRegenCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactOutcome" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "frameworkIds" JSONB NOT NULL,
    "outcome" "ArtifactOutcomeType" NOT NULL,
    "stillWeakAfterRegen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtifactOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkPerformance_clientId_frameworkId_key" ON "FrameworkPerformance"("clientId", "frameworkId");

-- CreateIndex
CREATE INDEX "FrameworkPerformance_clientId_idx" ON "FrameworkPerformance"("clientId");

-- CreateIndex
CREATE INDEX "FrameworkPerformance_frameworkId_idx" ON "FrameworkPerformance"("frameworkId");

-- CreateIndex
CREATE INDEX "ArtifactOutcome_clientId_idx" ON "ArtifactOutcome"("clientId");

-- CreateIndex
CREATE INDEX "ArtifactOutcome_artifactId_idx" ON "ArtifactOutcome"("artifactId");

-- CreateIndex
CREATE INDEX "ArtifactOutcome_clientId_createdAt_idx" ON "ArtifactOutcome"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "FrameworkPerformance" ADD CONSTRAINT "FrameworkPerformance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactOutcome" ADD CONSTRAINT "ArtifactOutcome_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactOutcome" ADD CONSTRAINT "ArtifactOutcome_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
