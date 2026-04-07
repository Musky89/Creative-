-- Extend Brand Memory for learning system (explainable categories + outcomes).

ALTER TYPE "BrandMemoryType" ADD VALUE 'STRATEGY';
ALTER TYPE "BrandMemoryType" ADD VALUE 'BRAND_STYLE';
ALTER TYPE "BrandMemoryType" ADD VALUE 'CAMPAIGN_PATTERN';

ALTER TYPE "BrandMemoryOutcome" ADD VALUE 'SELECTED';
ALTER TYPE "BrandMemoryOutcome" ADD VALUE 'FAILED';
