# File manifest — standalone Creative Production Engine

## `src/lib/production-engine/` (core module — portable TS)

| File | Role |
|------|------|
| `index.ts` | Barrel exports |
| `public-api.ts` | **Stable facade** for host apps (`CreativeProductionEngine`) |
| `modes.ts` | `ProductionMode` union |
| `types.ts` | Input/result types |
| `schemas.ts` | Zod `productionEngineInputSchema` |
| `mode-registry.ts` | Per-mode config |
| `production-plan-schema.ts` | Zod production plan discriminated union |
| `production-plan-planner.ts` | Deterministic planner |
| `planning.ts` | `buildProductionPlan`, operational checklist |
| `generation-targets.ts` | Target types |
| `derive-generation-targets.ts` | Target derivation |
| `fal-paths.ts`, `fal-contracts.ts`, `fal-router.ts`, `fal-routing.ts` | FAL routing & contracts |
| `visual-execution.ts` | Bundle build |
| `jobs.ts` | Job stubs |
| `layout-archetypes.ts`, `composition-geometry.ts`, `composition-plan-schema.ts`, `composition-plan.ts`, `composition-mode-tweaks.ts`, `composition-manifest.ts` | Composition |
| `composer.ts` | Artifact stubs |
| `mode-ooh-social.ts`, `mode-packaging-retail.ts`, `mode-identity-fashion-export.ts` | Mode helpers |
| `review.ts` | Evaluation |
| `handoff.ts`, `handoff-types.ts`, `handoff-export-profile.ts`, `handoff-layer-manifest.ts` | Handoff/export |
| `pipeline.ts` | `runProductionEngineStub` |

**No imports** from `@/app`, orchestrator, Prisma, or Studio — only relative `./` and `types` from this tree.

## `src/server/production-engine/`

| File | Role |
|------|------|
| `deterministic-composer.ts` | **Sharp** PNG compose (uses `@/lib/production-engine/*`) |
| `index.ts` | Re-exports lib facade (optional) |

## `src/app/api/production-engine/`

| Route | Role |
|-------|------|
| `preview/route.ts` | POST → full `runProductionEngineStub` JSON |
| `compose-preview/route.ts` | POST → Sharp preview + handoff snapshot |

## `src/app/production-engine/`

| File | Role |
|------|------|
| `page.tsx` | Production Studio page |

## `src/components/production-engine/`

| File | Role |
|------|------|
| `production-studio-shell.tsx` | Client UI (fetch relative `/api/production-engine/*`) |
