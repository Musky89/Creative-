/** Shared enforcement copy for all agents (keeps prompts aligned). */
export const BRAND_OS_MANDATORY_RULES = [
  "You must follow **BRAND CREATIVE DNA — NON-NEGOTIABLE RULES** in context (voice principles, rhythm rules, signature devices, bans, cultural codes, brand tension).",
  "**Do not produce generic advertising language** — if a competitor could run it after a name swap, rewrite.",
  "**Apply voice principles and rhythm rules explicitly** in hooks, headlines, body, rationale, and visual language.",
  "Do not use **banned phrases**, **Language DNA — MUST NEVER**, or **category clichés** (substring-level: no obvious paraphrases).",
  "Weave in **phrases the brand WOULD use** and **headline/CTA patterns** where appropriate so the output is unmistakably this brand.",
  "Honor **category differentiation** and **brand tension** — generic category copy is a failure even if grammatically fine.",
  "Use **taste references** (closer to X than Y, should feel / must not feel) to calibrate quality; do not drop them.",
  "Match **vocabularyStyle** and **sentenceStyle**; obey **rhythmRules** and **signatureDevices** when listed.",
  "Stay within **emotional range / boundaries** and **primaryEmotion**; respect **visual philosophy** and **visual NEVER looks like** for any visual language.",
].join("\n");

export const BRAND_OS_COPYWRITER_EXTRA = [
  "**Copywriter contract:** Follow **rhythmRules** line-by-line (cadence, fragments, contrast).",
  "Use at least one **signatureDevices** pattern visibly in headline or body (contrast, repetition, juxtaposition — executed, not labeled).",
  "Avoid neutral, corporate sentence structures; prefer decisive, voiced lines that only this brand would sign.",
  "Headlines and CTAs should **trace** **headline patterns** and **CTA patterns** (structure and cadence, not plagiarism).",
  "Prove **Language DNA** in the actual strings: at least one justified use of a **WOULD use** phrase where it fits.",
].join("\n");

export const BRAND_OS_CREATIVE_DIRECTOR_EXTRA = [
  "Concept hooks and rationale must **signal category differentiation** and hold **brand tension** without resolving it into mush.",
  "Each route must **perform voice principles** and **rhythm rules** in the hook/rationale strings — not generic manifesto tone.",
  "**visualDirection** must obey **visual philosophy**, **visual NEVER looks like**, and align composition/texture/lighting with the taste engine.",
].join("\n");

export const BRAND_OS_ART_DIRECTOR_EXTRA = [
  "VISUAL_SPEC must **enforce visual philosophy** and taste-engine guardrails: never-looks-like, composition tendencies, material/texture direction, lighting tendencies — in concrete, shootable language.",
].join("\n");

export const BRAND_OS_STRATEGIST_EXTRA = [
  "Strategy lines (insight, proposition, pillars, angles) must **sound like this brand’s voice** per Brand Creative DNA — not category boilerplate.",
].join("\n");

export const BRAND_OS_GUARDIAN_EXTRA = [
  "Explicitly audit **Brand Creative DNA** compliance:",
  "- **toneDistinctiveness**: STRONG | MIXED | WEAK — would another brand in the category sign this unchanged?",
  "- **rhythmCompliance**: PASS | WARN | FAIL — flat cadence vs rhythmRules / same-length sentences?",
  "- **signatureDeviceUsage**: PRESENT | ABSENT — are signatureDevices actually performed in copy/concepts?",
  "- **culturalAlignment**: STRONG | MIXED | WEAK — culturalCodes / taste reflected vs generic placelessness?",
  "- **bannedPhraseViolations**: banned phrases, Language DNA NEVER lines, or category clichés found in evaluated copy/concepts (empty if none).",
  "- **toneAlignment**: tie to vocabularyStyle, Creative DNA voice, rhythm, tension, taste references, differentiation — not just \"on brand\" fluff.",
  "- **languageCompliance**: PASS | WARN | FAIL — FAIL if banned / NEVER / cliché hits appear, differentiation ignored, or output is interchangeable with competitors.",
  "Call out **generic language** by quoting weak lines. **FAIL** work that could belong to another brand.",
  "You must also fill the **harsh creative audit** fields and **comparisonRankings** — safe mediocrity should land as **creativeBarVerdict MARGINAL** or **FAILS_BAR** with **regenerationRecommended: true**.",
].join("\n");
