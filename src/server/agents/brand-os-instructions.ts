/** Shared enforcement copy for all agents (keeps prompts aligned). */
export const BRAND_OS_MANDATORY_RULES = [
  "You must follow the **BRAND OPERATING SYSTEM (TASTE ENGINE)** in context as **hard constraints**, not flavor text.",
  "Do not use **banned phrases**, **Language DNA — MUST NEVER**, or **category clichés** (substring-level: no obvious paraphrases).",
  "Weave in **phrases the brand WOULD use** and **headline/CTA patterns** where appropriate so the output is unmistakably this brand.",
  "Honor **category differentiation** and **brand tension** — generic category copy is a failure even if grammatically fine.",
  "Use **taste references** (closer to X than Y, should feel / must not feel) to calibrate quality; do not drop them.",
  "Match **vocabularyStyle** and **sentenceStyle**; follow **sentence rhythm** notes when listed.",
  "Stay within **emotional boundaries** and **primaryEmotion**; respect **visual NEVER looks like** for any visual language.",
].join("\n");

export const BRAND_OS_COPYWRITER_EXTRA = [
  "Headlines and CTAs should **trace** the listed **headline patterns** and **CTA patterns** (structure and cadence, not plagiarism).",
  "Prove **Language DNA** in the actual strings: at least one justified use of a **WOULD use** phrase where it fits.",
].join("\n");

export const BRAND_OS_CREATIVE_DIRECTOR_EXTRA = [
  "Concept hooks and rationale must **signal category differentiation** and hold the **core contradiction** without resolving it into mush.",
  "**visualDirection** must obey **visual NEVER looks like** and align composition/texture/lighting tendencies with the taste engine.",
].join("\n");

export const BRAND_OS_ART_DIRECTOR_EXTRA = [
  "VISUAL_SPEC fields must **enforce** taste-engine visual guardrails: never-looks-like, composition tendencies, material/texture direction, lighting tendencies — in concrete, shootable language.",
].join("\n");

export const BRAND_OS_GUARDIAN_EXTRA = [
  "Explicitly audit Brand OS / taste engine compliance:",
  "- **bannedPhraseViolations**: banned phrases, Language DNA NEVER lines, or category clichés found in evaluated copy/concepts (empty if none).",
  "- **toneAlignment**: vocabularyStyle, sentenceStyle, rhythm, tension, taste references, differentiation — not just \"on brand\" fluff.",
  "- **languageCompliance**: PASS | WARN | FAIL — FAIL if banned / NEVER / cliché hits appear or differentiation is ignored.",
  "Flag **category-generic** work and **visual guardrail** violations in issues when relevant.",
  "You must also fill the **harsh creative audit** fields and **comparisonRankings** — safe/acceptable mediocrity should land as **creativeBarVerdict MARGINAL** or **FAILS_BAR** with **regenerationRecommended: true**.",
].join("\n");
