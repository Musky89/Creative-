# Conversation handoff archive

**Purpose:** Single markdown export of a multi-turn Cursor agent session (AgenticForce / Creative- repo). Safe to delete from the repo after you have pulled the branch locally.

**Branch:** `temp/conversation-handoff-archive`  
**File:** `docs/CONVERSATION_HANDOFF_AGENTS.md`

---

## 1. Dev server on the agent platform (vs your laptop)

**Issue:** Browser showed `ERR_CONNECTION_REFUSED` for `http://localhost:3000` inside the Cursor **Desktop** tab (in-browser VM).

**Cause:** `localhost` in that browser is the **agent VM**, not the user’s physical machine. Nothing was listening on port 3000, and Postgres was not running for `DATABASE_URL` pointing at `localhost:5432`.

**Resolution (that session):**

- Installed and started PostgreSQL on the VM, aligned credentials/db with `.env` (`postgres` / `postgres`, database `agenticforce`).
- Ran `npm run db:migrate:deploy`.
- Started Next with `npm run dev -- --hostname 0.0.0.0 --port 3000` (background).

**User clarification:** They were not running the app on their own PC; they needed the app in the **agent development environment** reachable from the embedded Desktop browser.

---

## 2. Docker on port 3000 and “seeded data gone”

**Context:** User reported the app working via Docker on host port 3000 but **empty DB** after a fresh/volume reset.

**Why:** New Postgres (or new volume) has schema from migrations but **no seed rows**.

**Reseed steps documented:**

```bash
npx prisma db seed
npx --yes tsx scripts/private-dev-qa-bootstrap.ts
# or: npm run qa:bootstrap
```

**Prisma 7 fix:** `npx prisma db seed` was a no-op until `migrations.seed` was set in `prisma.config.ts`:

```ts
migrations: {
  path: "prisma/migrations",
  seed: "npx --yes tsx prisma/seed.ts",
},
```

**What seed does:**

- `prisma/seed.ts`: client `[INTERNAL] AgenticForce test lab` + five `[TEST]` briefs.
- `scripts/private-dev-qa-bootstrap.ts`: **Loom & Lumen Atelier** + **Verdant Circuit Skincare**, brand bibles, briefs, drives workflows to EXPORT; optional visual gen (may fail e.g. DALL·E prompt length).

---

## 3. Lines of code (approximate, git-tracked)

From `wc -l` on tracked files (excluding huge `package-lock.json`):

| Scope | Lines |
|--------|------:|
| All tracked text files | ~18,939 |
| `.ts` + `.tsx` | ~16,562 |
| + Prisma + migration SQL + small `.mjs`/`.css` | ~17,721 |
| `.md` docs | ~964 |

---

## 4. Merge feature branch into `main` (squash)

**Request:** Bring `main` up to date with branch  
`cursor/-bc-8e0460fd-0b69-4f5d-a12d-ea4364c31080-f846` via **squash merge**.

**Process:**

```bash
git checkout main
git pull origin main
git merge --squash origin/cursor/-bc-8e0460fd-0b69-4f5d-a12d-ea4364c31080-f846
# verify: npm install, npx prisma generate, npm run typecheck, npm run lint
git commit -m "Squash-merge cursor feature branch into main"
git push origin main
```

Large change set: onboarding, brand memory, visual references, brand visual training (FAL), studio UX, orchestrator updates, many migrations, `@fal-ai/client`, etc.

---

## 5. Placeholder orchestrator payloads → `fallbacks/`

**Audit:** `buildPlaceholderArtifactContent` only used from `OrchestratorService.completeTask` when:

1. Agent run fails → `_agenticforceSource: "placeholder_fallback"`.
2. EXPORT creative-director final fails → same + `CREATIVE_DIRECTOR_SKIPPED`.
3. No user payload and no matching agent path → bare placeholder.

**Change:** Moved  
`src/server/orchestrator/scaffold/placeholder-stage-output.ts` →  
`src/server/orchestrator/fallbacks/placeholder-stage-output.ts`, updated import in `orchestrator-service.ts`, README, removed unused `buildPlaceholderAgentRunInput`.

---

## 6. Quality loop vs Brand Guardian (technical)

### 6.1 `src/server/agents/runner.ts`

- **Order:** `runGenerationWithRepair` (primary LLM + optional JSON repair) → if `stageUsesQualityLoop(stage)`:
  - `mergeDeterministicIssues` + `assessPrePersistQuality` → `shouldRegenerate`.
  - If regenerate: `buildRegenerationUserPrompt` + **second** `runGenerationWithRepair`.
  - Second `assessPrePersistQuality` on regen output; attach `_agenticforceQuality` metadata.
- **`shouldRegenerate`:** true if deterministic `recommend`, or LLM `regenerationRecommended`, or `qualityVerdict === "WEAK"`, or `frameworkExecution === "WEAK"`.
- **Max regeneration:** **one** extra full generation (comment: “one regeneration max”).
- **Stages using loop:** STRATEGY, IDENTITY_STRATEGY, IDENTITY_ROUTING, CONCEPTING, VISUAL_DIRECTION, COPY_DEVELOPMENT — **not** REVIEW.

### 6.2 Brand Guardian

- **Pipeline:** `v1-pipeline.ts` — stage `REVIEW`, `agentType: "BRAND_GUARDIAN"`, artifact `REVIEW_REPORT`, `requiresReview: true`.
- **Registry:** `REVIEW` → `brandGuardianAgent` in `registry.ts`.
- **Execution:** Same as other agents: `completeTask` → `executeAgentForTask` for `REVIEW` stage.
- **After success:** Task → `AWAITING_REVIEW` (artifact persisted).
- **`regenerationRecommended` on REVIEW_REPORT:** Does **not** auto re-run upstream agents. **`approveTask`** calls `reviewArtifactQualityBlocksApproval`; if blocked (includes `regenerationRecommended === true`, WEAK, DRIFT fields), approval throws `QUALITY_GATE` unless `approveAnyway`.

### 6.3 Relationship

- Pre-persist loop: **inside** `executeAgentForTask` for **upstream** stages, **before** artifact persist.
- Brand Guardian: **separate REVIEW task**, later in pipeline; reads full context in its prompt; gate at **approve** time.

---

## 7. Related repo paths (quick index)

| Topic | Path |
|--------|------|
| Orchestrator | `src/server/orchestrator/orchestrator-service.ts` |
| Quality loop | `src/server/agents/quality-loop.ts`, `src/server/agents/runner.ts` |
| Brand Guardian | `src/server/agents/brand-guardian.ts` |
| Approve quality gate | `src/server/orchestrator/artifact-validation.ts` → `reviewArtifactQualityBlocksApproval` |
| Pipeline rows | `src/server/orchestrator/v1-pipeline.ts` |
| Placeholder fallbacks | `src/server/orchestrator/fallbacks/placeholder-stage-output.ts` |
| Prisma seed config | `prisma.config.ts` |
| QA bootstrap | `scripts/private-dev-qa-bootstrap.ts` |

---

## 8. Instructions for the receiving agent

1. **Pull this branch:**  
   `git fetch origin temp/conversation-handoff-archive && git checkout temp/conversation-handoff-archive`
2. **Read this file:** `docs/CONVERSATION_HANDOFF_AGENTS.md`
3. After the human confirms they have the content locally, **delete** this file (and optionally remove the branch) per their request.

---

*Generated as a handoff artifact; not product documentation for end users.*
