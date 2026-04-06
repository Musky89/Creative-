import { test, expect, type Page } from "@playwright/test";

let databaseAvailable = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/clients");
  const text = await res.text();
  databaseAvailable = !text.includes("Database unreachable");
});

async function fillBriefForm(page: Page) {
  await page.getByLabel(/^Title$/).fill("E2E walkthrough brief");
  await page.getByLabel("Business objective").fill("Grow awareness in test market.");
  await page.getByLabel("Communication objective").fill("Explain the product clearly.");
  await page.getByLabel("Target audience").fill("Founders and marketing leads.");
  await page.getByLabel("Key message").fill("Structured creative workflow wins.");
  await page.getByLabel("Deliverables requested").fill("Campaign concepts\nKey visual");
  await page.getByLabel(/^Tone$/).fill("Confident, direct");
  await page.getByLabel("Constraints").fill("No competitor names");
  await page.locator("#deadline").fill("2026-12-31T12:00");
  await page.getByLabel(/Identity workflow/).check();
}

test("smoke: home + API health (always)", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  const j = (await health.json()) as { ok?: boolean };
  expect(j.ok).toBe(true);
});

test("smoke: clients page without DB", async ({ page }) => {
  test.skip(databaseAvailable, "Only when Postgres is down");
  await page.goto("/clients");
  await expect(page.getByText("Database unreachable")).toBeVisible();
});

test("full walkthrough: all routes + studio (requires Postgres)", async ({
  page,
}) => {
  test.skip(!databaseAvailable, "Set DATABASE_URL, run npm run db:migrate:deploy, start dev server");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.getByRole("link", { name: "New client" }).click();
  await expect(page).toHaveURL(/\/clients\/new$/);

  await page.getByLabel("Name", { exact: true }).fill("Playwright Test Co");
  await page.getByLabel("Industry").fill("Software");
  await page.getByRole("button", { name: "Create client" }).click();
  await expect(page).not.toHaveURL(/\/clients\/new$/);
  const clientUrl = page.url();
  const clientId = clientUrl.match(/\/clients\/([^/]+)$/)?.[1];
  expect(clientId).toBeTruthy();

  await page.goto(`/clients/${clientId}/brand-bible`);
  await expect(
    page.getByRole("heading", { name: /Brand Bible & Brand OS/i }),
  ).toBeVisible();
  await page.getByLabel("Positioning").fill("Premium workflow OS for creative founders.");
  await page.getByLabel("Target audience").fill("Solo founders and small agencies.");
  await page.getByLabel("Tone of voice").fill("Direct, calm, precise.");
  await page.getByLabel(/Messaging pillars/i).fill("Strategy before pixels\nReview gates matter");
  await page.getByRole("button", { name: /Save Brand Bible/i }).click();
  await expect(page.getByText("Saved.").first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`/clients/${clientId}/service-blueprint`);
  await expect(page.getByRole("heading", { name: "Service Blueprint" })).toBeVisible();
  await page.getByLabel(/Active services/i).fill("Full pipeline\nCreative QA");
  await page.getByRole("button", { name: /Save Service Blueprint/i }).click();
  await expect(page.getByText("Saved.").first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`/clients/${clientId}/briefs`);
  await expect(page.getByRole("heading", { name: "Briefs" })).toBeVisible();
  await page.getByRole("link", { name: "New brief" }).click();
  await expect(page).toHaveURL(/\/briefs\/new$/);

  await fillBriefForm(page);
  await page.getByRole("button", { name: "Create brief" }).click();
  await expect(page).toHaveURL(/\/briefs\/[^/]+\/edit$/);
  const briefEditUrl = page.url();
  const briefId = briefEditUrl.match(/\/briefs\/([^/]+)\/edit/)?.[1];
  expect(briefId).toBeTruthy();

  await page.getByRole("link", { name: /open studio/i }).click();
  await expect(page).toHaveURL(/\/studio$/);

  const init = page.getByRole("button", { name: /initialize workflow/i });
  if (await init.isVisible()) {
    await init.click();
  }
  await expect(
    page.getByRole("button", { name: /run next step/i }),
  ).toBeVisible({ timeout: 25_000 });

  const exportSummary = page.locator("summary").filter({ hasText: "Export" });
  if ((await exportSummary.count()) > 0) {
    await exportSummary.first().click();
    await expect(
      page.getByRole("link", { name: /download zip package/i }),
    ).toBeVisible();
  }

  await page.goto(`/clients/${clientId}/internal-testing`);
  await expect(
    page.getByRole("heading", { name: /Internal testing & evaluation/i }),
  ).toBeVisible();

  const deep = await page.request.get("/api/health?deep=1");
  expect([200, 503]).toContain(deep.status());
});
