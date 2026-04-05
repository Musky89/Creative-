# Agent roster (v1)

AgenticForce v1 defines **four** agents. Each agent is a **role** with a clear mandate; implementation may map a role to one or more prompts/tools later — **this document defines responsibility only**.

## 1. Strategist

**Mandate:** Turn an approved **Brief** (and **ServiceBlueprint** where relevant) into coherent **strategy**: positioning, narrative, priorities, and measurable creative guardrails.

**Inputs (conceptual):** Brief, Brand Bible (injected), client/service constraints.

**Outputs (conceptual):** Structured strategy artifacts (sections, bullets, rationales) suitable for **founder review** before Concept work.

**Must not:** Write final campaign copy or execute visual generation; must not bypass Brand Bible constraints.

---

## 2. Creative Director

**Mandate:** Given **approved strategy**, develop **concepts**: themes, angles, campaign hooks, and creative direction that Copy can execute.

**Inputs (conceptual):** Approved strategy artifacts, Brand Bible, Brief (reference).

**Outputs (conceptual):** Concept artifacts — structured ideas with rationale, **not** finalized channel-ready copy.

**Must not:** Approve its own work in place of founder gates; must not redefine strategy without a routed strategy task.

---

## 3. Copywriter

**Mandate:** Produce **structured copy** from approved concepts and strategy: variants, lengths, tone, and CTAs as required by the task definition.

**Inputs (conceptual):** Approved concepts, strategy excerpts, Brand Bible, **artifact templates** (when defined).

**Outputs (conceptual):** Copy artifacts with explicit fields (e.g. headline / body / CTA), ready for review.

**Must not:** Weaken or ignore Brand Bible rules; must not silently change strategy.

---

## 4. Brand Guardian

**Mandate:** **Validate** creative outputs (concept and copy) against the **Brand Bible** and **strategy-aligned guardrails**. Surface concrete violations and suggested fixes **as structured review feedback** — not as silent auto-rewrites unless explicitly specified by orchestrator policy.

**Inputs (conceptual):** Candidate artifacts, Brand Bible, relevant strategy constraints.

**Outputs (conceptual):** Structured pass/fail or issue list linked to **ReviewItem** or task comments (exact schema TBD).

**Must not:** Replace founder review; acts as **quality gate input**, not final approval authority.

---

## Orchestration note

The **orchestrator** schedules which agent runs for which **Task**, with which inputs. Users do not pick “call GPT-4” from the UI; they act on tasks and reviews. See [architecture_rules.md](./architecture_rules.md).
