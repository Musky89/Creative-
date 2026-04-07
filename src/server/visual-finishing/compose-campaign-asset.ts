/**
 * Legacy entry: single finishing pass (headline overlay, brand tint, grain, vignette).
 * Delegates to Final Output Composer with CAMPAIGN_DEFAULT format.
 */
import type { BrandBible } from "@/generated/prisma/client";
import { composeFinalOutput } from "@/server/visual-finishing/final-output-composer";

export type TextPlacement = "top_left" | "center" | "bottom_safe";

export type ComposeCampaignAssetArgs = {
  sourceVisualAssetId: string;
  clientId: string;
  briefId: string;
  headline: string;
  placement?: TextPlacement;
  brandBible: Pick<
    BrandBible,
    "colorPhilosophy" | "visualStyle" | "compositionStyle"
  > | null;
  brandColors?: string[];
};

/** @deprecated Use extractBrandHexColors from final-output-composer path if needed elsewhere */
export function extractBrandHexColors(text: string, max = 3): string[] {
  const re = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && found.length < max) {
    const full = m[0]!.toUpperCase();
    if (!found.includes(full)) found.push(full);
  }
  return found;
}

export async function composeCampaignAsset(
  args: ComposeCampaignAssetArgs,
): Promise<{ id: string }> {
  const { id } = await composeFinalOutput({
    sourceVisualAssetId: args.sourceVisualAssetId,
    clientId: args.clientId,
    briefId: args.briefId,
    headline: args.headline,
    format: "CAMPAIGN_DEFAULT",
    highResScale: 1,
    placement: args.placement,
    brandBible: args.brandBible,
    brandColors: args.brandColors,
  });
  return { id };
}
