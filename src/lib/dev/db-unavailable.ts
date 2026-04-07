function prismaUnreachableCodes(code: unknown): boolean {
  if (typeof code !== "string") return false;
  // Connection / engine: P1001 / P1000 / P1017. Driver adapter (pg): ECONNREFUSED.
  // Schema drift (migrations not applied): P2021 table missing, P2022 column missing.
  return (
    code === "P1001" ||
    code === "P1000" ||
    code === "P1017" ||
    code === "ECONNREFUSED" ||
    code === "P2021" ||
    code === "P2022"
  );
}

/**
 * Detect failures that usually mean Postgres is down, wrong DATABASE_URL, or unreachable.
 * Used to show a dev-friendly page instead of a generic Next.js error overlay.
 */
export function isDatabaseLikelyUnavailableError(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    prismaUnreachableCodes((error as { code: unknown }).code)
  ) {
    return true;
  }
  if (!(error instanceof Error)) return false;
  const m = error.message;
  return (
    m.includes("DATABASE_URL is not set") ||
    m.includes("Can't reach database server") ||
    m.includes("P1001") ||
    m.includes("P1017") ||
    m.includes("P2021") ||
    m.includes("P2022") ||
    m.includes("ECONNREFUSED") ||
    m.includes("connect ECONNREFUSED") ||
    /server closed the connection/i.test(m) ||
    /does not exist in the current database/i.test(m) ||
    /relation ".*" does not exist/i.test(m) ||
    /column ".*" does not exist/i.test(m)
  );
}
