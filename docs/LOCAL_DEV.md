# Local & private dev bring-up

Single path to get AgenticForce running on your machine for honest end-to-end testing.

## Prerequisites

- **Node.js 20+** (matches typical Next.js 15 setups)
- **npm**
- **PostgreSQL** reachable from your machine — the app **cannot** run workflows or Studio data without it. Pick one:
  - **Option A — No local DB install:** Create a **free hosted Postgres** (e.g. [Neon](https://neon.tech), Supabase, Railway), copy the `postgresql://…` URL into `.env` as `DATABASE_URL`, then `npm run db:migrate:deploy`. Your laptop only runs Node.
  - **Option B:** Docker + repo `docker-compose.yml` (local Postgres in a container).
  - **Option C:** Local Postgres install (Homebrew, Postgres.app, Linux packages, RDS, etc.)

## 1. Install dependencies

```bash
git clone <your-fork-or-remote> agenticforce
cd agenticforce
npm install
```

`postinstall` runs `prisma generate`.

## 2. Environment file

```bash
cp .env.example .env
```

Edit `.env`:

- Set **`DATABASE_URL`** to match your Postgres (see `.env.example` comments).
- For **Docker Compose** defaults, leave the example URL as-is after starting Compose.

Add **`OPENAI_API_KEY`** and/or **`ANTHROPIC_API_KEY`** when you want real agent output (not placeholders).

Add image keys when testing **Studio → Generate visual asset** (see `.env.example`).

## 3. Start PostgreSQL

### Option A — Docker (recommended for consistency)

From the repo root:

```bash
docker compose up -d
```

Wait until healthy (`docker compose ps`). Default: `localhost:5432`, db `agenticforce`, user/password `postgres`/`postgres`.

### Option B — Your own Postgres

Create a database and user, then set `DATABASE_URL` accordingly.

## 4. Migrations

Apply schema to the database (required before the app can load data):

```bash
npm run db:migrate:deploy
```

For active local schema iteration, some teams use `npm run db:migrate` instead (creates dev migrations); for **matching production**, prefer `db:migrate:deploy` against a throwaway local DB.

## 5. Preflight (recommended)

```bash
npm run preflight
```

This checks: env shape, **DB connectivity**, **migration table**, **writable storage**, and warns on missing LLM/image keys.

### Verify TypeScript and lint (optional)

```bash
npm run typecheck
npm run lint
```

`typecheck` runs `tsc` without incremental reuse so it does not break if `.next` was deleted after a build.

## 6. Bootstrap realistic QA data (optional)

Creates two premium-style clients, Brand Bibles, blueprints, briefs (campaign + identity), runs both workflows to **EXPORT**, and attempts one visual generation if a prompt package exists:

```bash
npm run qa:bootstrap
```

Requires LLM keys for real text; without them you still get **placeholder** artifacts but the **pipeline mechanics** are validated.

## 7. Start the dev server

```bash
npm run dev
```

Open **http://localhost:3000**.

- If the DB is down, the **dashboard** shows **Database unreachable** with fix steps instead of a raw 500.
- **`GET /api/health`** — env-only check  
- **`GET /api/health?deep=1`** — includes `SELECT 1` (503 if DB down)

## 8. First honest founder pass

Follow **[docs/FOUNDER_WALKTHROUGH.md](./FOUNDER_WALKTHROUGH.md)** for click paths, what to verify, and demo capture points.

Broader smoke items: **[docs/PRIVATE_TESTING_CHECKLIST.md](./PRIVATE_TESTING_CHECKLIST.md)**.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `P1001` / ECONNREFUSED | Start Postgres; confirm `DATABASE_URL` host/port |
| `npm run preflight` fails on DB | Same as above |
| Dashboard shows amber “Database unreachable” | Same as above |
| Agents always placeholders | Set `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` |
| Visual gen fails | Set image keys; ensure `STORAGE_ROOT` writable |
| `relation does not exist` | Run `npm run db:migrate:deploy` |

## Production-style run (optional)

```bash
npm run build
npm run start
```

Use the same `.env` and migrated DB.
