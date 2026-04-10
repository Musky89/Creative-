/**
 * Smoke test for Standalone Agentic OS API (no legacy imports).
 * Usage:
 *   STANDALONE_AGENTIC_OS_ENABLED=1 APP_BASE_URL=http://localhost:3000 npx tsx scripts/test-standalone-agentic-os.ts
 */

const base = process.env.APP_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

async function main() {
  const health = await fetch(`${base}/api/standalone-agentic-os/health`);
  if (health.status === 404) {
    console.error("FAIL: health 404 — set STANDALONE_AGENTIC_OS_ENABLED=1 and restart dev server.");
    process.exit(1);
  }
  if (!health.ok) {
    console.error("FAIL: health", health.status);
    process.exit(1);
  }
  console.log("OK health", await health.json());

  const ds = await fetch(`${base}/api/standalone-agentic-os/dataset`);
  if (!ds.ok) {
    console.error("FAIL: dataset", ds.status);
    process.exit(1);
  }
  const data = (await ds.json()) as {
    seedPackLabel: string;
    brandCount: number;
    campaignCount: number;
    channelCount: number;
    brands: { id: string }[];
    campaigns: { id: string; brandId: string }[];
  };
  console.log("OK dataset", {
    label: data.seedPackLabel,
    brands: data.brandCount,
    campaigns: data.campaignCount,
    channels: data.channelCount,
  });

  if (data.brandCount < 4 || data.campaignCount < 8 || data.channelCount < 5) {
    console.error("FAIL: expected full seed (4+ brands, 8+ campaigns, 5+ channels)");
    process.exit(1);
  }

  const brandId = data.brands[0]!.id;
  const campaign = data.campaigns.find((c) => c.brandId === brandId);
  if (!campaign) {
    console.error("FAIL: no campaign for first brand");
    process.exit(1);
  }

  const run = await fetch(`${base}/api/standalone-agentic-os/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandId, campaignId: campaign.id, maxRevisions: 1 }),
  });
  const runBody = await run.json();
  if (!run.ok) {
    console.error("FAIL: run case", run.status, runBody);
    process.exit(1);
  }
  console.log("OK case", {
    id: runBody.case?.id,
    verificationPassed: runBody.case?.verification?.passed,
    critic: runBody.case?.critic?.overall,
  });
  console.log("\nAll checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
