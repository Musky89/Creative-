-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkflowStage" AS ENUM ('BRIEF_INTAKE', 'STRATEGY', 'CONCEPTING', 'COPY_DEVELOPMENT', 'REVIEW', 'EXPORT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'READY', 'RUNNING', 'AWAITING_REVIEW', 'REVISE_REQUIRED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('STRATEGIST', 'CREATIVE_DIRECTOR', 'COPYWRITER', 'BRAND_GUARDIAN');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('STRATEGY', 'CONCEPT', 'COPY', 'REVIEW_REPORT', 'EXPORT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "ServiceBlueprintTemplateType" AS ENUM ('FULL_PIPELINE', 'CAMPAIGN_SPRINT', 'RETAINER_MONTHLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandBible" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "positioning" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "toneOfVoice" TEXT NOT NULL,
    "messagingPillars" JSONB NOT NULL,
    "visualIdentity" JSONB NOT NULL,
    "channelGuidelines" JSONB NOT NULL,
    "mandatoryInclusions" JSONB NOT NULL,
    "thingsToAvoid" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandBible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBlueprint" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateType" "ServiceBlueprintTemplateType" NOT NULL,
    "activeServices" JSONB NOT NULL,
    "qualityThreshold" DOUBLE PRECISION NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL,

    CONSTRAINT "ServiceBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "businessObjective" TEXT NOT NULL,
    "communicationObjective" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "keyMessage" TEXT NOT NULL,
    "deliverablesRequested" JSONB NOT NULL,
    "tone" TEXT NOT NULL,
    "constraints" JSONB NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "stage" "WorkflowStage" NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "artifactId" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandBible_clientId_key" ON "BrandBible"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBlueprint_clientId_key" ON "ServiceBlueprint"("clientId");

-- CreateIndex
CREATE INDEX "ServiceBlueprint_templateType_idx" ON "ServiceBlueprint"("templateType");

-- CreateIndex
CREATE INDEX "Brief_clientId_idx" ON "Brief"("clientId");

-- CreateIndex
CREATE INDEX "Brief_createdAt_idx" ON "Brief"("createdAt");

-- CreateIndex
CREATE INDEX "Task_briefId_idx" ON "Task"("briefId");

-- CreateIndex
CREATE INDEX "Task_briefId_stage_idx" ON "Task"("briefId", "stage");

-- CreateIndex
CREATE INDEX "Task_briefId_status_idx" ON "Task"("briefId", "status");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "TaskDependency_dependsOnTaskId_idx" ON "TaskDependency"("dependsOnTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_taskId_dependsOnTaskId_key" ON "TaskDependency"("taskId", "dependsOnTaskId");

-- CreateIndex
CREATE INDEX "Artifact_taskId_idx" ON "Artifact"("taskId");

-- CreateIndex
CREATE INDEX "Artifact_taskId_type_idx" ON "Artifact"("taskId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_taskId_type_version_key" ON "Artifact"("taskId", "type", "version");

-- CreateIndex
CREATE INDEX "ReviewItem_taskId_idx" ON "ReviewItem"("taskId");

-- CreateIndex
CREATE INDEX "ReviewItem_taskId_status_idx" ON "ReviewItem"("taskId", "status");

-- CreateIndex
CREATE INDEX "ReviewItem_artifactId_idx" ON "ReviewItem"("artifactId");

-- CreateIndex
CREATE INDEX "AgentRun_taskId_idx" ON "AgentRun"("taskId");

-- CreateIndex
CREATE INDEX "AgentRun_taskId_createdAt_idx" ON "AgentRun"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentRun_agentType_idx" ON "AgentRun"("agentType");

-- AddForeignKey
ALTER TABLE "BrandBible" ADD CONSTRAINT "BrandBible_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBlueprint" ADD CONSTRAINT "ServiceBlueprint_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Orchestrator invariant: a task must not depend on itself (graph hygiene).
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_no_self_reference" CHECK ("taskId" <> "dependsOnTaskId");
