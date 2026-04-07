import type { BrandVisualProfileForPrompt } from "./merge-brand-visual-profile";

/**
 * Soft lock for prompts — reinforced as confirmations accumulate; exploration still allowed via brief/spec.
 */
export function formatBrandVisualDnaSection(
  profile: BrandVisualProfileForPrompt | null,
): string {
  if (!profile) return "";

  const hasAny =
    profile.lightingPatterns.length > 0 ||
    profile.compositionPatterns.length > 0 ||
    profile.colorSignatures.length > 0 ||
    profile.texturePatterns.length > 0 ||
    profile.framingRules.length > 0 ||
    profile.styleKeywords.length > 0 ||
    profile.negativeTraits.length > 0;

  if (!hasAny) return "";

  const strength =
    profile.confirmationCount < 2
      ? "early (few founder-preferred frames — bias lightly)"
      : profile.confirmationCount < 5
        ? "building (repeat preferred selections — strengthen consistency)"
        : "established (multiple confirmations — stronger consistency expected)";

  const lines: string[] = [
    "## BRAND VISUAL DNA — NON-NEGOTIABLE (prompt-level lock-in)",
    "",
    `**Profile strength:** ${strength} · numeric confidence ~${profile.confidenceScore.toFixed(2)} (rises slowly; not instant overfit).`,
    "**All generated visuals should reflect this identity** unless the brief or founder explicitly overrides.",
    "**Avoid deviation** from dominant patterns below unless instructed — still allow justified creative variation within Brand OS guardrails.",
    "",
  ];

  const bullet = (title: string, items: string[]) => {
    if (!items.length) return;
    lines.push(`**${title}**`);
    for (const x of items.slice(0, 10)) lines.push(`- ${x}`);
    lines.push("");
  };

  bullet("Dominant lighting patterns", profile.lightingPatterns);
  bullet("Composition patterns", profile.compositionPatterns);
  bullet("Color signatures", profile.colorSignatures);
  bullet("Texture rules", profile.texturePatterns);
  bullet("Framing preferences", profile.framingRules);
  bullet("Style keywords", profile.styleKeywords.slice(0, 8));
  bullet("Explicit avoid (learned + spec-aligned)", profile.negativeTraits.slice(0, 10));

  return lines.join("\n");
}
