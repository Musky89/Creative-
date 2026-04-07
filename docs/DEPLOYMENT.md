# AgenticForce — private deployment guide

This app targets **private, single-tenant-style** use: you run PostgreSQL, configure API keys, migrate the schema, and start Next.js. It is **not** a hardened multi-tenant SaaS.

**Local developer bring-up:** see **[LOCAL_DEV.md](./LOCAL_DEV.md)** (Docker Compose for Postgres, `preflight`, `qa:bootstrap`).

---

## Before first deploy

### 1. PostgreSQL

- Create a database and user.
- Connection string must use **`postgresql://`** or **`postgres://`** (Prisma + `pg`).
- **Optional local dev:** from the repo root, `docker compose up -d` starts Postgres 16 on port **5432** with database **`agenticforce`** (see `docker-compose.yml`).

### 2. Environment variables

Copy `.env.example` to `.env` and set at minimum:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | **Yes** | PostgreSQL URL |
| `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` | For real text agents | Without keys, agent stages use **placeholder** artifacts |
| `OPENAI_API_KEY` and/or `GEMINI_API_KEY` / `GOOGLE_API_KEY` | For visual generation | See `OPENAI_IMAGE_MODEL`, `GEMINI_IMAGE_MODEL` |
| `STORAGE_ROOT` | Recommended in deploy | Absolute path to a **persistent** directory for generated images (default: `./storage` under cwd) |

**Strict validation (recommended for private prod):**

- `AGENTICFORCE_STRICT_ENV=1` — fail **production** startup if `DATABASE_URL` is invalid; require LLM keys; warn on missing image keys / `STORAGE_ROOT`.
- `AGENTICFORCE_REQUIRE_IMAGE_GEN=1` — fail startup if no image provider keys are set.

**Escape hatches:**

- `AGENTICFORCE_SKIP_ENV_VALIDATION=1` — skip `instrumentation.ts` checks (CI image builds, local experiments).
- In **development**, invalid env logs an error but the dev server still starts (fix `.env` or use skip flag).

### 3. Install and build

```bash
npm ci
npm run build
```

`postinstall` runs `prisma generate`. The build does **not** require `DATABASE_URL` at compile time.

### 4. Migrations (must run before `next start`)

```bash
npm run db:migrate:deploy
```

This runs `prisma migrate deploy` against `DATABASE_URL`. **Never** assume migrations applied themselves.

**Fresh database:** all migrations under `prisma/migrations/` apply in order.

**Existing DB from an older revision:** deploy the app version whose migrations you trust, then run `db:migrate:deploy` once per release.

### 5. Pre-flight check (optional CI)

```bash
npm run env:check
```

Uses the same rules as server startup validation (requires `dotenv` + `tsx` via `npx`).

**Dev machine readiness (DB + storage + migrations hint + keys):**

```bash
npm run preflight
```

### 5b. Optional: seed internal test lab + briefs

```bash
npx prisma db seed
```

Creates client **`[INTERNAL] AgenticForce test lab`** and five `[TEST]` briefs (idempotent).

### 6. Run

```bash
npm run start
```

---

## Docker (private dev or staging server)

For a **single host** with Postgres + the app in containers (no local Node install on the machine beyond Docker):

1. Clone the repo and ensure a `.env` at the repo root if you need LLM or image keys (optional for placeholder-only runs). `DATABASE_URL` inside Compose is set for the bundled Postgres; do not override it unless you point at an external database.
2. From the repo root:

```bash
docker compose --profile dev-server up -d --build
```

Or equivalently: `npm run dev:docker` (foreground with logs; add `-d` yourself if you prefer detached).

3. Open **http://localhost:3000** (or the host’s IP on port 3000). The app image runs **`prisma migrate deploy`** on each container start, then **`next start`** (standalone build).

**Volumes:** Postgres data uses `agenticforce_pgdata`; generated visual assets use `agenticforce_storage` at `/data/storage` in the app container (`STORAGE_ROOT`).

**Build-only CI:** `docker build -t agenticforce .` — the Dockerfile sets `AGENTICFORCE_SKIP_ENV_VALIDATION=1` for `next build` so `DATABASE_URL` is not required at image build time.

---

## Health checks

- `GET /api/health` — env validation summary (no DB).
- `GET /api/health?deep=1` — env + `SELECT 1` (503 if DB down).

---

## Storage

- Generated **visual assets** are written under `{STORAGE_ROOT or ./storage}/visual-assets/`.
- Set **`STORAGE_ROOT`** to a mounted volume in Docker/Kubernetes so images survive restarts.
- File reads use **`resolveVisualAssetAbsolutePath`** to block path traversal.

Future: swap the storage module for S3/GCS without changing orchestration code.

---

## Observability

Structured logs on stderr:

- `[agenticforce:env]` — startup validation
- `[agenticforce:provider]` — JSON lines for LLM + image calls (`kind`, `providerId`, `model`, `durationMs`, `ok`, `error`, optional `fallback`)
- `[agenticforce:export]` — export failures
- `[agenticforce:health]` — DB check failures

---

## Common failure modes

| Symptom | Likely cause |
|---------|----------------|
| Process exits on boot in production | `DATABASE_URL` missing/invalid, or `AGENTICFORCE_STRICT_ENV` + missing keys |
| Agents always placeholders | No `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` |
| Visual generate errors in Studio | Missing image keys; hit provider rate limits — see `[agenticforce:provider]` logs |
| Images 404 after redeploy | `STORAGE_ROOT` not on persistent disk |
| Prisma errors on start | Migrations not run; wrong `DATABASE_URL`; DB unreachable |

---

## What is intentionally not production-ready

- No end-user **authentication** or tenant isolation (Studio trusts `clientId` in URLs/actions).
- Visual asset files are served with **`?clientId=`** gate only — not a security boundary.
- No rate limiting, no queue workers, no CDN for assets.
- No SLA guarantees on external APIs (OpenAI, Google, Anthropic).

For **private internal testing**, run behind a VPN or IP allowlist, use strong secrets rotation, and persist `STORAGE_ROOT` + Postgres.
