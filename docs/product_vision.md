# Product vision

## One-line definition

**AgenticForce** is a task-based operating system for running a small AI-assisted creative agency: one founder, many clients, one canonical workflow, server-owned orchestration.

## Who it is for

- A **founder-operator** (or tiny core team) who sells creative/strategy services to **multiple clients**.
- Operators who need **repeatable quality** and **auditability**, not infinite free-form chat per client.

## What it is not

- Not a generic “AI chat for your business” SaaS.
- Not a pipeline that skips strategy and jumps to generations.
- Not a product where the browser calls OpenAI (or any provider) directly for workflow steps.

## Operating model

1. **Clients** are isolated units of work with their own brand and service definitions.
2. **Work** is expressed as **tasks** in a **fixed pipeline** (see [workflow_pipeline.md](./workflow_pipeline.md)).
3. **Brand Bible** is the canonical description of voice, visual guardrails, positioning, and constraints for a client. It is **composed and injected on the server** whenever work is executed — never reassembled ad hoc in the UI.
4. **Founder review gates** exist to **block progression**. Unapproved work does not advance stages.
5. **Outputs** are **artifacts**: structured, named, versionable results (copy decks, strategy summaries, concepts, export packages) — not unstructured message threads pretending to be deliverables.

## Success criteria (product)

- A founder can answer: *What stage is this client in? What is blocked on me? What shipped?*
- Strategy and brand alignment are **first-class**; creative work **cannot** bypass them without an explicit policy change (out of scope for v1).
- The system remains **honest**: no simulated agent runs, no fake approvals, no demo responses labeled as production.

## v1 boundaries

- **Inbound workflow** only: Brief through Export as defined in the pipeline doc.
- **Four agents** (see [agent_roster.md](./agent_roster.md)); behavior is orchestrated, not user-triggered per model call.
- **No** Prisma, auth, or live agent wiring in the foundation repo state — those are subsequent implementation milestones.
