-- ReviewItem: reviewer prep for future auth
ALTER TABLE "ReviewItem" ADD COLUMN "reviewerLabel" TEXT;
ALTER TABLE "ReviewItem" ADD COLUMN "reviewerSource" TEXT NOT NULL DEFAULT 'studio';

-- AgentRun: structured metadata (provider, repair, fallback, etc.)
ALTER TABLE "AgentRun" ADD COLUMN "metadata" JSONB;
