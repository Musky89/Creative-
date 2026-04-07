-- Variant surfacing: secondary pick + auto-reject from quality pipeline
ALTER TABLE "VisualAsset" ADD COLUMN "isSecondary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VisualAsset" ADD COLUMN "autoRejected" BOOLEAN NOT NULL DEFAULT false;
