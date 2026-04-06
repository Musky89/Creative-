# Record a full UI walkthrough (video)

This repo cannot ship a pre-recorded MP4 from the cloud agent: **you generate the video locally** (or in CI) using Playwright, which captures **one video file per test**.

## Prerequisites

1. **PostgreSQL** with schema applied: `npm run db:migrate:deploy`
2. **`.env`** with valid `DATABASE_URL` (and optional LLM keys if you want real agent output later)
3. **Dev or production server** reachable at `http://127.0.0.1:3000` (or set `PLAYWRIGHT_BASE_URL`)

## One-time browser install

```bash
npx playwright install chromium
```

## Record the walkthrough

Terminal 1 — start the app:

```bash
npm run dev
```

Terminal 2 — run tests (videos land under `test-results/`):

```bash
npm run test:e2e
```

After a successful run, open **`test-results/`** and find the **`.webm`** next to the test name (e.g. `full walkthrough: all routes + studio`).

Convert to MP4 if needed (optional):

```bash
ffmpeg -i test-results/.../video.webm -c:v libx264 -crf 23 walkthrough.mp4
```

## What the suite covers

| Area | Covered |
|------|---------|
| Always | `/`, `GET /api/health` |
| No DB | `/clients` shows database notice |
| With DB | New client → Brand Bible save → Service Blueprint save → New brief (identity on) → Studio → Initialize workflow → Export panel + identity ZIP link → Internal testing page → `GET /api/health?deep=1` |

It does **not** exhaust every agent stage, every export format, or image generation (those need API keys and long runs). Extend `e2e/app-walkthrough.spec.ts` as needed.

## CI

Set `PLAYWRIGHT_BASE_URL` to your preview URL and run `npm run test:e2e` after `npm run build && npm run start`.
