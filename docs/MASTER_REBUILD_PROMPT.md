# Master rebuild prompt — end-to-end creative production platform

**Purpose:** Use this document as the single source of truth to build, from scratch on any stack, a **strategy-through-production** creative system that follows the methodology validated in this project. Paste the **§ Prompt for the builder** block into another AI or give it to an engineering team.

---

## § Prompt for the builder

You are designing and implementing a **modular creative production platform** with strict separation between **upstream intelligence** (strategy, brand, campaign, copy) and **downstream production** (visual execution, deterministic layout, handoff). Follow these principles:

### A. Architectural principles

1. **Upstream produces structured truth; downstream consumes it.** Do not let the image model invent brand law. Logo, approved typography, color roles, legal copy, and layout hierarchy are **platform-owned** unless explicitly marked exploratory.

2. **One unified visual backend for raster generation** (e.g. Fal.ai): text-to-image, image-to-image edit, LoRA/adapter generation and edit. The **router** chooses the path from: mode, target type, quality tier, presence of base image, style/model refs, and batch needs.

3. **Deterministic composition** for finals: the platform owns canvas size, safe zones, text rendering, logo placement, and layer manifests. Generated pixels are **assets inside** that system—not the other way around.

4. **Handoff is first-class:** every composed output has a **layer manifest** (PSD/Figma-ready semantics), flattened masters, source visual references, copy metadata, and mode-aware export profiles.

5. **Feature isolation:** production engine, testing lab, and optional “agentic brand OS” should be **portable modules** (clear boundaries, minimal coupling to auth/DB/orchestrator in v1).

6. **Verification in layers:** deterministic checks (length, banned phrases, contrast heuristics, channel geometry) plus optional LLM critique loops with bounded revisions—never a single opaque “generate” step for ship assets.

---

### B. End-to-end lifecycle (concept → ship)

| Phase | Owner | Outputs (structured) |
| ----- | ----- | --------------------- |
| **1. Strategy** | Strategist / LLM-assisted | Business objective, audience insights, SMP or single-minded proposition, message architecture, channel roles, success metrics. |
| **2. Brand & CI** | Brand / design ops | Brand graph or equivalent: palette with **roles**, typography roles (headline/body/CTA/display) with **file or catalog resolution**, logo variants and usage rules, do/don’t, tone of voice, competitor/banned language, regulatory notes. |
| **3. Campaign core** | Creative lead | Campaign name, big idea, emotional tension, narrative arc, guardrails. |
| **4. Creative selection** | Creative | Chosen concept, headline, CTA, supporting copy, visual direction, reference summaries (what to match vs what to avoid). |
| **5. Production mode** | Producer | Mode: OOH, SOCIAL, PACKAGING, RETAIL_POS, IDENTITY, ECOMMERCE_FASHION, EXPORT_PRESENTATION (or your subset). |
| **6. Production plan** | Engine (deterministic planner + optional AI extension) | Mode-aware plan: composition intent, typography intent, logo intent, realism bias, export targets, **mode-specific constraints** (e.g. OOH distance readability; SOCIAL batch families; packaging FOP hierarchy without AI layout). |
| **7. Generation targets** | Engine | Typed targets (hero photo, background plate, texture, pack mood, model shot, etc.) each with subject/background/lighting intents, negative rules, batch size, evaluation focus. |
| **8. Visual routing & execution** | Engine + visual API | Per target: chosen endpoint kind (generate / edit / LoRA / specialty), prompt package, references, executed URLs or placeholders, trace IDs. |
| **9. Composition** | Engine + image toolkit | **Composition plan:** layout archetype, rects for hero/headline/CTA/logo/safe margins, finishing layers, export format. **Composer** rasterizes text (with embedded fonts where supported), composites assets, outputs PNG/WebP + **layer manifest**. |
| **10. Review** | Engine + human | Mode-specific review checklist (e.g. OOH: readability, hero dominance, text economy; SOCIAL: family coherence, non-repetition). |
| **11. Handoff** | Engine | Bundle: flattened master(s), manifest JSON, production + composition plans, copy/brand metadata, source visuals list, README, optional upscaled masters by tier. |
| **12. Approval** | Human / workflow | Explicit states: draft → in_review → approved; optional notes and approver id; not a substitute for legal sign-off on claims. |

---

### C. Normalized production input (contract for the engine)

Implement a single **ProductionEngineInput** (validate with Zod or equivalent):

- **mode** (enum of production modes).
- **briefSummary**, **campaignCore** (optional structured: singleLineIdea, emotionalTension, visualNarrative).
- **selectedConcept** (conceptId optional, conceptName, hook, rationale, visualDirection).
- **selectedHeadline**, **selectedCta**, **supportingCopy** optional.
- **visualDirection**, **visualSpecNotes** optional.
- **referenceSummaries** (string array).
- **brandRulesSummary** (required), **brandOperatingSystemSummary** optional (long-form brand OS slice).
- **brandAssets** optional: **logoUrl**, **logoDescription**, **fonts[]** (family, weights, role, source: default | public_catalog e.g. Google Fonts | client_upload with fontFileUrl / embedded family), **colors[]** (hex, name, role), **otherAssetNotes**.
- **visualStyleRef**, **modelRef** (LoRA / style endpoints) optional.
- **visualQualityTier**: draft | standard | high | premium.
- **layoutArchetype** optional override.
- **heroImageUrl**, **secondaryImageUrl**, **tertiaryImageUrl** optional (FAL outputs or CDN).
- **SOCIAL:** socialBatchPreset (1|7|15|30), socialContentFamilies subset optional, socialVariantIndex, **socialOutputTarget** (showcase master vs platform-specific canvas), **socialRepurposePlatformIds** (when master is 4:5, derive additional aspect exports via cover-crop resize).
- **PACKAGING:** packagingVariant, optional **packagingDieline** (normalized 0–1 panels: legal, barcode, variant_band, etc. + bleedPx) to tighten safe margins.
- **RETAIL_POS:** retailPosVariant.
- **ECOMMERCE_FASHION:** fashionBatchPreset, families, fashionVariantIndex.
- **EXPORT_PRESENTATION:** exportSlideIndex.
- **IDENTITY:** identityRouteHighlight optional.
- **outputVerificationRules:** bannedSubstrings, optional flags for stricter checks.
- **handoffApproval:** draft | in_review | approved + optional approvedAt, approvedBy, notes.

---

### D. Core engine modules (implement in this order)

1. **Mode registry** — Per mode: objective, success criteria, composition priorities, text tolerance, image expectations, layout expectations, review focus, export expectations.

2. **Production plan schema** — Shared fields + discriminated mode-specific blocks (OOH distance/focal/negative space; SOCIAL series/variation; PACKAGING shelf/claims/variant grid; RETAIL promo hierarchy; IDENTITY route boards; FASHION model/garment/pose; PRESENTATION story arc).

3. **Deterministic planner** — `buildProductionPlan(input)`; optional hook for LLM planner behind same output schema.

4. **Generation target types & derivation** — `deriveGenerationTargets(mode, plan, tier)` producing typed targets with batch sizes.

5. **FAL (or equivalent) router** — Returns path id, kind, reason; supports generate, edit, LoRA gen/edit, composition-only skips.

6. **Execution contracts** — Request: target, path, prompts, references, style refs, batch, metadata. Response: asset URLs, path used, target id, evaluation placeholders, errors.

7. **Composition plan schema** — Canvas WxH, archetype, placements, safe margins, visual dominance, text hierarchy, finishing layers, export format, mode-specific rects (packagingLayout, retailLayout, identityLayout, fashionLayout, exportLayout).

8. **Layout archetypes** — e.g. HERO_LEFT_COPY_RIGHT, FULL_BLEED_HERO_CORNER_COPY, SOCIAL_SPLIT, PACK_FRONT_CENTERED_STACK, IDENTITY_BOARD_GRID, PRESENTATION_BOARD_LAYOUT.

9. **Deterministic composer** — Sharp or equivalent: place images, render SVG text with **@font-face** when fonts resolved, logo, scrims, output PNG + logical layers for manifest.

10. **Review** — `evaluateProductionOutput(input, productionPlan)` → verdict PASS/WARN/FAIL + mode checklist.

11. **Handoff package** — Layer manifest document, flattened paths, copy/brand metadata, production notes, mode-aware export profile (including upscale rules for high/premium tiers).

12. **Post-compose verification** — Banned substrings in copy blob, headline/CTA vs placement heuristics, optional social batch variety checks.

13. **Channel specs** — Named platform canvases (IG 1:1, 4:5, story 9:16, LinkedIn, etc.); compose at chosen size; optional batch repurpose from a **master** aspect via cover resize (document limitation: not full reflow).

---

### E. Optional parallel surfaces (same methodology, clean boundaries)

**Creative Testing Lab (client-heavy):** Map lab forms → ProductionEngineInput; persist runs (inputs, routing summary, outputs, QA scores, verdict, compare A/B, export JSON); live FAL with visible path and errors; presets and brand profiles in local storage; controls for execution override, batch targets, composer typography, platform/repurpose, dieline JSON, handoff status.

**Standalone Agentic Creative OS (greenfield):** Separate schemas: BrandGraph, CampaignGraph, ChannelSpec, CreativeProposal, CriticVerdict, VerificationResult, CaseFile. In-memory or DB store. Pipeline: generate proposal → deterministic verification → critic → bounded revisions → append case file. **No imports** from production-engine in v1 to guarantee isolation.

---

### F. Brand lock scorecard (operational definition of “10/10 readiness”)

Score 10 dimensions 0 / 0.5 / 1.0 each (sum /10 or ×10 for /100):

1. Structured brand rules + OS (testable, not fluff).  
2. Canonical logo + deterministic placement.  
3. Color tokens with roles.  
4. Typography locked for deterministic type.  
5. Intentional visual route (tier, style ref, LoRA, edit vs gen).  
6. Reference strategy matches control vs inspiration.  
7. Copy gates (banned strings + compose verification).  
8. Mode and channel geometry match media plan.  
9. Packaging/POS structural discipline when applicable.  
10. Handoff manifest + explicit approval state.

**Below 8.5/10:** treat as internal or exploratory, not client-final without fixes.

---

### G. Environment & dependencies (reference)

- **FAL_KEY** or equivalent for live generation.  
- **Image processing** (e.g. Sharp) for compose.  
- **Optional OPENAI_API_KEY** for agentic proposal/critic paths.  
- **Feature flags** for isolated routes (e.g. standalone agentic OS).

---

### H. Explicit non-goals for v1

- Do not subsume legal final approval inside the engine.  
- Do not claim PSD/Figma binary export; provide **manifest + assets** for adapter tools.  
- Video generation out of scope unless separately scoped.  
- Full automatic font extrapolation from a few glyphs is aspirational; support **catalog + client file upload** first.

---

### I. Success criteria for the rebuild

- [ ] One normalized input validates end-to-end for **at least OOH + SOCIAL + PACKAGING** with distinct plans, routes, composition, and review.  
- [ ] Composer output includes a **structured layer manifest** and **handoff package** description.  
- [ ] Router is explainable (reason string per target).  
- [ ] Testing surface can run without the main product orchestrator.  
- [ ] Brand lock scorecard can be filled from actual fields and API responses, not from hope.

---

**End of master rebuild prompt.**

---

## How to use this file

- **Full spec:** Share this entire markdown file.  
- **Minimal paste:** Copy **§ Prompt for the builder** through **§ I. Success criteria** into another chat.  
- **Operational checklist:** Merge **§ F** with your legal/compliance process outside the engine.
