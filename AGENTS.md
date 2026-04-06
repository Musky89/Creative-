# AgenticForce

## Cursor Cloud specific instructions

### Architecture

Single-service Next.js 15 monolith (App Router + Turbopack) backed by PostgreSQL 16. No microservices, no Redis, no message queues. Prisma 7 is the ORM; generated client lives at `src/generated/prisma` (gitignored, regenerated on `npm install` via `postinstall`).

### Services

| Service | How to start | Port |
|---------|-------------|------|
| PostgreSQL | `docker compose up -d` | 5432 |
| Next.js dev | `npm run dev` | 3000 |

### Key commands

Standard scripts are in `package.json`. The most used:

- **Lint:** `npm run lint`
- **Typecheck:** `npm run typecheck`
- **Migrations:** `npm run db:migrate:deploy`
- **Preflight (env + DB + storage check):** `npm run preflight`
- **Dev server:** `npm run dev`
- **Seed QA data:** `npm run qa:bootstrap`
- **Seed demo brands:** `npm run seed:demo-brands`
- **E2E tests:** `npm run test:e2e` (requires `npx playwright install chromium` first)
- **Health check:** `curl http://localhost:3000/api/health?deep=1`

### Non-obvious caveats

- **Docker-in-Docker:** The Cloud Agent VM requires `fuse-overlayfs` storage driver and `iptables-legacy` for Docker to work. Docker daemon must be started manually: `sudo dockerd &`. Socket permissions may need `sudo chmod 666 /var/run/docker.sock`.
- **Prisma config:** Prisma 7 reads the datasource URL from `prisma.config.ts` (not `schema.prisma`). The `DATABASE_URL` env var must be set before any Prisma command.
- **No auth:** The app has no authentication in v1. All pages are accessible directly.
- **LLM keys optional:** Without `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, agent tasks produce labeled placeholder artifacts. The app is fully functional for workflow/pipeline testing without LLM keys.
- **`.env` from `.env.example`:** Copy once. Default `DATABASE_URL` matches `docker-compose.yml` defaults (`postgres:postgres@localhost:5432/agenticforce`).
- **`typecheck` uses `--incremental false`:** This avoids stale `.next` incremental refs breaking CI.
- **E2E test selector:** The `/clients/new` page has both an AI onboard panel and a manual form. When targeting form fields by label in tests, use `{ exact: true }` to disambiguate (e.g. `getByLabel("Name", { exact: true })`).

### Documentation

See `docs/LOCAL_DEV.md` for full first-time setup, `docs/FOUNDER_WALKTHROUGH.md` for demo click paths.
