import type { BrandBible } from "@/generated/prisma/client";

export type BrandBibleReadiness = {
  ok: boolean;
  missing: string[];
};

function pillarsPresent(json: unknown): boolean {
  if (!Array.isArray(json)) return false;
  return json.some((x) => String(x).trim().length > 0);
}

/**
 * Minimum bar before LLM agent stages run: core narrative + at least one messaging pillar.
 */
export function assessBrandBibleReadiness(
  bible: BrandBible | null | undefined,
): BrandBibleReadiness {
  if (!bible) {
    return {
      ok: false,
      missing: [
        "Brand Bible (complete the Brand Bible tab for this client)",
      ],
    };
  }
  const missing: string[] = [];
  if (!bible.positioning?.trim()) missing.push("Positioning");
  if (!bible.targetAudience?.trim()) missing.push("Target audience");
  if (!bible.toneOfVoice?.trim()) missing.push("Tone of voice");
  if (!pillarsPresent(bible.messagingPillars)) {
    missing.push("Messaging pillars (at least one non-empty line)");
  }
  return { ok: missing.length === 0, missing };
}

export function formatReadinessMessage(missing: string[]): string {
  return `Brand Bible incomplete. Missing: ${missing.join("; ")}.`;
}
