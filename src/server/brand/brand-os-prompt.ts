/** Brand OS fields assembled for prompts (mirrors BrandBible columns). */
export type BrandOperatingSystemContext = {
  vocabularyStyle: string;
  sentenceStyle: string;
  bannedPhrases: string[];
  preferredPhrases: string[];
  signaturePatterns: string[];
  primaryEmotion: string;
  emotionalToneDescription: string;
  emotionalBoundaries: string[];
  hookStyles: string[];
  narrativeStyles: string[];
  persuasionStyle: string;
  visualStyle: string;
  colorPhilosophy: string;
  compositionStyle: string;
  textureFocus: string;
  lightingStyle: string;
};

/**
 * Readable, directive Brand Operating System block for agent prompts (not a JSON dump).
 */
export function formatBrandOperatingSystemSection(
  os: BrandOperatingSystemContext,
): string {
  const lines: string[] = [
    "## BRAND OPERATING SYSTEM",
    "",
    "You must follow these rules strictly. Do not use banned phrases. Match vocabulary and sentence style.",
    "Stay within the emotional boundaries. Copy must reflect language rules; creative routes must reflect emotional tone and visual language.",
    "",
    "### Language rules",
    `- Vocabulary register: **${os.vocabularyStyle}** — choose words accordingly.`,
    `- Sentence construction: **${os.sentenceStyle}** — average rhythm and length should match.`,
  ];

  if (os.bannedPhrases.length) {
    lines.push(
      "",
      "**Banned phrases / constructions (never use, including close variants):**",
      ...os.bannedPhrases.map((p) => `- ${p}`),
    );
  } else {
    lines.push("", "**Banned phrases:** (none listed — still avoid generic marketing filler.)");
  }

  if (os.preferredPhrases.length) {
    lines.push(
      "",
      "**Preferred phrases / lexicon (use where natural, not every sentence):**",
      ...os.preferredPhrases.map((p) => `- ${p}`),
    );
  }

  if (os.signaturePatterns.length) {
    lines.push(
      "",
      "**Signature patterns (recurring devices, rhythms, or constructions):**",
      ...os.signaturePatterns.map((p) => `- ${p}`),
    );
  }

  lines.push(
    "",
    "### Emotional profile",
    `- Primary emotion: **${os.primaryEmotion}**`,
  );
  if (os.emotionalToneDescription.trim()) {
    lines.push(`- How it should feel: ${os.emotionalToneDescription.trim()}`);
  }
  if (os.emotionalBoundaries.length) {
    lines.push("", "**Never (emotional boundaries):**");
    for (const b of os.emotionalBoundaries) {
      lines.push(`- ${b}`);
    }
  }

  lines.push(
    "",
    "### Creative patterns",
    `- Persuasion mode: **${os.persuasionStyle}**`,
  );
  if (os.hookStyles.length) {
    lines.push("", "**Hook styles to favor:**");
    for (const h of os.hookStyles) lines.push(`- ${h}`);
  }
  if (os.narrativeStyles.length) {
    lines.push("", "**Narrative styles to favor:**");
    for (const n of os.narrativeStyles) lines.push(`- ${n}`);
  }

  lines.push("", "### Visual language (for art direction and tone-matching copy)");
  const vis = [
    ["Overall visual style", os.visualStyle],
    ["Color philosophy", os.colorPhilosophy],
    ["Composition", os.compositionStyle],
    ["Texture", os.textureFocus],
    ["Lighting", os.lightingStyle],
  ] as const;
  for (const [label, val] of vis) {
    if (val.trim()) lines.push(`- ${label}: ${val.trim()}`);
  }
  const anyVis = vis.some(([, v]) => v.trim());
  if (!anyVis) {
    lines.push(
      "- (No visual language fields filled — align with Brand Bible visual identity notes in context.)",
    );
  }

  return lines.join("\n");
}
