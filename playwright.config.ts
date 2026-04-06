import { defineConfig, devices } from "@playwright/test";

/**
 * Full UI walkthrough with **video** recording.
 *
 * Run (with app already on PLAYWRIGHT_BASE_URL, DB migrated):
 *   npx playwright install chromium
 *   npm run test:e2e
 *
 * Outputs: `test-results/` (videos + traces on failure).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    video: "on",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
