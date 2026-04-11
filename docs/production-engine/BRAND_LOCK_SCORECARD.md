# Brand lock scorecard (10 checks)

Use this to measure how close a run is to **ship-grade** brand alignment—not “vibes,” but **encoded rules + enforced routes + verified outputs**.

**How to score each check**

| Score | Meaning |
| ----- | ------- |
| **0** | Missing or not used for this deliverable |
| **0.5** | Partial (notes only, wrong asset class, or not wired into compose/FAL) |
| **1.0** | Satisfied for the intended mode (rules are explicit and exercised in pipeline/compose) |

**Overall**

- **8.5–10.0** — Strong candidate for client-facing finals with minimal rework (still subject to legal/medical/regulated review where applicable).
- **7.0–8.4** — Good for internal rounds; expect targeted fixes (type scale, crop, copy).
- **5.0–6.9** — Exploratory; not a reliability claim for CI.
- **&lt; 5.0** — Concept/mood only.

Multiply by **10** if you want a **0–100** index (sum of ten checks).

---

## 1) Brand rules & OS are structured, not generic fluff

**What “good” looks like:** `brandRulesSummary` and (when you have it) `brandOperatingSystemSummary` contain **testable** rules: do/don’t, hierarchy, voice guardrails, claim boundaries, competitor language bans, category-specific constraints.

**Where in the engine:** `ProductionEngineInput.brandRulesSummary`, `brandOperatingSystemSummary`  
**Lab:** Brand context fields → map into those strings (`map-to-production-input.ts`).

**Fail mode:** One-line placeholders (“be on brand”) → **0**.

---

## 2) Logo is canonical, fetchable, and composed deterministically

**What “good” looks like:** Approved **vector or high-res raster** logo URL (or data URL in lab), correct variant for background (light/dark), and composer places it via the **composition plan** (not generated inside the hero).

**Where:** `brandAssets.logoUrl`, `logoDescription`  
**Server:** `runDeterministicComposeSharp` + `buildCompositionPlanDocument`

**Fail mode:** No logo, or logo left to the image model → **0–0.5**.

---

## 3) Color system is tokenized (roles + hex), not a free-text palette only

**What “good” looks like:** `brandAssets.colors[]` with **`role`** (or consistent naming) so downstream can enforce primary/secondary/background/accent usage in composer notes and future stricter checks.

**Where:** `brandAssets.colors` (`name`, `hex`, `role`)

**Fail mode:** Palette only in prose (`colorPalette` text) with **no** `colors[]` entries → **0.5** max.

---

## 4) Typography is locked for deterministic type (headline / CTA / body roles)

**What “good” looks like:** For modes where the platform sets type, fonts are resolved to **known files or catalog fonts** and applied in SVG/text layers—not whatever default the renderer picks.

**Where:** `brandAssets.fonts[]` (family, weights, notes); composer integration in `deterministic-composer` when extended typography is enabled in your branch.

**Fail mode:** `fontNotes` only, no resolvable font → **0.5** max for type-critical deliverables.

---

## 5) Visual execution route is intentional (not “whatever the router guessed”)

**What “good” looks like:** For production tests you explicitly choose **generate vs edit vs LoRA** (lab: execution path), set **`modelRef` / `visualStyleRef`** when using adapters, and align **`visualQualityTier`** with the fidelity you need.

**Where:** `visualQualityTier`, `visualStyleRef`, `modelRef`; lab `executionPath` → `VisualExecutionBundleOptions` / FAL execute overrides.

**Fail mode:** Always “router default” while claiming brand lock → **0.5** max.

---

## 6) Reference strategy matches the task (control vs inspiration)

**What “good” looks like:** `referenceSummaries` + actual reference images explain *what* is being matched (pack texture, lighting, casting). For strict brand fidelity, **strong reference / edit paths** are used instead of pure text-to-image drift.

**Where:** `referenceSummaries`, `heroImageUrl` / `secondaryImageUrl` / `tertiaryImageUrl`, lab `strongRefs`, `preferEdit`.

**Fail mode:** Random stock that sort-of matches category → **0.5**.

---

## 7) Copy passes automated gates you care about

**What “good” looks like:** Headline/CTA/supporting copy checked against **banned substrings** (competitors, unapproved claims) and basic **length/slot** heuristics after layout exists.

**Where:** `outputVerificationRules.bannedSubstrings`; compose API returns `composeVerification` (`verifyComposedOutputContext`).

**Fail mode:** No banned list for a brand with strict legal → **0.5** max.

---

## 8) Mode + channel geometry match the media plan

**What “good” looks like:** Correct **`mode`** (OOH vs SOCIAL vs PACKAGING, etc.), and for social, **`socialOutputTarget`** (and optional **`socialRepurposePlatformIds`** from showcase master) match the placements you will buy.

**Where:** `mode`, `socialOutputTarget`, `socialRepurposePlatformIds`, `packagingVariant`, `retailPosVariant`, `layoutArchetype`

**Fail mode:** Right creative, wrong aspect or crop strategy for the placement → **0.5**.

---

## 9) Packaging / POS structural discipline (when applicable)

**What “good” looks like:** For **PACKAGING**, optional **`packagingDieline`** tightens safe zones; variant band / legal strip intent is reflected in the **composition plan**. For **RETAIL_POS**, variant emphasis matches promo type.

**Where:** `packagingDieline`, `packagingVariant`, `retailPosVariant`, `composition-plan` mode branches.

**Fail mode:** Treating pack/POS like a generic ad still → **0** for those modes.

---

## 10) Handoff is traceable and approval-state is explicit

**What “good” looks like:** Layer manifest + handoff package metadata are present; **`handoffApproval.status`** moves **draft → in_review → approved** with optional notes; exports are reproducible from stored inputs + plans.

**Where:** `handoffApproval`; `buildHandoffPackage` / compose-preview `handoffPackage`

**Fail mode:** “Final” PNG with no manifest and no approval record → **0.5** max for agency handoff.

---

## Quick worksheet (copy as a table)

| # | Check | Score (0 / 0.5 / 1) | Evidence (link, preset id, run id) |
|---|--------|----------------------|-------------------------------------|
| 1 | Rules / OS | | |
| 2 | Logo | | |
| 3 | Color tokens | | |
| 4 | Typography lock | | |
| 5 | Visual route | | |
| 6 | References | | |
| 7 | Copy gates | | |
| 8 | Mode / channel | | |
| 9 | Pack / POS structure | | |
| 10 | Handoff / approval | | |

**Sum:** ___ / 10 → **___ / 100**

---

## What this scorecard does *not* replace

- Legal / regulatory sign-off on claims, disclosures, and comparisons  
- Accessibility (contrast, type size on real devices) beyond current heuristics  
- Pixel-perfect match to a PDF CI manual unless those rules are encoded and tested  
- Brand-new illustration of custom logotypes (still human or specialized tooling)

Use the scorecard as a **pre-flight before you call a run “10/10 ready.”**
