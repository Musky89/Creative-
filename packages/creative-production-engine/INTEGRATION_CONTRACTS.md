# Integration contracts — Creative Production Engine

For a **future** upstream orchestration or strategy system. **Do not** call from the current repo orchestrator until explicitly integrated.

## 1. Required normalized input

- **Validator:** `productionEngineInputSchema` (Zod) in `schemas.ts`
- **Type:** `ProductionEngineInput` in `types.ts`

Minimum conceptual fields:

- `mode` — one of `PRODUCTION_MODES`
- `briefSummary`, `selectedConcept` (at least `conceptName`), `selectedHeadline`, `selectedCta`
- `visualDirection`, `referenceSummaries[]`, `brandRulesSummary`

Optional but commonly used:

- `campaignCore`, `supportingCopy`, `visualSpecNotes`, `brandAssets`, `visualStyleRef`, `modelRef`, `visualQualityTier`, `layoutArchetype`, image URLs (`heroImageUrl`, `secondaryImageUrl`, `tertiaryImageUrl`), mode-specific batch/variant indices (see schema).

## 2. Production modes

- Enum: `modes.ts` — `OOH`, `SOCIAL`, `PACKAGING`, `RETAIL_POS`, `IDENTITY`, `ECOMMERCE_FASHION`, `EXPORT_PRESENTATION`
- Registry: `PRODUCTION_MODE_REGISTRY` in `mode-registry.ts`

## 3. Production Plan

- **Build:** `buildProductionPlan(input)` → `{ document: ProductionPlanDocument, operational: ProductionPlan }`
- **Document:** Zod-valid discriminated union (`production-plan-schema.ts`) — shared fields + mode-specific extensions
- **Operational:** Human checklist steps derived from plan + mode config (`planning.ts`)

## 4. Generation target planning

- **Derive:** `deriveGenerationTargets(input, planDocument, qualityTier)` (used inside `buildVisualExecutionBundle`)
- **Types:** `GenerationTarget` in `generation-targets.ts`

## 5. FAL routing

- **Router:** `routeFalExecution` / `routeBatch` in `fal-router.ts`
- **Paths:** `fal-paths.ts` (string ids only — no live `@fal-ai/client` dependency in this module)
- **Contracts:** `FalExecutionRequest` / `FalExecutionResponse` in `fal-contracts.ts`
- **Stub responses:** `buildStubFalResponse` — real FAL I/O is a future adapter

## 6. Composition plan

- **Build:** `buildCompositionPlanDocument(input, productionPlan, layoutArchetypeOverride?)`
- **Schema:** `composition-plan-schema.ts` (placements, finishing, mode layout extensions)

## 7. Deterministic compose (optional in host)

- **Server-only:** `runDeterministicComposeSharp` in `src/server/production-engine/deterministic-composer.ts`
- **Requires:** `sharp`, Node, fetch for remote images

## 8. Review

- **Evaluate:** `evaluateProductionOutput(input, planDocument?)` → `ReviewEvaluation`

## 9. Handoff / export

- **Build:** `buildHandoffPackage(input, productionPlan, compositionPlan, layerManifest, visualExecution, options?)` → `HandoffPackageExtended`
- **Structured layers:** `handoff.layerManifestStructured` (`HandoffLayerManifestDocument`)
- **ZIP bytes:** not generated here — paths in `handoff.items` are logical

## 10. Single entry for orchestration (recommended)

```ts
import { CreativeProductionEngine } from "@/lib/production-engine/public-api";

const parsed = CreativeProductionEngine.schema.safeParse(payload);
if (!parsed.success) { /* handle */ }
const result = CreativeProductionEngine.run(parsed.data);
// result.productionPlan, result.visualExecution, result.handoff, …
```

For compose preview in a Next host, call `runDeterministicComposeSharp` from a dedicated API route (see `src/app/api/production-engine/compose-preview/route.ts`).

## 11. Boundaries

- **In scope:** Everything under `src/lib/production-engine/`, `src/server/production-engine/`, isolated API routes + Studio page.
- **Out of scope for this module:** Prisma, task queues, user auth, main app navigation, existing orchestrator stages.
