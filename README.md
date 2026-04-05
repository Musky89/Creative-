# AgenticForce

**AgenticForce** is an **AI-native creative agency operating system**. It is not a generic multi-tenant SaaS template. It is built for a **single founder** who runs **multiple clients** through a **task-based pipeline** with **explicit review gates**, **injectable brand context**, and a **server-side orchestrator** as the only workflow engine.

## What problem it solves

Creative work routed through ad-hoc chats and one-off prompts produces:

- inconsistent strategy-vs-creative ordering,
- weak or missing brand alignment,
- outputs that are hard to approve, version, or export,
- and no single place that knows *where* a client’s work actually is.

AgenticForce addresses this by treating the agency as a **structured workflow of tasks and artifacts**, where:

1. **Strategy precedes creative** — downstream work depends on approved strategy.
2. **Founder review gates** — progression is blocked until explicit approval (or recorded rejection) at defined points.
3. **Brand Bible is always in play** — canonical brand context is assembled **on the server** and injected into agent/task context; the UI does not assemble or bypass that contract.
4. **Orchestration is centralized** — the orchestrator decides valid transitions, what runs next, and what data agents see. The UI renders state and submits **intent** (e.g. approve, request changes), not direct model calls.

## Architectural philosophy

| Principle | Meaning |
|-----------|---------|
| **Tasks, not prompts** | Work is modeled as tasks with inputs, outputs, and gates — not as a linear chat transcript. |
| **Structured outputs** | Deliverables are typed artifacts (documents, structured fields, exports), not blobs lost in history. |
| **Single source of truth** | The orchestrator owns workflow state, eligibility, and agent invocation. |
| **No UI ↔ model shortcuts** | Browsers never call model providers directly for product workflows. |
| **No fake intelligence** | v1 avoids mock “AI” responses, placeholder pipelines dressed as production, or implied capabilities (e.g. LoRA, fine-tuning) that are not implemented. |

### Repository layout (high level)

- `src/app/` — Next.js App Router (pages, layouts).
- `src/components/` — Shared UI (to be built against orchestrator-driven data).
- `src/lib/` — Pure utilities shared across client and server where safe.
- `src/server/` — Server-only code: orchestrator, agents, brand assembly, review, artifacts, storage, DB access (`src/server/db/`).
- `prisma/` — PostgreSQL schema and migrations; Prisma Client is generated to `src/generated/prisma` (gitignored).
- `src/types/` — Shared TypeScript types and domain shapes.
- `docs/` — Product vision, workflow definitions, agent roster, data model overview, architecture rules.

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The current homepage is a **minimal placeholder** confirming the scaffold only.

```bash
npm run build   # production build
npm run lint    # ESLint
```

---

## Documentation index

| Document | Purpose |
|----------|---------|
| [docs/product_vision.md](docs/product_vision.md) | What the platform is and how it behaves (no fluff). |
| [docs/workflow_pipeline.md](docs/workflow_pipeline.md) | The only approved end-to-end pipeline. |
| [docs/agent_roster.md](docs/agent_roster.md) | v1 agent roles and boundaries. |
| [docs/data_model_overview.md](docs/data_model_overview.md) | Core entities before schema tooling (e.g. Prisma). |
| [docs/architecture_rules.md](docs/architecture_rules.md) | Non-negotiable engineering rules. |

---

## Database (PostgreSQL + Prisma)

1. Copy [`.env.example`](.env.example) to `.env` and set `DATABASE_URL` to your Postgres instance (include `?schema=public` if needed).
2. Apply migrations:

   ```bash
   npm run db:migrate
   ```

   In CI or production against an existing database, use:

   ```bash
   npm run db:migrate:deploy
   ```

3. Regenerate the client after schema changes (also runs on `npm install` via `postinstall`):

   ```bash
   npm run db:generate
   ```

4. Optional: `npm run db:studio` opens Prisma Studio.

**Prisma 7** reads the datasource URL from [`prisma.config.ts`](prisma.config.ts) (`DATABASE_URL`), not from `schema.prisma`.

### LLM agents (v1)

Set **`OPENAI_API_KEY`** and/or **`ANTHROPIC_API_KEY`**. Optional: **`LLM_PROVIDER`** (`auto` \| `openai` \| `anthropic`), **`OPENAI_MODEL`**, **`ANTHROPIC_MODEL`**. See [`.env.example`](.env.example).

When no provider is configured, **STRATEGY / CONCEPTING / COPY / REVIEW** tasks still complete but persist **labeled placeholder** artifacts with `_agenticforceSource: "placeholder_fallback"` and the error reason in `_agenticforceLlmError` when an API key exists but the call failed.

**Brand Bible gate:** agent stages (Strategist → Brand Guardian) **cannot start** until the client Brand Bible includes positioning, target audience, tone of voice, and at least one messaging pillar.

**Exports:** `GET /api/export/briefs/[briefId]?clientId=...&format=json|markdown` returns an attachment (pipeline snapshot; `_agenticforce*` keys stripped from artifact bodies in JSON).

**JSON repair:** if primary model output fails Zod validation, one **repair** LLM pass runs; artifacts record `_agenticforceGenerationPath` (`primary` \| `repair`) and `_agenticforceRepaired`.

**Creative Canon:** in-code frameworks (`src/lib/canon/frameworks.ts`) are selected per stage (`selectFrameworksForTask`); agents receive them in prompts and outputs include framework fields. Persisted artifacts also carry `_creativeCanonFrameworkIds` for audit.

**Pre-persist quality loop (strategy / concept / copy):** after a valid JSON artifact, a fast LLM quality pass plus deterministic checks may trigger **one** regeneration with explicit critique; metadata is stored on the artifact as `_agenticforceQuality` and mirrored in `AgentRun.metadata.qualityLoop`. If the second pass still fails, the **best available** draft is kept with `stillWeakAfterRegen`.

The initial migration is [`prisma/migrations/20260405120000_init_core_domain/migration.sql`](prisma/migrations/20260405120000_init_core_domain/migration.sql). If your database was empty, `prisma migrate dev` will apply it and record it in `_prisma_migrations`.

---

## Orchestrator HTTP API (v1)

All responses are JSON: success `{ ok: true, data }`, errors `{ ok: false, error: { code, message } }`.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/orchestrator/briefs/[briefId]/initialize` | Create the six-stage task graph for the brief; first task becomes `READY`. |
| `GET` | `/api/orchestrator/briefs/[briefId]/workflow` | Full workflow state: tasks (pipeline order), edges, `nextExecutableTaskIds`. |
| `POST` | `/api/orchestrator/briefs/[briefId]/execute-next` | `startTask` + `completeTask` on the next READY task (optional JSON body `{ "artifactPayload": { ... } }`). |
| `POST` | `/api/orchestrator/tasks/[taskId]/start` | `READY` → `RUNNING`; creates `AgentRun` when `agentType` is set. |
| `POST` | `/api/orchestrator/tasks/[taskId]/complete` | Persist artifact, version bump, `RUNNING` → `AWAITING_REVIEW` or `COMPLETED`; optional `{ "artifactPayload": { ... } }`. |
| `POST` | `/api/orchestrator/tasks/[taskId]/approve` | Record approval `ReviewItem`, complete task, unlock dependents. Optional `{ "feedback": "..." }`. |
| `POST` | `/api/orchestrator/tasks/[taskId]/request-revision` | Body `{ "feedback": "..." }` (required); `AWAITING_REVIEW` → `REVISE_REQUIRED`. |
| `POST` | `/api/orchestrator/tasks/[taskId]/reset-ready` | `REVISE_REQUIRED` → `READY` (clears run timestamps). |

Implementation lives under [`src/server/orchestrator/`](src/server/orchestrator/). Placeholder artifact content is in [`src/server/orchestrator/scaffold/`](src/server/orchestrator/scaffold/) — not AI output.

---

## Internal product UI (founder OS)

Routes (all server-driven; workflow actions call `OrchestratorService` via server actions):

| Path | Purpose |
|------|---------|
| `/` | Dashboard — clients + recent briefs |
| `/clients` | Client list |
| `/clients/new` | Create client |
| `/clients/[id]` | Overview + tabs |
| `/clients/[id]/brand-bible` | Brand Bible form |
| `/clients/[id]/service-blueprint` | Service Blueprint form |
| `/clients/[id]/briefs` | Brief list |
| `/clients/[id]/briefs/new` | Create brief |
| `/clients/[id]/briefs/[briefId]/edit` | Edit brief |
| `/clients/[id]/briefs/[briefId]/studio` | **Workflow studio** — timeline, orchestrator controls, artifacts, review log |

The root layout sets **`dynamic = "force-dynamic"`** so `next build` does not require a live Postgres during static generation.

---

## Current scope (this foundation)

This repository **intentionally** has:

- Next.js + TypeScript + Tailwind, `src/` layout, minimal homepage.
- **Core domain Prisma schema** (eight models + `TaskDependency` for explicit task graphs) and PostgreSQL migrations.
- **v1 workflow orchestrator** (Prisma-backed), **Route Handlers** under `/api/orchestrator/*`, and **internal UI** for clients, brand, blueprint, briefs, and the brief **studio**.
- Documentation and reserved server folders for agents, brand, review, artifacts, storage.

It **does not** yet include auth or real AI agent integrations — only deterministic placeholder scaffolding for artifacts and agent-run inputs.

---

## Decisions before schema design

Lock these before choosing tables, migrations, and storage APIs:

1. **Primary database** — Postgres is the likely default; confirm hosting, tenancy model (single DB vs. schema-per-tenant), and migration tool (Prisma later vs. alternatives).
2. **Artifact storage** — Large blobs vs. object storage (S3-compatible) vs. DB-only; CDN for export bundles; retention and deletion policy per client.
3. **Brand Bible versioning** — Single mutable document vs. immutable versions with “active” pointer; who can edit and when.
4. **Review policy** — Which stages require founder approval vs. optional review; whether client-facing approval exists in v1 and how it maps to `ReviewItem`.
5. **Export format** — ZIP of PDFs/Markdown/JSON, or integration handoff only; immutability and checksums.
6. **AgentRun correlation** — Idempotency keys for retried runs; PII redaction in stored prompts; retention for logs and token usage.
7. **Task templates** — How `ServiceBlueprint` maps to instantiated tasks (1:1 vs. graph); parallel tasks within a stage allowed or not.

These are outlined conceptually in [docs/data_model_overview.md](docs/data_model_overview.md) and are **not** fixed in the foundation repo.
