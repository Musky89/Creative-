/**
 * Private dev QA: seed two realistic clients + briefs, drive orchestrator via API surface.
 *
 * Run (requires DATABASE_URL + migrated DB):
 *   npx tsx scripts/private-dev-qa-bootstrap.ts
 *
 * Optional: APP_BASE_URL=http://localhost:3000 to hit HTTP health after seed (dev server must be up).
 */
import "dotenv/config";
import { createClient } from "../src/server/domain/clients";
import { createBrief } from "../src/server/domain/briefs";
import {
  upsertBrandBible,
  type BrandBibleFormInput,
} from "../src/server/domain/brand-bible";
import {
  upsertServiceBlueprint,
  type ServiceBlueprintFormInput,
} from "../src/server/domain/service-blueprint";
import { getPrisma } from "../src/server/db/prisma";
import { orchestrator } from "../src/server/orchestrator/orchestrator-service";
import {
  buildV1PipelineRows,
  stageOrderIndex,
} from "../src/server/orchestrator/v1-pipeline";
import { generateVisualAssetFromPromptPackageDefaultDb } from "../src/server/visual-generation/generate-visual-asset-from-prompt-package";

const RETAIL_CLIENT = {
  name: "Loom & Lumen Atelier",
  industry: "Premium home textiles & fabric retail",
};

const IDENTITY_CLIENT = {
  name: "Verdant Circuit Skincare",
  industry: "Science-forward skincare (new brand launch)",
};

const deadline = new Date("2026-08-15T17:00:00.000Z");

function retailBrandBible(): BrandBibleFormInput {
  return {
    positioning:
      "Loom & Lumen is a quiet-luxury textile studio for people who treat fabric as architecture: drape, hand, and longevity over trend cycles. We sell limited-run yardage, made-to-order drapery, and heirloom-weight bedding for design-led homes.",
    targetAudience:
      "Interior designers and affluent homeowners (35–60) who specify natural fibers, care about provenance, and reject fast-fashion interiors. They read shelter magazines, hire pros for installs, and buy fewer, better pieces.",
    toneOfVoice:
      "Warm precision. Confident without shouting. Sensory where it helps decision-making (hand, weight, drape), never purple prose. We sound like a senior stylist whispering the right choice — not a clearance banner.",
    messagingPillars: [
      "Fiber truth first — origin, weave, and care spelled out",
      "Light as a design material — how cloth changes a room across the day",
      "Made to live in — performance without sacrificing tactility",
    ],
    visualIdentity: [
      "Natural light, shallow depth, tactile macro of weave",
      "Restrained palette: chalk, oat, graphite, one restrained accent",
      "Typography: refined serif for titles, humanist sans for specs",
    ],
    channelGuidelines: [
      "Site: editorial grids, swatch-first PDPs, slow scroll storytelling",
      "Email: one idea per send — drape lesson, care guide, designer spotlight",
      "Social: process and material honesty; no meme tone",
    ],
    mandatoryInclusions: [
      "Fiber content and origin on every product page",
      "Care instructions that match real laundry behavior",
    ],
    thingsToAvoid: [
      "Fake scarcity countdowns",
      "Stock loft clichés (“live laugh love” energy)",
      "Over-promising stain immunity on natural fibers",
    ],
    vocabularyStyle: "ELEVATED",
    sentenceStyle: "MEDIUM",
    bannedPhrases: [
      "best-in-class",
      "luxury experience",
      "elevate your lifestyle",
      "artisanal magic",
    ],
    preferredPhrases: [
      "hand and drape",
      "fiber-forward",
      "light-quiet palette",
    ],
    signaturePatterns: [
      "Lead with the room problem, then the textile solution",
      "Pair a spec line with one human benefit",
    ],
    primaryEmotion: "CALM",
    emotionalToneDescription:
      "Reassuring expertise — the customer should feel guided, not sold. Calm confidence that the fabric will perform in real homes.",
    emotionalBoundaries: [
      "Never mock budget-conscious shoppers",
      "Avoid anxiety-based aging messaging",
    ],
    hookStyles: ["Proof-led texture reveal", "Before/after light + drape"],
    narrativeStyles: ["Editorial maker trace", "Designer notebook"],
    persuasionStyle: "STORY_LED",
    visualStyle:
      "Soft natural light, tactile macro, architectural negative space; materials read honest (linen slub, wool nap) without glam staging.",
    colorPhilosophy:
      "Low-chroma neutrals with one controlled accent per story; whites are warm, never clinical.",
    compositionStyle:
      "Rule of thirds, generous margins, subject scale that shows drape weight.",
    textureFocus:
      "Weave grain, selvedge, hem detail — photography should answer “how will this feel?”",
    lightingStyle:
      "Window-led daylight; occasional single-source evening mood for bedroom stories.",
  };
}

function identityBrandBible(): BrandBibleFormInput {
  return {
    positioning:
      "Verdant Circuit is a new clinical-meets-poetic skincare house: barrier-first formulas, transparent actives, and a visual identity that feels like a botanical lab notebook — precise, alive, never twee.",
    targetAudience:
      "Skincare maximalists who read INCI lists, follow dermatologists, and want efficacy without clinical coldness. 28–45, urban, willing to pay for formulas that justify the price with data and texture.",
    toneOfVoice:
      "Clear, adult, slightly lyrical on benefit — never infantilizing. We explain the why in plain language and let the science earn trust.",
    messagingPillars: [
      "Barrier logic before buzz ingredients",
      "Texture you can predict — slip, dry-down, layer order",
      "Radical label clarity — no fairy dust percentages",
    ],
    visualIdentity: [
      "Botanical geometry: stems as grid lines, cells as circles",
      "Glass, paper, and botanical specimens — no neon slime tropes",
      "Wordmark-forward packaging with a disciplined secondary mark",
    ],
    channelGuidelines: [
      "Launch site: system-first story — routine architecture before SKUs",
      "Social: ingredient literacy in 30-second beats",
      "Retail cards: one proof point per panel",
    ],
    mandatoryInclusions: [
      "Full INCI on PDP",
      "Patch-test reminder on active-heavy SKUs",
    ],
    thingsToAvoid: [
      "Fear-mongering about “chemicals”",
      "Infantilizing fruit imagery",
      "Unverifiable clean-washing claims",
    ],
    vocabularyStyle: "MIXED",
    sentenceStyle: "SHORT",
    bannedPhrases: [
      "toxin-free",
      "chemical-free",
      "miracle",
      "anti-aging miracle",
    ],
    preferredPhrases: [
      "barrier coherence",
      "actives at purposeful %",
      "texture architecture",
    ],
    signaturePatterns: [
      "State the skin job-to-be-done in one line",
      "Pair each claim with mechanism or evidence class",
    ],
    primaryEmotion: "TRUST",
    emotionalToneDescription:
      "Competent care — intelligent friend who reads papers and still loves a good face oil.",
    emotionalBoundaries: [
      "No shame for acne or aging",
      "No gendered insult humor",
    ],
    hookStyles: ["Lab note reveal", "Contrast: myth vs mechanism"],
    narrativeStyles: ["Routine as system", "Ingredient biography"],
    persuasionStyle: "PROOF_LED",
    visualStyle:
      "Botanical minimalism with lab precision: stems, glass, paper texture, restrained green spectrum.",
    colorPhilosophy:
      "Chlorophyll neutrals, warm paper white, one deep forest anchor; avoid acid gradients.",
    compositionStyle:
      "Grid discipline with organic breaks — rules first, then a single living curve.",
    textureFocus:
      "Etched glass, fiber paper, dew on leaf — real materials, not 3D gloss.",
    lightingStyle:
      "Soft diffused key with crisp speculars on glass; no harsh beauty dish trope.",
  };
}

function serviceBlueprint(): ServiceBlueprintFormInput {
  return {
    templateType: "FULL_PIPELINE",
    activeServices: [
      "Brand platform & messaging",
      "Campaign concepting",
      "Studio art direction",
      "Launch copy system",
    ],
    qualityThreshold: 0.88,
    approvalRequired: true,
  };
}

async function driveWorkflowToEnd(briefId: string, identityFlow: boolean) {
  const rows = buildV1PipelineRows(identityFlow);
  const maxSteps = 80;
  const log: string[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const state = await orchestrator.getWorkflowState(briefId);
    const exportTask = state.tasks.find((t) => t.stage === "EXPORT");
    if (exportTask?.status === "COMPLETED") {
      log.push("EXPORT completed — workflow finished.");
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
      await orchestrator.approveTask(t.id, "QA auto-approve", "private-dev-qa");
      log.push(`Approved ${t.stage} (${t.id})`);
      continue;
    }

    if (state.nextExecutableTaskIds.length === 0) {
      log.push("Stuck: no READY task and no AWAITING_REVIEW.");
      return { ok: false as const, log, state };
    }

    const exec = await orchestrator.executeNextReadyTask(briefId);
    log.push(
      `Executed task ${exec.taskId} artifact ${exec.artifactId} placeholder=${exec.usedPlaceholder}`,
    );
  }
  log.push("Aborted: max steps");
  return { ok: false as const, log };
}

async function httpHealth(): Promise<{ ok: boolean; body?: string }> {
  const base = process.env.APP_BASE_URL?.trim() || "http://127.0.0.1:3000";
  try {
    const r = await fetch(`${base}/api/health`);
    const text = await r.text();
    return { ok: r.ok, body: text.slice(0, 500) };
  } catch (e) {
    return { ok: false, body: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const prisma = getPrisma();
  await prisma.$connect();
  console.log("[qa] Database connected.");

  const retail = await createClient(RETAIL_CLIENT);
  await upsertBrandBible(retail.id, retailBrandBible());
  await upsertServiceBlueprint(retail.id, serviceBlueprint());
  const campaignBrief = await createBrief(retail.id, {
    title: "Spring 2026 — Light & Drape campaign",
    businessObjective:
      "Grow qualified designer trade leads by 18% and increase AOV on drapery yardage during the spring season.",
    communicationObjective:
      "Position Loom & Lumen as the textile source designers specify when light behavior and hand matter as much as color.",
    targetAudience:
      "Residential interior designers in coastal and mountain markets specifying natural fibers for primary homes.",
    keyMessage:
      "The right cloth teaches a room how to hold light — specify drapery that performs in real windows.",
    deliverablesRequested: [
      "Campaign concept territories (2–3)",
      "Key visual direction for paid social and site hero",
      "Headline + body modules for email and PDP support",
    ],
    tone: "Warm, precise, editorial — never retail-shouty",
    constraints: [
      "No price claims without approved numbers",
      "Must work for both designer trade and sophisticated DTC",
    ],
    deadline,
    identityWorkflowEnabled: false,
  });

  const identity = await createClient(IDENTITY_CLIENT);
  await upsertBrandBible(identity.id, identityBrandBible());
  await upsertServiceBlueprint(identity.id, serviceBlueprint());
  const identityBrief = await createBrief(identity.id, {
    title: "New brand launch — Verdant Circuit identity system",
    businessObjective:
      "Establish a distinctive, scalable identity system before DTC launch — mark, type logic, and packaging rhythm that signal lab-grade clarity with botanical warmth.",
    communicationObjective:
      "Give founders and design partners a shared language for the identity before any final logo lockups or campaign shoots.",
    targetAudience:
      "Skincare-informed millennials and Gen X buyers who trust evidence-led brands and reject clean-beauty theater.",
    keyMessage:
      "Skincare that reads like a well-run lab notebook: clear actives, honest texture, barrier-first design.",
    deliverablesRequested: [
      "Identity strategy artifact (symbolic + semantic)",
      "3–5 distinct identity routes before mark exploration",
    ],
    tone: "Clear, intelligent, quietly poetic",
    constraints: [
      "No stock science clipart tropes",
      "Identity must scale to stamp-size and app icon",
    ],
    deadline,
    identityWorkflowEnabled: true,
  });

  console.log("[qa] Clients and briefs created:");
  console.log(
    JSON.stringify(
      {
        retailClientId: retail.id,
        campaignBriefId: campaignBrief.id,
        identityClientId: identity.id,
        identityBriefId: identityBrief.id,
      },
      null,
      2,
    ),
  );

  await orchestrator.initializeWorkflowForBrief(campaignBrief.id);
  const campaignRun = await driveWorkflowToEnd(campaignBrief.id, false);
  console.log("[qa] Campaign workflow:", campaignRun.ok ? "OK" : "INCOMPLETE");
  campaignRun.log.forEach((l) => console.log("   ", l));

  await orchestrator.initializeWorkflowForBrief(identityBrief.id);
  const identityRun = await driveWorkflowToEnd(identityBrief.id, true);
  console.log("[qa] Identity workflow:", identityRun.ok ? "OK" : "INCOMPLETE");
  identityRun.log.forEach((l) => console.log("   ", l));

  let visualGen: {
    attempted: boolean;
    result?: string;
    error?: string;
  } = { attempted: false };
  const pkg = await prisma.artifact.findFirst({
    where: {
      type: "VISUAL_PROMPT_PACKAGE",
      task: { briefId: campaignBrief.id },
    },
    orderBy: { version: "desc" },
  });
  if (pkg) {
    visualGen.attempted = true;
    try {
      const r = await generateVisualAssetFromPromptPackageDefaultDb({
        promptPackageArtifactId: pkg.id,
        clientId: retail.id,
        briefId: campaignBrief.id,
        providerTarget: "GENERIC",
        variantLabel: "qa-bootstrap",
      });
      visualGen.result = `${r.status}${r.error ? `: ${r.error}` : ""}`;
    } catch (e) {
      visualGen.error = e instanceof Error ? e.message : String(e);
    }
    console.log("[qa] Visual generation:", visualGen);
  } else {
    console.log(
      "[qa] No VISUAL_PROMPT_PACKAGE on campaign brief — skip image generation.",
    );
  }

  const http = await httpHealth();
  console.log("[qa] HTTP health:", http);

  await prisma.$disconnect();
  console.log("[qa] Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
