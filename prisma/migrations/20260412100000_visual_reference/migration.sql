-- Visual reference library + brief-level URL overrides for grounding generation
CREATE TYPE "VisualReferenceCategory" AS ENUM ('COMPOSITION', 'LIGHTING', 'STYLE', 'BRAND');

CREATE TABLE "VisualReference" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "label" TEXT NOT NULL,
    "category" "VisualReferenceCategory" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualReference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VisualReference_clientId_idx" ON "VisualReference"("clientId");
CREATE INDEX "VisualReference_category_idx" ON "VisualReference"("category");

ALTER TABLE "VisualReference" ADD CONSTRAINT "VisualReference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Brief" ADD COLUMN "visualReferenceOverrides" JSONB NOT NULL DEFAULT '[]';
