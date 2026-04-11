/**
 * Channel / platform specs for deterministic compose dimensions and QA hints.
 * "Build once, repurpose" — master creative in a showcase aspect, then export targets per platform.
 */

import { z } from "zod";

/** Known social export targets (extend as needed). */
export const SOCIAL_PLATFORM_IDS = [
  "showcase_master",
  "instagram_feed_square",
  "instagram_feed_portrait",
  "instagram_story",
  "facebook_feed",
  "linkedin_feed",
  "tiktok_safe",
  "pinterest_pin",
  "twitter_post",
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];

export const socialPlatformIdSchema = z.enum([
  "showcase_master",
  "instagram_feed_square",
  "instagram_feed_portrait",
  "instagram_story",
  "facebook_feed",
  "linkedin_feed",
  "tiktok_safe",
  "pinterest_pin",
  "twitter_post",
]);

export const socialOutputTargetSchema = z.union([
  z.object({ kind: z.literal("showcase_master") }),
  z.object({
    kind: z.literal("platform"),
    platformId: socialPlatformIdSchema,
  }),
]);

export type SocialOutputTarget = z.infer<typeof socialOutputTargetSchema>;

export type SocialPlatformSpec = {
  id: SocialPlatformId;
  label: string;
  width: number;
  height: number;
  /** Safe caption zone hint (relative to canvas) for future UI */
  safeZoneNote?: string;
};

export const SOCIAL_PLATFORM_SPECS: Record<SocialPlatformId, SocialPlatformSpec> = {
  showcase_master: {
    id: "showcase_master",
    label: "Showcase master (4:5 feed)",
    width: 1080,
    height: 1350,
    safeZoneNote: "Primary art direction reference; repurpose to other ratios from this.",
  },
  instagram_feed_square: {
    id: "instagram_feed_square",
    label: "Instagram feed (1:1)",
    width: 1080,
    height: 1080,
  },
  instagram_feed_portrait: {
    id: "instagram_feed_portrait",
    label: "Instagram feed (4:5)",
    width: 1080,
    height: 1350,
  },
  instagram_story: {
    id: "instagram_story",
    label: "Instagram story (9:16)",
    width: 1080,
    height: 1920,
    safeZoneNote: "Keep headline/CTA in central safe area; avoid top/bottom UI chrome.",
  },
  facebook_feed: {
    id: "facebook_feed",
    label: "Facebook feed (1.91:1 approx)",
    width: 1200,
    height: 628,
  },
  linkedin_feed: {
    id: "linkedin_feed",
    label: "LinkedIn feed (1.91:1)",
    width: 1200,
    height: 627,
  },
  tiktok_safe: {
    id: "tiktok_safe",
    label: "TikTok vertical (9:16)",
    width: 1080,
    height: 1920,
    safeZoneNote: "Vertical-first; type size may need bump for legibility.",
  },
  pinterest_pin: {
    id: "pinterest_pin",
    label: "Pinterest (2:3)",
    width: 1000,
    height: 1500,
  },
  twitter_post: {
    id: "twitter_post",
    label: "X / Twitter (16:9)",
    width: 1200,
    height: 675,
  },
};

export function resolveSocialCanvasDimensions(
  target: SocialOutputTarget | undefined,
): { width: number; height: number; platformId: SocialPlatformId; label: string } {
  const t = target;
  if (!t || t.kind === "showcase_master") {
    const s = SOCIAL_PLATFORM_SPECS.showcase_master;
    return { width: s.width, height: s.height, platformId: s.id, label: s.label };
  }
  const spec = SOCIAL_PLATFORM_SPECS[t.platformId];
  if (!spec) {
    const s = SOCIAL_PLATFORM_SPECS.showcase_master;
    return { width: s.width, height: s.height, platformId: s.id, label: s.label };
  }
  return { width: spec.width, height: spec.height, platformId: spec.id, label: spec.label };
}

export function listSocialPlatformsForUi(): SocialPlatformSpec[] {
  return Object.values(SOCIAL_PLATFORM_SPECS);
}
