# Agentic Creative Operating System — build plan (isolated branch)

This document defines **how** to implement the strategic stack (executable brand graph, closed-loop learning, multi-agent critique, deterministic finals, regression CI) **without impacting** the existing app, Production Engine, Creative Testing Lab, or orchestrator until you explicitly choose to merge.

---

## 1. Isolation strategy (non-negotiables)

| Rule | How |
|------|-----|
| **Separate git branch** | All work lives on `experiment/agentic-creative-operating-system` (or name you prefer). `main` / `cursor/dev-server-deployment-34ee` stay untouched until a deliberate merge. |
| **Separate URL namespace** | New UI only under e.g. `/experimental/agentic-os` — never mount on existing `/production-engine` or `/creative-testing-lab` routes. |
| **Separate module root** | New code under `src/lib/agentic-creative-os/` and `src/app/experimental/agentic-os/`. No imports from new code into old surfaces unless behind a feature flag and reviewed. |
| **Optional server routes** | APIs under `/api/experimental/agentic-os/*` only. |
| **Feature flag** | `AGENTIC_CREATIVE_OS_ENABLED` (env). When `false`, routes return 404 or redirect; zero behavior change for rest of app. |
| **Data isolation** | Prefer new Prisma models with explicit prefix (`AgenticBrandGraph`, `AgenticCaseFile`, …) **or** separate SQLite/JSON store for v0 — document choice per phase. |
| **No edits to legacy files** | On this branch, **do not modify** files under `src/lib/production-engine/`, `src/components/creative-testing-lab/`, `src/server/orchestrator/`, existing lab APIs, etc. **Reading** them via import is OK (you are not changing their source). |

---

## 1.5 End-to-end testing without touching prior code — clone, import, or HTTP?

**Goal:** Full E2E on `experiment/agentic-creative-operating-system` while **zero diffs** to everything you already shipped.

### What we do **not** do

- **Do not duplicate** `production-engine` or `creative-testing-lab` into a second tree and evolve both. That becomes two versions to merge later and guarantees drift.

### What we **do** do (pick one integration style)

| Approach | Touch existing files? | E2E coverage | Notes |
|----------|------------------------|--------------|--------|
| **A. HTTP-only bridge** | **None** | Call live app: `fetch(APP_BASE_URL + '/api/creative-testing-lab/pipeline')` (and compose, fal-execute) from **`/api/experimental/agentic-os/*` only** | Strongest isolation: experimental code never imports production-engine. Requires dev server URL in env for self-calls. |
| **B. Read-only imports** | **None** (imports don’t edit files) | `import { runProductionEngineStub, … } from '@/lib/production-engine'` **only inside** `src/lib/agentic-creative-os/` | Simpler, same process, tree-shaken. Still “uses” current engine as a **library**; you are not cloning it. |
| **C. True fork (last resort)** | None | Reimplement minimal planner/router in `agentic-creative-os` | Maximum independence, **large** cost; only if you must run without any shared code. |

**Recommendation for your requirement (“don’t touch previous code”):** use **A** for anything that must prove “we didn’t even import it,” or **B** for speed — both satisfy **no file changes** in legacy paths. Default recommendation: **B** until you need hard process isolation, then add **A** behind an env `AGENTIC_OS_ENGINE_BRIDGE=http`.

### UI and APIs

- **All new UI** lives under `src/app/experimental/agentic-os/**` — not a clone of `creative-testing-lab-shell.tsx`; a **new** shell that can call the same **HTTP** endpoints as the lab if you want parity without copying components.
- **All new routes** under `src/app/api/experimental/agentic-os/**`.
- **Brand graph / case files / agents** live only in `src/lib/agentic-creative-os/**`.

### Git discipline

- Merge requests that touch `production-engine` or lab **do not belong** on this branch; if something is missing upstream, open a **separate** PR to the parent branch with a minimal, behavior-neutral change, then rebase this experiment — or use HTTP to the already-deployed API.

---

## 2. Target architecture (what “full” means)

### 2.1 Executable brand state

- **Brand graph** (versioned JSON/Zod): invariants, palette roles, typography allowlist, logo variants + safe zones, claims tiers, voice dimensions, hard negatives, channel-specific bounds (OOH vs social vs retail).
- **Campaign graph**: objectives, audience, message architecture, proof/evidence links, approved exemplar IDs.
- **Channel spec**: dimensions, safe margins, legal strip, max headline length, contrast floor.

Everything downstream reads these schemas — not freeform blobs — for anything marked `enforcement: strict`.

### 2.2 Closed-loop case files

Every run produces a **case file**: inputs (graph versions), agent transcripts, diffs, automated scores, human verdict, optional external outcome (placeholder). This is the compounding asset.

### 2.3 Multi-agent orchestration (internal to module)

- Planner / strategist (locks constraints)
- Generator (explores inside envelope)
- Brand critic + compliance critic (structured JSON verdicts)
- Composer handoff (optional: **HTTP** to existing compose/pipeline APIs, or **read-only import** of engine helpers — see §1.5; never edit legacy route files from this branch)

### 2.4 Verification layer

- Deterministic rules (palette ΔE, contrast, text length, forbidden phrases)
- Optional: vision pass on **composed** PNG (later phase)
- **Golden set** regression: fixed inputs → hash/layout snapshot in CI

### 2.5 Human calibration

- Panel scores on calibration deck → map automated metrics to “ship / revise” thresholds.

---

## 3. Repository layout (new only)

```
src/
  lib/
    agentic-creative-os/
      schema/           # Zod: BrandGraph, CampaignGraph, ChannelSpec, CaseFile
      graph/            # load, merge, diff, version bump
      agents/           # prompts + tool contracts (no import from orchestrator agents)
      verification/     # rules engine + golden fixtures
      adapters/         # optional: map BrandGraph → ProductionEngineInput (thin)
  app/
    experimental/
      agentic-os/
        page.tsx        # shell entry (flag-gated)
        layout.tsx
    api/
      experimental/
        agentic-os/
          graph/route.ts
          case/route.ts
          run/route.ts    # orchestrates agents + optional engine call
```

**Tests:** `src/lib/agentic-creative-os/__tests__/` or `tests/agentic-os/`.

**Fixtures:** `fixtures/agentic-os/golden/*.json`.

---

## 4. Phased delivery (full roadmap)

### Phase 0 — Branch + scaffold (week-equivalent: small)

- [ ] Create and push `experiment/agentic-creative-operating-system`.
- [ ] Add `AGENTIC_CREATIVE_OS_ENABLED`, gated layout/page stub.
- [ ] Add empty schemas + health route.

### Phase 1 — Brand graph v1 + UI editor

- [ ] Zod schemas + migration-safe JSON storage (DB table or file store).
- [ ] Read/write API + minimal UI: edit graph sections, version history, “validate”.
- [ ] Import/export JSON (portable off branch).

### Phase 2 — Campaign graph + link to brand

- [ ] Campaign entity references `brandGraphId@version`.
- [ ] UI: create campaign, attach channel specs.

### Phase 3 — Case file + single-agent “generate proposal”

- [ ] One LLM step: proposal JSON (headline options, visual brief) **constrained** by graph.
- [ ] Persist full case file (no multi-agent yet).

### Phase 4 — Multi-agent loop (generate → critique → revise)

- [ ] Critic agent with fixed output schema (violations, severity, regen hints).
- [ ] Bounded revision loop (max N), all logged in case file.

### Phase 5 — Verification engine v1

- [ ] Rule pack: palette, contrast (if hex + text), length, banned substrings from graph.
- [ ] Pass/fail on proposal + on optional composed output.

### Phase 6 — Adapter to Production Engine (optional, still isolated)

- [ ] `adapters/to-production-engine-input.ts`: BrandGraph + Campaign → `ProductionEngineInput`.
- [ ] Experimental “Run in engine” button calls **existing** `/api/creative-testing-lab/pipeline` or `/api/production-engine/compose-preview` via server-side `fetch` with service URL — **no** edits to those route handlers if possible.

### Phase 7 — Golden regression + CI

- [ ] 10–20 golden cases; `pnpm test:agentic-os` fails on snapshot drift.
- [ ] Document how to update snapshots (human review).

### Phase 8 — Calibration + metrics

- [ ] UI for human score on case; store; simple correlation report (manual first).

### Phase 9 — Merge decision

- [ ] Security review (new routes, LLM spend, data retention).
- [ ] Choose: merge to main behind flag, or keep as long-lived “innovation” branch.

---

## 5. Dependencies and risks

- **LLM keys:** same as rest of app; isolate budget/logging per `caseId`.
- **FAL:** optional phase; keep behind same pattern as lab (`FAL_KEY` only in experimental run path).
- **Drift:** pin model IDs in case file when you need reproducibility.
- **Scope creep:** forbid editing legacy modules; if an adapter needs a one-line export in production-engine, do it in a **separate** PR from `main` with no behavioral change.

---

## 6. How you test on the branch

1. `git checkout experiment/agentic-creative-operating-system`
2. Set `AGENTIC_CREATIVE_OS_ENABLED=true`
3. Open `/experimental/agentic-os`
4. Existing routes behave as on parent branch when flag is off (default in production).

---

## 7. Success criteria (definition of “done” for v1.0 of the experiment)

- Brand + campaign graphs are **versioned** and **validated**.
- Every run produces an **auditable case file**.
- At least **two** automated checks block “ship” on violation.
- Multi-agent **critique + revise** loop works with a **hard cap** and full logging.
- **Zero** default behavior change when flag is off.
- Golden tests protect graph → proposal invariants.

---

## 8. Naming

- **Branch:** `experiment/agentic-creative-operating-system`
- **Module:** `agentic-creative-os`
- **Env flag:** `AGENTIC_CREATIVE_OS_ENABLED`

Adjust names in one place (this doc + env example) if you prefer `innovation/` or `labs/` prefixes.
