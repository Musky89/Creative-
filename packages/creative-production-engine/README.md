# Creative Production Engine — migration package (metadata)

This folder **does not duplicate source code**. The implementation lives under:

| Area | Path in this repo |
|------|-------------------|
| Core (types, planner, FAL, composition, handoff, pipeline) | `src/lib/production-engine/` |
| Sharp composer (Node server) | `src/server/production-engine/` |
| Next.js API routes | `src/app/api/production-engine/` |
| Production Studio UI | `src/app/production-engine/page.tsx`, `src/components/production-engine/` |

**Read next:**

- [MIGRATION.md](./MIGRATION.md) — copy list, dependencies, env vars, Replit paths
- [INTEGRATION_CONTRACTS.md](./INTEGRATION_CONTRACTS.md) — contracts for a future orchestrator

Branch for this prep: **`production-engine-migration-prep`**.
