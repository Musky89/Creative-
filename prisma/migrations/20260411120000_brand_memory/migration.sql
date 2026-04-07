-- Brand Memory: learn from founder / judge decisions per client
CREATE TYPE "BrandMemoryType" AS ENUM ('CONCEPT', 'COPY', 'VISUAL', 'TONE');
CREATE TYPE "BrandMemoryOutcome" AS ENUM ('APPROVED', 'REJECTED');

CREATE TABLE "BrandMemory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "BrandMemoryType" NOT NULL,
    "frameworkId" TEXT,
    "summary" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "outcome" "BrandMemoryOutcome" NOT NULL,
    "strengthScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMemory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandMemory_clientId_createdAt_idx" ON "BrandMemory"("clientId", "createdAt" DESC);
CREATE INDEX "BrandMemory_clientId_type_idx" ON "BrandMemory"("clientId", "type");

ALTER TABLE "BrandMemory" ADD CONSTRAINT "BrandMemory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BrandMemoryAggregate" (
    "clientId" TEXT NOT NULL,
    "aggregatedPatterns" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandMemoryAggregate_pkey" PRIMARY KEY ("clientId")
);

ALTER TABLE "BrandMemoryAggregate" ADD CONSTRAINT "BrandMemoryAggregate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
