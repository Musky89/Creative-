# Workflow pipeline (approved)

This document defines the **only** approved end-to-end workflow for AgenticForce v1.

## Canonical sequence

```
Brief → Strategy → Concept → Copy → Review → Export
```

Stages are **ordered**. Names are normative — features and UI must map to these stages.

## Stage definitions

| Stage | Purpose | Primary outcome |
|-------|---------|-----------------|
| **Brief** | Capture client ask, constraints, audience, success criteria, delivery expectations. | A validated **Brief** linked to the client and engagement. |
| **Strategy** | Translate the brief into positioning, narrative pillars, channel logic, and creative guardrails *before* creative execution. | Approved **strategy artifact(s)** and **ServiceBlueprint** alignment. |
| **Concept** | Generate and refine creative directions (themes, hooks, big ideas) grounded in approved strategy and Brand Bible. | **Concept** artifacts eligible for downstream copy. |
| **Copy** | Produce structured copy variants (headlines, body, CTAs, etc.) per blueprint and chosen concepts. | **Copy** artifacts with explicit structure (not one blob). |
| **Review** | Founder (and optionally client-facing) gate: approve, reject, or request changes with tracked **ReviewItem** records. | Recorded decisions; **blocks Export** until requirements met. |
| **Export** | Package approved artifacts for handoff (formats TBD at implementation). | Immutable or versioned **export** artifact bundle. |

## Rules of the road

1. **Strategy before creative** — Concept and Copy tasks MUST NOT run against unapproved strategy unless the orchestrator defines a future exception (none in v1).
2. **Task-based** — Each stage is decomposed into **tasks** with inputs, outputs, and assignee agents (see [agent_roster.md](./agent_roster.md)); the UI reflects task state.
3. **Review gates** — **Review** is not a cosmetic step. The orchestrator must enforce **no progression to Export** without satisfying the review policy for that engagement.
4. **Brand Bible** — Every execution task that produces or revises client-facing creative must receive **server-injected** Brand Bible context.
5. **Single engine** — Valid transitions between stages and tasks are determined only by the **orchestrator** ([architecture_rules.md](./architecture_rules.md)).

## Out of scope for v1

- Parallel alternate pipelines (e.g. “Copy-only” skippage) unless explicitly added in a later spec revision.
- User-defined arbitrary stage graphs.
- Direct agent invocation from the client for production workflow.
