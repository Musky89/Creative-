/**
 * Build once (master compose) → resize/cover to platform specs (repurpose).
 * Server-only (uses sharp).
 */

import sharp from "sharp";
import type { SocialPlatformId } from "@/lib/production-engine/channel-specs";
import { SOCIAL_PLATFORM_SPECS } from "@/lib/production-engine/channel-specs";

export type RepurposeResult = {
  platformId: SocialPlatformId;
  width: number;
  height: number;
  pngBuffer: Buffer;
};

export async function repurposeSocialPngToPlatforms(
  masterPng: Buffer,
  platformIds: SocialPlatformId[],
): Promise<RepurposeResult[]> {
  const out: RepurposeResult[] = [];
  for (const id of platformIds) {
    if (id === "showcase_master") continue;
    const spec = SOCIAL_PLATFORM_SPECS[id];
    if (!spec) continue;
    const buf = await sharp(masterPng)
      .resize(spec.width, spec.height, { fit: "cover", position: "attention" })
      .png({ compressionLevel: 6 })
      .toBuffer();
    out.push({ platformId: id, width: spec.width, height: spec.height, pngBuffer: buf });
  }
  return out;
}
