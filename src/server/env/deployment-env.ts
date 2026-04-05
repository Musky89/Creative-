/**
 * Deployment / runtime environment validation.
 * Called from Next.js instrumentation (server startup) and optionally from health checks.
 */

export type EnvValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

function isPostgresUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u.startsWith("postgresql://") || u.startsWith("postgres://");
}

/**
 * Strict mode: AGENTICFORCE_STRICT_ENV=1 (recommended for private deploys).
 * Skip all validation: AGENTICFORCE_SKIP_ENV_VALIDATION=1 (e.g. CI build-only).
 */
export function validateDeploymentEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (process.env.AGENTICFORCE_SKIP_ENV_VALIDATION === "1") {
    return { ok: true, errors: [], warnings: ["AGENTICFORCE_SKIP_ENV_VALIDATION=1 — env validation skipped."] };
  }

  const db = process.env.DATABASE_URL?.trim();
  if (!db) {
    errors.push(
      "DATABASE_URL is missing. Set a PostgreSQL connection string (see docs/DEPLOYMENT.md).",
    );
  } else if (!isPostgresUrl(db)) {
    errors.push(
      "DATABASE_URL must be a postgresql:// or postgres:// URL. Prisma is configured for PostgreSQL only.",
    );
  }

  const strict = process.env.AGENTICFORCE_STRICT_ENV === "1";

  const hasOpenai = !!process.env.OPENAI_API_KEY?.trim();
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY?.trim();
  if (strict && !hasOpenai && !hasAnthropic) {
    errors.push(
      "AGENTICFORCE_STRICT_ENV=1 but neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is set — text agents will only produce placeholders.",
    );
  } else if (!hasOpenai && !hasAnthropic) {
    warnings.push(
      "No LLM API keys configured — STRATEGY/CONCEPT/COPY/REVIEW agents will use placeholder artifacts until OPENAI_API_KEY or ANTHROPIC_API_KEY is set.",
    );
  }

  if (process.env.AGENTICFORCE_REQUIRE_IMAGE_GEN === "1") {
    const hasGemini =
      !!process.env.GEMINI_API_KEY?.trim() || !!process.env.GOOGLE_API_KEY?.trim();
    if (!hasOpenai && !hasGemini) {
      errors.push(
        "AGENTICFORCE_REQUIRE_IMAGE_GEN=1 but no image provider keys: set OPENAI_API_KEY (DALL·E) and/or GEMINI_API_KEY or GOOGLE_API_KEY (Imagen).",
      );
    }
  }

  if (strict) {
    const hasGemini =
      !!process.env.GEMINI_API_KEY?.trim() || !!process.env.GOOGLE_API_KEY?.trim();
    if (!hasOpenai && !hasGemini) {
      warnings.push(
        "AGENTICFORCE_STRICT_ENV=1: no image keys — Studio visual generation will error until OPENAI_API_KEY or GEMINI_API_KEY/GOOGLE_API_KEY is set.",
      );
    }
    if (!process.env.STORAGE_ROOT?.trim()) {
      warnings.push(
        "AGENTICFORCE_STRICT_ENV=1: STORAGE_ROOT unset — persist ./storage or set STORAGE_ROOT to a mounted volume for visual assets.",
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function assertDeploymentEnvOrThrow(): void {
  const r = validateDeploymentEnv();
  for (const w of r.warnings) {
    console.warn(`[agenticforce:env] ${w}`);
  }
  if (!r.ok) {
    const msg = r.errors.join("\n");
    console.error(`[agenticforce:env] Configuration errors:\n${msg}`);
    throw new Error(`AgenticForce env validation failed:\n${msg}`);
  }
}
