# Standalone Agentic Creative OS (`experiment/agentic-os-standalone`)

**Purpose:** A **from-scratch** creative operating loop in this repo **without modifying or importing** `src/lib/production-engine`, creative-testing-lab, or orchestrator code paths.

## Enable

```bash
STANDALONE_AGENTIC_OS_ENABLED=1
# optional for LLM proposal + critic:
OPENAI_API_KEY=sk-...
```

- UI: `/standalone-agentic-os`
- API: `/api/standalone-agentic-os/*` (health, brands, campaigns, channels, cases)

## What’s implemented (v0)

1. **Brand graph** — voice, must signal/avoid, banned phrases, palette (with roles for contrast check).
2. **Campaign graph** — objective, audience, SMP, proof points, channel link.
3. **Channel spec** — headline/CTA max length, min contrast ratio.
4. **Pipeline** — proposal (OpenAI JSON or deterministic) → **verification** → **critic** (OpenAI or deterministic) → bounded revisions → **case file** (append-only in memory).
5. **Seed data** — demo brand + campaign + two channels in `store.ts`.

## Non-goals (this branch)

- No Prisma migrations required for v0 (in-memory `globalThis` store).
- No FAL / image gen (add later inside this module only).
- No edits to legacy modules.

## Branch

`experiment/agentic-os-standalone` — open PR against `main` (or your integration branch) only when ready.
