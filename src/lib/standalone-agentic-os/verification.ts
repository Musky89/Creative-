import type { BrandGraph, CampaignGraph, CreativeProposal, ChannelSpec } from "./schemas";
import { verificationResultSchema, type VerificationResult } from "./schemas";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}

function contrastRatio(hexA: string, hexB: string): number {
  const L1 = relativeLuminance(hexA);
  const L2 = relativeLuminance(hexB);
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (light + 0.05) / (dark + 0.05);
}

function pickPaletteColors(brand: BrandGraph): { bg?: string; fg?: string } {
  const bg = brand.palette.find((p) => p.role === "background")?.hex;
  const fg = brand.palette.find((p) => p.role === "text")?.hex;
  return { bg, fg };
}

export function runVerification(args: {
  brand: BrandGraph;
  campaign: CampaignGraph;
  channel: ChannelSpec;
  proposal: CreativeProposal;
}): VerificationResult {
  const { brand, channel, proposal } = args;
  const checks: VerificationResult["checks"] = [];

  const hLen = proposal.headline.length;
  checks.push({
    id: "headline-length",
    label: `Headline ≤ ${channel.maxHeadlineChars} chars`,
    passed: hLen <= channel.maxHeadlineChars,
    detail: `${hLen} chars`,
  });

  const cLen = proposal.cta.length;
  checks.push({
    id: "cta-length",
    label: `CTA ≤ ${channel.maxCtaChars} chars`,
    passed: cLen <= channel.maxCtaChars,
    detail: `${cLen} chars`,
  });

  const blob = `${proposal.headline} ${proposal.subhead ?? ""} ${proposal.visualBrief}`.toLowerCase();
  const bannedHits: string[] = [];
  for (const phrase of brand.bannedPhrases) {
    if (phrase && blob.includes(phrase.toLowerCase())) bannedHits.push(phrase);
  }
  checks.push({
    id: "banned-phrases",
    label: "No banned phrases in copy/visual brief",
    passed: bannedHits.length === 0,
    detail: bannedHits.length ? `Hits: ${bannedHits.join(", ")}` : undefined,
  });

  const { bg, fg } = pickPaletteColors(brand);
  if (bg && fg) {
    const ratio = contrastRatio(bg, fg);
    checks.push({
      id: "palette-contrast",
      label: `Representative text/background contrast ≥ ${channel.minContrastRatio}:1`,
      passed: ratio >= channel.minContrastRatio,
      detail: `Approx ${ratio.toFixed(2)}:1 (brand palette roles)`,
    });
  } else {
    checks.push({
      id: "palette-contrast",
      label: "Palette has background + text roles for contrast check",
      passed: false,
      detail: "Add palette entries with role background and text",
    });
  }

  const passed = checks.every((c) => c.passed);
  return verificationResultSchema.parse({ passed, checks });
}
