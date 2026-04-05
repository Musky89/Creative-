# Architecture rules

These rules are **non-negotiable** for AgenticForce production code unless explicitly revised in a written ADR or product spec change.

## 1. Orchestrator is the only workflow engine

- All valid **stage transitions**, **task state changes**, and **agent eligibility** are implemented in **server-side orchestrator** code under `src/server/orchestrator/` (when built).
- UI, cron jobs, and integrations may **request** actions; they do **not** embed parallel workflow logic that could drift from the orchestrator.

## 2. No UI-triggered agent calls

- Browsers (React, Server Actions from untrusted input paths, etc.) must **not** invoke model providers directly for product workflows.
- The UI submits **intents** (e.g. “submit brief,” “approve review”) to **trusted server APIs**; the orchestrator decides whether to enqueue or run **AgentRun** records.

## 3. Review gates block progression

- Unless the orchestrator explicitly defines a bypass (none in v1), **Review** requirements must **block** movement to **Export** and any stage that would invalidate audit trails.
- “Optimistic” UI is allowed for display only; **authoritative state** reflects gate satisfaction.

## 4. Brand Bible must be injected server-side

- Assembly of **BrandBible** context for a task happens **only** in server code (e.g. `src/server/brand/`).
- The client may show redacted previews if needed, but **never** becomes the source of truth for full injection payloads.

## 5. No LoRA or advanced training features in v1

- Do not imply or ship **LoRA**, custom fine-tuning, or embedding-index RAG as v1 product features unless scoped in a later milestone with full implementation — not stubs.

## 6. No mock AI systems in production

- Production paths must not substitute **fake completions** or **hard-coded “AI said”** strings where real **AgentRun** behavior is expected.
- Development and automated tests may use mocks **clearly isolated** from production code paths.

## 7. Structured outputs

- Agent-facing prompts and parsers should target **schemas** (JSON, typed sections, templates) aligned with **Artifact** types — avoid irrecoverable blobs when structure is required.

## 8. Single source of truth for runs

- **AgentRun** (or successor) is the audit log of model execution tied to tasks; debugging and UX should prefer reading orchestrator/agent state over inferring from chat logs.
