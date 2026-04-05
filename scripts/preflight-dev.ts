#!/usr/bin/env npx tsx
/**
 * Dev readiness check: env, DB connectivity, storage writable, optional providers.
 * Run: npm run preflight
 *
 * Exit 0 = ready for migrate + dev server; non-zero = fix listed items.
 */
import "dotenv/config";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { validateDeploymentEnv } from "../src/server/env/deployment-env";
import { getPrisma } from "../src/server/db/prisma";

function fail(msg: string): never {
  console.error(`[preflight] FAIL: ${msg}`);
  process.exit(1);
}

function warn(msg: string) {
  console.warn(`[preflight] WARN: ${msg}`);
}

function ok(msg: string) {
  console.log(`[preflight] OK: ${msg}`);
}

async function main() {
  console.log("[preflight] AgenticForce dev readiness\n");

  const env = validateDeploymentEnv();
  for (const w of env.warnings) {
    warn(w);
  }
  if (!env.ok) {
    for (const e of env.errors) {
      console.error(`  - ${e}`);
    }
    fail("Fix env validation errors (see .env.example).");
  }
  ok("Core env validation passed (DATABASE_URL present and postgres:// URL).");

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) fail("DATABASE_URL is empty.");

  const prisma = getPrisma();
  try {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[preflight] Database error: ${msg}`);
      fail(
        "Cannot connect to PostgreSQL. Start the server (e.g. docker compose up -d), check DATABASE_URL, then retry.",
      );
    }
    ok("PostgreSQL reachable (SELECT 1).");

    try {
      const rows = await prisma.$queryRaw<{ applied_steps_count: bigint }[]>`
        SELECT COUNT(*)::bigint AS applied_steps_count FROM "_prisma_migrations"
      `;
      const n = Number(rows[0]?.applied_steps_count ?? 0);
      if (n === 0) {
        warn(
          'No rows in "_prisma_migrations" — run: npm run db:migrate:deploy (fresh DB).',
        );
      } else {
        ok(`Prisma migrations table has ${n} applied migration(s).`);
      }
    } catch {
      warn(
        'Could not read "_prisma_migrations" — if this is a brand-new DB, run npm run db:migrate:deploy.',
      );
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  const storageRoot = process.env.STORAGE_ROOT?.trim()
    ? resolve(process.env.STORAGE_ROOT.trim())
    : resolve(process.cwd(), "storage");
  try {
    if (!existsSync(storageRoot)) {
      mkdirSync(storageRoot, { recursive: true });
    }
    const probe = join(storageRoot, `.preflight-write-${process.pid}`);
    writeFileSync(probe, "ok", "utf8");
    unlinkSync(probe);
    ok(`Storage root writable: ${storageRoot}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail(`Cannot write to STORAGE_ROOT (${storageRoot}): ${msg}`);
  }

  const hasOpenai = !!process.env.OPENAI_API_KEY?.trim();
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY?.trim();
  if (!hasOpenai && !hasAnthropic) {
    warn(
      "No OPENAI_API_KEY / ANTHROPIC_API_KEY — agent stages will use placeholder artifacts.",
    );
  } else {
    ok("At least one text LLM key is set.");
  }

  const hasGemini =
    !!process.env.GEMINI_API_KEY?.trim() || !!process.env.GOOGLE_API_KEY?.trim();
  if (!hasOpenai && !hasGemini) {
    warn(
      "No image provider keys — Studio visual generation will fail until OPENAI_API_KEY or GEMINI_API_KEY/GOOGLE_API_KEY is set.",
    );
  } else if (hasOpenai || hasGemini) {
    ok("Image generation keys present (OpenAI and/or Gemini/Google).");
  }

  console.log("\n[preflight] All required checks passed. Next: npm run qa:bootstrap (optional), npm run dev");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
