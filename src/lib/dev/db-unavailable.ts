function prismaUnreachableCodes(code: unknown): boolean {
  if (typeof code !== "string") return false;
  // Prisma engine: P1001 / P1000 / P1017. Driver adapter (pg): may surface as ECONNREFUSED.
  return (
    code === "P1001" ||
    code === "P1000" ||
    code === "P1017" ||
    code === "ECONNREFUSED"
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
    m.includes("Can't reach database server") ||
    m.includes("P1001") ||
    m.includes("P1017") ||
    m.includes("ECONNREFUSED") ||
    m.includes("connect ECONNREFUSED") ||
    /server closed the connection/i.test(m)
  );
}
