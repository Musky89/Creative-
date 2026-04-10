/** When false, standalone routes 404 — no effect on rest of app. */
export function isStandaloneAgenticOsEnabled(): boolean {
  const v = process.env.STANDALONE_AGENTIC_OS_ENABLED;
  return v === "1" || v === "true";
}
