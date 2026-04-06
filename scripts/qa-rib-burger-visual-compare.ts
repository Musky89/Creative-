/**
 * End-to-end QA: McDonald's vs KFC-style demo rib-burger LTO briefs → prompt package → image.
 *
 * Requires: DATABASE_URL, migrated DB, OPENAI_API_KEY and/or GEMINI_API_KEY|GOOGLE_API_KEY,
 * text LLM keys for the orchestrator (same as normal Studio flow).
 *
 *   npx tsx scripts/qa-rib-burger-visual-compare.ts
 */
import "dotenv/config";
import { getPrisma } from "../src/server/db/prisma";
import { orchestrator } from "../src/server/orchestrator/orchestrator-service";
import { stageOrderIndex } from "../src/server/orchestrator/v1-pipeline";
import { generateVisualVariantsFromPromptPackageDefaultDb } from "../src/server/visual-generation/generate-visual-asset-from-prompt-package";
import { seedDemoBrandsIfMissing } from "../src/server/onboarding/seed-demo-brands";

async function driveWorkflowToEnd(briefId: string, identityFlow: boolean) {
  const maxSteps = 80;
  const log: string[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const state = await orchestrator.getWorkflowState(briefId);
    const exportTask = state.tasks.find((t) => t.stage === "EXPORT");
    if (exportTask?.status === "COMPLETED") {
      log.push("EXPORT completed.");
      return { ok: true as const, log };
    }

    const awaiting = state.tasks
      .filter((t) => t.status === "AWAITING_REVIEW")
      .sort(
        (a, b) =>
          stageOrderIndex(a.stage, identityFlow) -
          stageOrderIndex(b.stage, identityFlow),
      );
    if (awaiting.length > 0) {
      const t = awaiting[0]!;
      await orchestrator.approveTask(t.id, "QA rib-burger compare", "qa-script");
      log.push(`Approved ${t.stage}`);
      continue;
    }

    if (state.nextExecutableTaskIds.length === 0) {
      return { ok: false as const, log, state };
    }

    const exec = await orchestrator.executeNextReadyTask(briefId);
    log.push(
      `Executed ${exec.taskId} placeholder=${exec.usedPlaceholder}`,
    );
  }
  return { ok: false as const, log };
}

async function main() {
  const prisma = getPrisma();
  await prisma.$connect();

  const ids = await seedDemoBrandsIfMissing();
  console.log("[rib-compare] Seeded / ensured demo clients + rib briefs.");

  for (const [label, briefId, clientId, identity] of [
    ["McDonald's rib LTO", ids.mcdonaldsRibBriefId, ids.mcdonaldsClientId, false],
    ["KFC-style rib LTO", ids.kfcRibBriefId, ids.kfcStyleClientId, false],
  ] as const) {
    console.log(`\n[rib-compare] --- ${label} ---`);
    const run = await driveWorkflowToEnd(briefId, identity);
    run.log.forEach((l) => console.log("   ", l));
    if (!run.ok) {
      console.error(`[rib-compare] Workflow incomplete for ${label}`);
      continue;
    }

    const pkg = await prisma.artifact.findFirst({
      where: {
        type: "VISUAL_PROMPT_PACKAGE",
        task: { briefId },
      },
      orderBy: { version: "desc" },
    });
    if (!pkg) {
      console.error(`[rib-compare] No VISUAL_PROMPT_PACKAGE for ${label}`);
      continue;
    }

    const batch = await generateVisualVariantsFromPromptPackageDefaultDb({
      promptPackageArtifactId: pkg.id,
      clientId,
      briefId,
      providerTarget: "GENERIC",
      variantCount: 1,
    });
    const gen = batch.results.find((r) => r.status === "COMPLETED") ?? batch.results[0]!;
    const studio = `/clients/${clientId}/briefs/${briefId}/studio#studio-image-generation`;
    console.log(`[rib-compare] Image: ${gen.status}${gen.error ? ` — ${gen.error}` : ""}`);
    if (gen.status === "COMPLETED") {
      console.log(`[rib-compare] File URL (dev): http://localhost:3000/api/visual-assets/${gen.id}/file`);
    }
    console.log(`[rib-compare] Studio: http://localhost:3000${studio}`);
  }

  await prisma.$disconnect();
  console.log("\n[rib-compare] Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
