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
  /** Creative DNA — voice / rhythm / devices (creative-director level) */
  voicePrinciples: string[];
  rhythmRules: string[];
  signatureDevices: string[];
  culturalCodes: string[];
  emotionalRange: string;
  metaphorStyle: string;
  visualPhilosophy: string;
  brandTension: string;
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

function imperativeBullet(line: string): string {
  const t = line.trim();
  if (!t) return "";
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return `- **${cap}**`;
}

/**
 * Directive Brand OS block for agent prompts (not JSON).
 * Leads with Creative DNA non-negotiables; keeps full taste engine reference below.
 */
export function formatBrandOperatingSystemSection(
  os: BrandOperatingSystemContext,
): string {
  const lines: string[] = [
    "# BRAND CREATIVE DNA — NON-NEGOTIABLE RULES",
    "",
    "**You MUST follow these rules.** Treat them as hard creative law — not flavor text, not suggestions.",
    "**Outputs that violate these rules are considered incorrect** and must be revised before they can ship.",
    "**Do not produce generic advertising language** (interchangeable category filler, neutral corporate tone, vibes-without-proof).",
    "**Apply voice principles and rhythm rules explicitly** in every headline, hook, rationale, and body line you write.",
    "",
    "## Voice principles",
  ];

  const voice =
    os.voicePrinciples.length > 0
      ? os.voicePrinciples
      : os.signaturePatterns.length > 0
        ? os.signaturePatterns
        : [];
  if (voice.length) {
    for (const v of voice) {
      const b = imperativeBullet(v);
      if (b) lines.push(b);
    }
  } else {
    lines.push(
      "- **Honor vocabulary register and sentence construction** from the reference section below until explicit voice principles are set in Brand Bible.",
    );
  }

  lines.push("", "## Rhythm rules");
  const rhythm =
    os.rhythmRules.length > 0
      ? os.rhythmRules
      : os.languageDnaSentenceRhythm.length > 0
        ? os.languageDnaSentenceRhythm
        : [];
  if (rhythm.length) {
    for (const r of rhythm) {
      const b = imperativeBullet(r);
      if (b) lines.push(b);
    }
  } else {
    lines.push(
      "- **Match sentenceStyle** (reference below); avoid flat, same-length sentences when the brand calls for punch or contrast.",
    );
  }

  lines.push("", "## Signature devices (must be used)");
  const devices =
    os.signatureDevices.length > 0 ? os.signatureDevices : os.hookStyles.slice(0, 12);
  if (devices.length) {
    for (const d of devices) {
      const b = imperativeBullet(d);
      if (b) lines.push(`${b} — weave this device into the work; do not only name it in metadata.`);
    }
  } else {
    lines.push(
      "- **Use hookStyles / narrativeStyles** from the reference section as concrete structural devices, not labels.",
    );
  }

  lines.push("", "## Banned phrases (prohibition)");
  if (os.bannedPhrases.length) {
    lines.push(
      "**Never use** these strings or close paraphrases (substring-level):",
      ...os.bannedPhrases.map((p) => `- ${p}`),
    );
  } else {
    lines.push("*(No global banned phrases listed — still avoid generic marketing filler.)*");
  }
  if (os.languageDnaPhrasesNever.length) {
    lines.push(
      "",
      "**Language DNA — MUST NEVER (same as banned):**",
      ...os.languageDnaPhrasesNever.map((p) => `- ${p}`),
    );
  }

  lines.push("", "## Cultural codes (must be reflected)");
  if (os.culturalCodes.length) {
    for (const c of os.culturalCodes) {
      const b = imperativeBullet(`Let the work feel rooted in: ${c}`);
      if (b) lines.push(b);
    }
  } else if (os.tasteShouldFeelLike.trim()) {
    lines.push(
      `- **Calibrate cultural feel** using “should feel like” in the reference section: ${os.tasteShouldFeelLike.trim()}`,
    );
  } else {
    lines.push(
      "- **Reflect the audience and category truth** from the brief; avoid placeless, cultureless default advertising.",
    );
  }

  lines.push("", "## Brand tension (must be visible)");
  const tensionLine =
    os.brandTension.trim() ||
    [os.tensionCoreContradiction, os.tensionEmotionalBalance]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" · ");
  if (tensionLine) {
    lines.push(
      `- **Hold this tension in the work** (do not resolve it into mush): ${tensionLine}`,
    );
  } else {
    lines.push(
      "- **Surface productive contradiction** from category differentiation + brief — safe, tension-free copy is a failure.",
    );
  }

  if (os.metaphorStyle.trim()) {
    lines.push("", "## Metaphor style");
    lines.push(`- **Use this metaphor register consistently:** ${os.metaphorStyle.trim()}`);
  }
  if (os.emotionalRange.trim()) {
    lines.push("", "## Emotional range");
    lines.push(
      `- **Stay within this spectrum** (not a single flat note): ${os.emotionalRange.trim()}`,
      `- Primary emotion (anchor): **${os.primaryEmotion}**`,
    );
    if (os.emotionalToneDescription.trim()) {
      lines.push(`- Nuance: ${os.emotionalToneDescription.trim()}`);
    }
  } else {
    lines.push("", "## Emotional profile (reference)");
    lines.push(`- Primary emotion: **${os.primaryEmotion}**`);
    if (os.emotionalToneDescription.trim()) {
      lines.push(`- How it should feel: ${os.emotionalToneDescription.trim()}`);
    }
  }

  if (os.emotionalBoundaries.length) {
    lines.push("", "**Emotional boundaries (never):**");
    for (const b of os.emotionalBoundaries) lines.push(`- ${b}`);
  }

  lines.push(
    "",
    "## Visual philosophy",
    os.visualPhilosophy.trim()
      ? `- **${os.visualPhilosophy.trim()}**`
      : "- Align visual language with Brand Bible + guardrails below; reject hyper-generic “premium/cinematic” without physics-grounded detail.",
  );

  lines.push(
    "",
    "---",
    "",
    "## Brand Operating System — full reference (taste engine)",
    "",
    "### Register & language DNA",
    `- Vocabulary register: **${os.vocabularyStyle}**`,
    `- Sentence construction: **${os.sentenceStyle}**`,
    `- Persuasion mode: **${os.persuasionStyle}**`,
  );

  if (os.languageDnaPhrasesUse.length) {
    lines.push(
      "",
      "**Phrases the brand WOULD use:**",
      ...os.languageDnaPhrasesUse.map((p) => `- ${p}`),
    );
  }
  if (os.preferredPhrases.length) {
    lines.push(
      "",
      "**Preferred phrases (legacy lexicon):**",
      ...os.preferredPhrases.map((p) => `- ${p}`),
    );
  }
  if (os.signaturePatterns.length) {
    lines.push(
      "",
      "**Signature patterns (reference):**",
      ...os.signaturePatterns.map((p) => `- ${p}`),
    );
  }
  if (os.languageDnaHeadlinePatterns.length) {
    lines.push("", "**Headline patterns:**");
    for (const h of os.languageDnaHeadlinePatterns) lines.push(`- ${h}`);
  }
  if (os.languageDnaCtaPatterns.length) {
    lines.push("", "**CTA patterns:**");
    for (const c of os.languageDnaCtaPatterns) lines.push(`- ${c}`);
  }

  lines.push("", "### Category positioning");
  if (os.categoryTypicalBehavior.trim()) {
    lines.push(`- Category typical behavior: ${os.categoryTypicalBehavior.trim()}`);
  }
  if (os.categoryClichesToAvoid.length) {
    lines.push("", "**Category clichés to avoid:**");
    for (const c of os.categoryClichesToAvoid) lines.push(`- ${c}`);
  }
  if (os.categoryDifferentiation.trim()) {
    lines.push(`- **Differentiation:** ${os.categoryDifferentiation.trim()}`);
  }

  if (os.tensionCoreContradiction.trim() && !os.brandTension.trim()) {
    lines.push(`- Core contradiction: ${os.tensionCoreContradiction.trim()}`);
  }
  if (os.tensionEmotionalBalance.trim() && !os.brandTension.trim()) {
    lines.push(`- Emotional balance: ${os.tensionEmotionalBalance.trim()}`);
  }

  lines.push("", "### Taste references");
  if (os.tasteCloserThan.length) {
    for (const t of os.tasteCloserThan) lines.push(`- Closer to: ${t}`);
  }
  if (os.tasteShouldFeelLike.trim()) {
    lines.push(`- Should feel like: ${os.tasteShouldFeelLike.trim()}`);
  }
  if (os.tasteMustNotFeelLike.trim()) {
    lines.push(`- Must NOT feel like: ${os.tasteMustNotFeelLike.trim()}`);
  }

  if (os.narrativeStyles.length) {
    lines.push("", "**Narrative styles:**");
    for (const n of os.narrativeStyles) lines.push(`- ${n}`);
  }

  lines.push("", "### Visual language & guardrails");
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
    lines.push("", "**NEVER looks like:**");
    for (const v of os.visualNeverLooksLike) lines.push(`- ${v}`);
  }
  const anyVis = vis.some(([, v]) => v.trim()) || os.visualNeverLooksLike.length > 0;
  if (!anyVis) {
    lines.push("- *(No visual fields — use Brand Bible visual identity notes in context.)*");
  }

  return lines.join("\n");
}
