# Migration guide — Creative Production Engine → Replit / other host

## Target project shape (this repo context)

- **This codebase:** **TypeScript + Next.js 15 + React 19** (`package.json`, `next.config`).
- **Replit destination:** **Unknown** from repository files (no `.replit`, `replit.nix`, or Replit config in this workspace).
- **Assumption for prep:** Treat the module as **TypeScript/Node** with an optional **Next.js** UI layer. If the Replit app is **Python-only**, use the **API boundary** section below — do not expect a drop-in Python import of this code.

---

## 1. What to copy (minimal friction)

### Option A — Next.js / React host (recommended direct port)

Copy these trees **preserving internal paths** or rewrite `@/lib` → your alias:

```
src/lib/production-engine/          # entire directory
src/server/production-engine/       # deterministic-composer + index
src/app/api/production-engine/      # preview + compose-preview routes
src/app/production-engine/page.tsx
src/components/production-engine/production-studio-shell.tsx
```

Register path alias `@/lib` and `@/server` (or replace imports project-wide).

### Option B — Node/Express (or Replit Node) without Next UI

Copy:

- `src/lib/production-engine/**`
- `src/server/production-engine/deterministic-composer.ts`

Expose **your own** HTTP handlers that:

1. Parse body with `productionEngineInputSchema`
2. Call `runProductionEngineStub` or `CreativeProductionEngine.run`
3. Optionally call `runDeterministicComposeSharp` for PNG

### Option C — Python Replit

This module **stays TypeScript**. Options:

1. **Separate TS microservice** (Replit second process or external) exposing the two JSON endpoints.
2. **Reimplement** planner/router in Python using `INTEGRATION_CONTRACTS.md` and JSON schemas as spec (large effort).

Do **not** attempt automatic translation in this repo.

---

## 2. Dependencies

### Required for core engine (lib)

| Package | Purpose |
|---------|---------|
| `zod` | Input + plan validation |

### Required for Production Studio + API routes (Next host)

| Package | Purpose |
|---------|---------|
| `next` | App Router, API routes, page |
| `react`, `react-dom` | Studio shell |

### Required for Sharp composer

| Package | Purpose |
|---------|---------|
| `sharp` | Raster compose (**declare in host `package.json`** — was transitive here; migration prep adds explicit dep) |

### Optional / future

| Package | When |
|---------|------|
| `@fal-ai/client` | When replacing stub FAL responses with real calls (not used by this module today) |

**Not used by production-engine:** Prisma, pg, pdf-lib, etc. (rest of app only).

---

## 3. Environment variables

**None required** for the standalone engine today.

- FAL keys: **not read** inside this module; add in host when wiring real FAL.
- Image URLs in input are fetched at compose time with `fetch` (no special env).

---

## 4. Routes / UI (Next)

| Path | Purpose |
|------|---------|
| `GET` `/production-engine` | Production Studio |
| `POST` `/api/production-engine/preview` | Full pipeline JSON |
| `POST` `/api/production-engine/compose-preview` | PNG + handoff snapshot |

**Portable caveat:** `production-studio-shell.tsx` uses **relative** `fetch("/api/production-engine/...")`. If the app lives under a **basePath**, set `NEXT_PUBLIC_PRODUCTION_ENGINE_API_BASE` or change fetch URLs.

---

## 5. FAL integration points

- **Routing only:** `fal-router.ts` returns path ids (e.g. `fal-ai/flux-general`, `internal/composition-only`).
- **Execution:** `buildStubFalResponse` — replace with queue/subscribe/Webhook in host.
- **No** live FAL SDK inside `src/lib/production-engine`.

---

## 6. Composer / handoff

- **Composer:** `runDeterministicComposeSharp` — Sharp, server-only.
- **Handoff:** `buildHandoffPackage` — pure data (`HandoffPackageExtended`); ZIP generation is future host work.

---

## 7. Coupling to this repo’s app shell

| Coupling | Severity | Mitigation |
|----------|----------|------------|
| `@/` path alias | Medium | Configure same alias or sed-replace to relative/`@/` |
| Next App Router | Medium for UI | Omit `src/app/*` if not Next |
| Tailwind classes in Studio | Low | Optional; swap styling in host |
| `eslint-config-next` | None for runtime | Dev-only |

**No** imports from orchestrator, Prisma, or main Studio.

---

## 8. Optional vs required

| Component | Required for “engine only” | Required for Studio + PNG |
|-----------|---------------------------|----------------------------|
| `src/lib/production-engine` | Yes | Yes |
| `src/server/production-engine` | No | Yes (for Sharp) |
| API routes | No | Yes (or reimplement) |
| Production Studio UI | No | No (reference only) |

---

## 9. Stable public API

Import from **`@/lib/production-engine/public-api`** (or `CreativeProductionEngine` export):

- `CreativeProductionEngine.schema` — Zod schema
- `CreativeProductionEngine.run(input)` — full stub pipeline result
- `CreativeProductionEngine.buildProductionPlan`, `.runPipeline` — aliases for clarity

See `public-api.ts` in the lib folder.

---

## 10. Verification after copy

```bash
npm run typecheck
# In host: ensure sharp installs (native) on Replit/Linux
```

---

## Risks / caveats

1. **`sharp`** native binaries — Replit/build image must support Sharp’s platform targets.
2. **Path aliases** — `@/lib`, `@/server` must resolve or imports break.
3. **Base URL** — client `fetch` paths if app not at domain root.
4. **Python host** — plan for a **TS sidecar** or API, not a single-language merge.
