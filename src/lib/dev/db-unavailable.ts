/**
 * Detect failures that usually mean Postgres is down, wrong DATABASE_URL, or unreachable.
 * Used to show a dev-friendly page instead of a generic Next.js error overlay.
 */
export function isDatabaseLikelyUnavailableError(error: unknown): boolean {
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
