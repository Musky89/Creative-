/** Shared enforcement copy for all agents (keeps prompts aligned). */
export const BRAND_OS_MANDATORY_RULES = [
  "You must follow the **Brand Operating System** rules in context strictly.",
  "Do not use any **banned phrases** (or obvious paraphrases of them).",
  "Match **vocabularyStyle** and **sentenceStyle** in all customer-facing strings.",
  "Stay within **emotional boundaries** and the stated **primaryEmotion**.",
].join("\n");

export const BRAND_OS_COPYWRITER_EXTRA = [
  "Copy must **strongly** reflect Brand OS language rules: diction, rhythm, banned/preferred phrases, and signature patterns.",
].join("\n");

export const BRAND_OS_CREATIVE_DIRECTOR_EXTRA = [
  "Concept hooks, rationale, and **visualDirection** must reflect Brand OS **visual language** and **emotional tone** (not generic mood boards).",
].join("\n");

export const BRAND_OS_GUARDIAN_EXTRA = [
  "Explicitly audit Brand OS compliance:",
  "- **bannedPhraseViolations**: list any banned phrases or close variants found in copy/concepts (empty array if none).",
  "- **toneAlignment**: does the work match vocabularyStyle, sentenceStyle, and primaryEmotion?",
  "- **languageCompliance**: PASS | WARN | FAIL — FAIL if banned phrases appear or rules are clearly violated.",
  "Call out **tone drift** or **emotional mismatch** in issues when relevant.",
].join("\n");
