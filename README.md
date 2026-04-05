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
- `src/server/` — Server-only code: orchestrator, agents, brand assembly, review, artifacts, storage, DB access (when added).
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

## Current scope (this foundation)

This repository **intentionally** has:

- Next.js + TypeScript + Tailwind, `src/` layout, minimal homepage.
- Documentation and **empty** server subtree folders reserved for orchestrator, agents, brand, review, artifacts, storage, and DB.

It **does not** yet include Prisma, auth, orchestrator logic, or real agents — those come in later slices aligned with the docs above.

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
