/**
 * Feature gate for the experimental Agentic Creative OS surface.
 * When disabled, routes should not be reachable (404) — no impact on rest of app.
 */
export function isAgenticCreativeOsEnabled(): boolean {
  return process.env.AGENTIC_CREATIVE_OS_ENABLED === "1" || process.env.AGENTIC_CREATIVE_OS_ENABLED === "true";
}
