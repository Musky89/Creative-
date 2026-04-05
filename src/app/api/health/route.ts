import { NextResponse } from "next/server";
import { validateDeploymentEnv } from "@/server/env/deployment-env";
import { getPrisma } from "@/server/db/prisma";

/**
 * Liveness: no DB required.
 * Readiness: optional ?deep=1 runs SELECT 1 (fails if DATABASE_URL wrong).
 */
export async function GET(req: Request) {
  const env = validateDeploymentEnv();
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1";

  if (!deep) {
    return NextResponse.json({
      ok: env.ok,
      envOk: env.ok,
      envErrors: env.errors,
      envWarnings: env.warnings,
    });
  }

  if (!env.ok) {
    return NextResponse.json(
      {
        ok: false,
        envOk: false,
        envErrors: env.errors,
        envWarnings: env.warnings,
        dbOk: false,
      },
      { status: 503 },
    );
  }

  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      envOk: true,
      envWarnings: env.warnings,
      dbOk: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[agenticforce:health] DB check failed:", msg);
    return NextResponse.json(
      {
        ok: false,
        envOk: true,
        envWarnings: env.warnings,
        dbOk: false,
        error: "Database unreachable. Check DATABASE_URL and network.",
      },
      { status: 503 },
    );
  }
}
