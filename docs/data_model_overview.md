# Data model overview

Conceptual entities for AgenticForce in **business terms**. The **implemented schema** lives in [`prisma/schema.prisma`](../prisma/schema.prisma) and migrations under `prisma/migrations/` — use those as the source of truth for fields, enums, and relations. This document stays aligned with product language (what each entity *means*).

## Client

A **billing and work container**: one company or engagement subject. Holds references to brand, services, and all work items.

- Natural keys later: `id`, display name, status (active/archived).

## BrandBible

Canonical **brand context**: voice, tone, forbidden phrases, visual guidelines (textual in v1), positioning reminders, legal or compliance notes as needed.

- **Injected server-side** into every task that needs brand alignment.
- Typically **one active Bible per client** (or per major brand line); versioning TBD.

## ServiceBlueprint

Defines **what “done” looks like** for a class of engagement: deliverable types, required artifact templates, required review checkpoints, and export expectations.

- Links to **Client** (or product catalog + client subscription pattern — TBD).
- Drives **task templates** orchestrator may instantiate from **Brief** approval.

## Brief

Captures the **ask**: goals, audience, deadlines, must-haves, references, and constraints.

- First-class stage output of the **Brief** pipeline step.
- Feeds **Strategy**; immutable snapshots vs. mutable document TBD.

## Task

Atomic unit of work: typed, stateful, assigned to an agent role, with inputs and produced **Artifact** references.

- States (example, not final): `pending`, `ready`, `in_progress`, `awaiting_review`, `blocked`, `completed`, `failed`.
- **Orchestrator** is the only authority that advances tasks across stages.

## Artifact

Durable **output** of a task or export step: strategy doc, concept sheet, structured copy JSON, export bundle metadata, etc.

- Should be **structured** (schema or MIME + structured fields) where possible.
- Linked to **Task**, **Client**, and optional **AgentRun**.

## ReviewItem

A **decision or comment** on a specific artifact or task: approve, reject, change request, with actor (founder), timestamp, and rationale.

- **Blocks progression** when policy requires unresolved rejections or required approvals.

## AgentRun

One **execution** of an agent against a task: model/provider metadata, input snapshot ids, output artifact ids, status, errors, token usage (if collected).

- Enables **audit**: what was run, when, with what context — **no fake runs**.

---

## Cross-cutting notes

- **Traceability:** Brief → Tasks → Artifacts → ReviewItems → Export should be queryable as a graph.
- **No mock rows** pretending to be production AI in v1 implementations; tests may use fakes, production may not silently substitute stubs.
