-- Demo / onboarding labeling (internal testing)
ALTER TABLE "Client" ADD COLUMN "isDemoClient" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "BrandBible" ADD COLUMN "onboardingSource" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandBible" ADD COLUMN "aiOnboardingNeedsReview" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Brief" ADD COLUMN "onboardingSource" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Brief" ADD COLUMN "aiOnboardingNeedsReview" BOOLEAN NOT NULL DEFAULT false;
