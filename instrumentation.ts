/**
 * Next.js server startup hook — validates env before serving traffic.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.AGENTICFORCE_SKIP_ENV_VALIDATION === "1") {
    return;
  }

  // `next build` often runs without DATABASE_URL (e.g. Docker build stage). Validate at runtime instead.
  if (process.env.npm_lifecycle_event === "build") {
    return;
  }

  const { assertDeploymentEnvOrThrow } = await import(
    "@/server/env/deployment-env"
  );

  try {
    assertDeploymentEnvOrThrow();
  } catch (e) {
    // In development, log loudly but allow `next dev` to start so engineers can fix .env
    if (process.env.NODE_ENV !== "production") {
      console.error(e);
      console.warn(
        "[agenticforce:env] Continuing in dev despite validation failure. Fix env or set AGENTICFORCE_SKIP_ENV_VALIDATION=1.",
      );
      return;
    }
    throw e;
  }
}
