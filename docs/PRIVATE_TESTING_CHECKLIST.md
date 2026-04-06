# Private testing readiness checklist

Use this when validating a fresh deploy or onboarding a tester.

**Quick start on a laptop:** [LOCAL_DEV.md](./LOCAL_DEV.md) → `npm run preflight` → optional `npm run qa:bootstrap` → `npm run dev`.  
**Recorded demo script:** [FOUNDER_WALKTHROUGH.md](./FOUNDER_WALKTHROUGH.md).

## Internal testing page

- [ ] Open **`/clients/{clientId}/internal-testing`**
- [ ] Click **Ensure test briefs** (or run `npx prisma db seed` for a dedicated lab client + briefs)
- [ ] Start an **evaluation session** (optional label) to group records
- [ ] After running the pipeline in Studio, save **per-stage** pass / fail / needs work + notes

---

## Environment

- [ ] `npm run preflight` passes (or fix DB / `.env` until it does)
- [ ] `DATABASE_URL` set and reachable from the app host
- [ ] `npm run db:migrate:deploy` completed successfully
- [ ] `GET /api/health?deep=1` returns `dbOk: true`
- [ ] Text LLM: `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` set (or accept placeholders)
- [ ] Image gen: `OPENAI_API_KEY` and/or `GEMINI_API_KEY` / `GOOGLE_API_KEY` set (if testing visuals)
- [ ] `STORAGE_ROOT` points to a persistent directory (if testing visuals)
- [ ] Optional: `npm run env:check` passes in CI

## New client

- [ ] Create client (`/clients/new`)
- [ ] Open client hub — client appears in list

## Brand OS / Brand Bible

- [ ] Open **Brand Bible** for the client
- [ ] Fill positioning, audience, tone, pillars
- [ ] Fill Brand Operating System sections (language, emotion, visual language) as needed for your test

## Service blueprint

- [ ] Configure service blueprint (quality threshold, template) if you use approval gates

## Brief

- [ ] Create brief with realistic objectives and constraints
- [ ] Open **Studio** for the brief

## Workflow

- [ ] **Initialize workflow** if tasks are missing
- [ ] Run tasks in order: intake → strategy → concept → visual direction → copy → review → export
- [ ] Approve or request revision where review is required; confirm Brand Bible gate blocks agents when incomplete

## Visual prompt package

- [ ] Complete **visual direction** and **approve** it
- [ ] Confirm **VISUAL_PROMPT_PACKAGE** appears under Visual direction after approval

## Image generation

- [ ] **Generate visual asset** with chosen provider target
- [ ] Thumbnail loads; failed runs show an error (no fake image)
- [ ] Optional: vision evaluation row appears when `OPENAI_API_KEY` is set

## Image review

- [ ] Compare variants; **Select** preferred; **Reject** weak
- [ ] Optional: **Regenerate with critique** (bounded counts)

## Export

- [ ] Download JSON or Markdown export:  
  `GET /api/export/briefs/{briefId}?clientId={clientId}&format=json`

## Done

- [ ] Logs show `[agenticforce:provider]` lines for LLM/image calls you exercised
- [ ] No unexplained 500s on core Studio paths
