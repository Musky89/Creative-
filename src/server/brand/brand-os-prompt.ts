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
  /** Taste engine — language DNA */
  languageDnaPhrasesUse: string[];
  languageDnaPhrasesNever: string[];
  languageDnaSentenceRhythm: string[];
  languageDnaHeadlinePatterns: string[];
  languageDnaCtaPatterns: string[];
  /** Taste engine — category */
  categoryTypicalBehavior: string;
  categoryClichesToAvoid: string[];
  categoryDifferentiation: string;
  /** Taste engine — tension */
  tensionCoreContradiction: string;
  tensionEmotionalBalance: string;
  /** Taste engine — references */
  tasteCloserThan: string[];
  tasteShouldFeelLike: string;
  tasteMustNotFeelLike: string;
  /** Taste engine — visual guardrails */
  visualNeverLooksLike: string[];
  visualCompositionTendencies: string;
  visualMaterialTextureDirection: string;
  visualLightingTendencies: string;
};

/**
 * Readable, directive Brand Operating System block for agent prompts (not a JSON dump).
 */
export function formatBrandOperatingSystemSection(
  os: BrandOperatingSystemContext,
): string {
  const lines: string[] = [
    "## BRAND OPERATING SYSTEM (TASTE ENGINE)",
    "",
    "This block is **binding creative law**, not background. Every headline, hook, rationale, visualDirection, VISUAL_SPEC field, and review judgment must **actively** apply it.",
    "If a draft could apply to a competitor after a find-and-replace on the brand name, it **fails** — use category differentiation, tension, and taste references to stay specific.",
    "",
    "### Language DNA",
    `- Vocabulary register: **${os.vocabularyStyle}** — choose words accordingly.`,
    `- Sentence construction: **${os.sentenceStyle}** — match average rhythm and length.`,
  ];

  if (os.languageDnaSentenceRhythm.length) {
    lines.push("", "**Sentence rhythm (how lines should move):**");
    for (const r of os.languageDnaSentenceRhythm) lines.push(`- ${r}`);
  }

  if (os.bannedPhrases.length) {
    lines.push(
      "",
      "**Global banned phrases (never use, including close variants):**",
      ...os.bannedPhrases.map((p) => `- ${p}`),
    );
  } else {
    lines.push("", "**Global banned phrases:** (none — still avoid generic marketing filler.)");
  }

  if (os.languageDnaPhrasesNever.length) {
    lines.push(
      "",
      "**Language DNA — MUST NEVER use (treat like banned; includes category-slop wording):**",
      ...os.languageDnaPhrasesNever.map((p) => `- ${p}`),
    );
  }

  if (os.languageDnaPhrasesUse.length) {
    lines.push(
      "",
      "**Phrases the brand WOULD use (weave in naturally; proves voice):**",
      ...os.languageDnaPhrasesUse.map((p) => `- ${p}`),
    );
  }

  if (os.preferredPhrases.length) {
    lines.push(
      "",
      "**Preferred phrases / lexicon (legacy field — same intent as “would use”):**",
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

  if (os.languageDnaHeadlinePatterns.length) {
    lines.push("", "**Headline patterns to favor (structure, not copy verbatim):**");
    for (const h of os.languageDnaHeadlinePatterns) lines.push(`- ${h}`);
  }
  if (os.languageDnaCtaPatterns.length) {
    lines.push("", "**CTA patterns to favor:**");
    for (const c of os.languageDnaCtaPatterns) lines.push(`- ${c}`);
  }

  lines.push("", "### Category positioning");
  if (os.categoryTypicalBehavior.trim()) {
    lines.push(`- What the category typically does: ${os.categoryTypicalBehavior.trim()}`);
  } else {
    lines.push("- What the category typically does: *(not specified — infer carefully from industry.)*");
  }
  if (os.categoryClichesToAvoid.length) {
    lines.push("", "**Category clichés to avoid (do not echo in copy or concepts):**");
    for (const c of os.categoryClichesToAvoid) lines.push(`- ${c}`);
  }
  if (os.categoryDifferentiation.trim()) {
    lines.push(
      "",
      `**How this brand differentiates:** ${os.categoryDifferentiation.trim()}`,
    );
  }

  lines.push("", "### Brand tension");
  if (os.tensionCoreContradiction.trim()) {
    lines.push(`- Core contradiction to hold: ${os.tensionCoreContradiction.trim()}`);
  }
  if (os.tensionEmotionalBalance.trim()) {
    lines.push(`- Emotional balance: ${os.tensionEmotionalBalance.trim()}`);
  }

  lines.push("", "### Taste references");
  if (os.tasteCloserThan.length) {
    lines.push("**Closer to X than Y (calibrate taste, do not name-drop as endorsement):**");
    for (const t of os.tasteCloserThan) lines.push(`- ${t}`);
  }
  if (os.tasteShouldFeelLike.trim()) {
    lines.push(`- Should feel like: ${os.tasteShouldFeelLike.trim()}`);
  }
  if (os.tasteMustNotFeelLike.trim()) {
    lines.push(`- Must NOT feel like: ${os.tasteMustNotFeelLike.trim()}`);
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

  lines.push("", "### Visual language & guardrails (art direction, VISUAL_SPEC, image prompts)");
  const vis = [
    ["Overall visual style", os.visualStyle],
    ["Color philosophy", os.colorPhilosophy],
    ["Composition (Brand Bible)", os.compositionStyle],
    ["Composition tendencies (taste)", os.visualCompositionTendencies],
    ["Texture (Brand Bible)", os.textureFocus],
    ["Material / texture direction (taste)", os.visualMaterialTextureDirection],
    ["Lighting (Brand Bible)", os.lightingStyle],
    ["Lighting tendencies (taste)", os.visualLightingTendencies],
  ] as const;
  for (const [label, val] of vis) {
    if (val.trim()) lines.push(`- ${label}: ${val.trim()}`);
  }
  if (os.visualNeverLooksLike.length) {
    lines.push("", "**What the brand NEVER looks like (hard avoid in visualDirection / VISUAL_SPEC / prompts):**");
    for (const v of os.visualNeverLooksLike) lines.push(`- ${v}`);
  }
  const anyVis = vis.some(([, v]) => v.trim()) || os.visualNeverLooksLike.length > 0;
  if (!anyVis) {
    lines.push(
      "- (No visual fields filled — align with Brand Bible visual identity notes in context.)",
    );
  }

  return lines.join("\n");
}
