import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { saveVisualAssetFile } from "@/server/storage/visual-asset-storage";
import { evaluateAndPersistVisualAsset } from "@/server/visual-review/evaluate-visual-asset";
import { buildTrainingZipForAssets } from "./build-training-dataset";
import {
  BRAND_STYLE_MAX_IMAGES,
  BRAND_STYLE_MIN_IMAGES,
  BRAND_STYLE_TRAIN_COOLDOWN_HOURS,
  BRAND_STYLE_TRIGGER_WORD,
} from "./constants";
import { falSubscribeFluxGeneral, falSubscribeTraining, getFalClientOrThrow } from "./fal-runtime";
import { generateTrainingGuidance } from "./training-guidance";
import { recordBrandMemoryEvent } from "@/server/memory/brand-memory-service";
import { extractBrandStyleTrainingMemory } from "@/server/memory/extract-memory";

function hoursSince(d: Date | null | undefined): number {
  if (!d) return 1e6;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60);
}

async function findLatestPromptPackageForClient(clientId: string) {
  const prisma = getPrisma();
  return prisma.artifact.findFirst({
    where: {
      type: "VISUAL_PROMPT_PACKAGE",
      task: { brief: { clientId } },
    },
    orderBy: { createdAt: "desc" },
    include: { task: true },
  });
}

async function downloadImageBuffer(url: string): Promise<{ buffer: Buffer; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download generated image (${res.status}).`);
  }
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const ab = await res.arrayBuffer();
  return { buffer: Buffer.from(ab), mime };
}

/**
 * Long-running training + optional comparison generations. Intended for `after()` from a server action.
 */
export async function runBrandVisualTrainingPipeline(jobId: string) {
  const prisma = getPrisma();
  const job = await prisma.brandVisualTrainingJob.findUnique({
    where: { id: jobId },
    include: { client: true, assets: true },
  });
  if (!job || job.status !== "PREPARING") {
    return;
  }

  const assetIds = job.assets.map((x) => x.visualAssetId);
  if (
    assetIds.length < BRAND_STYLE_MIN_IMAGES ||
    assetIds.length > BRAND_STYLE_MAX_IMAGES
  ) {
    await prisma.brandVisualTrainingJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: `Select between ${BRAND_STYLE_MIN_IMAGES} and ${BRAND_STYLE_MAX_IMAGES} images.`,
        completedAt: new Date(),
      },
    });
    const badExt = extractBrandStyleTrainingMemory({
      outcome: "FAILED",
      imageCount: assetIds.length,
      errorMessage: `Image count out of range.`,
    });
    await recordBrandMemoryEvent(prisma, {
      clientId: job.clientId,
      type: "BRAND_STYLE",
      frameworkId: null,
      summary: badExt.summary,
      attributes: badExt.attributes,
      outcome: "FAILED",
      strengthScore: 0.4,
    });
    return;
  }

  try {
    await prisma.brandVisualTrainingJob.update({
      where: { id: jobId },
      data: { status: "TRAINING", falStatusPayload: { phase: "zip" } as Prisma.InputJsonValue },
    });

    const { buffer: zipBuffer, rows } = await buildTrainingZipForAssets(prisma, {
      clientId: job.clientId,
      clientName: job.client.name,
      visualAssetIds: assetIds,
    });

    await prisma.brandVisualTrainingAsset.deleteMany({ where: { jobId } });
    for (const row of rows) {
      await prisma.brandVisualTrainingAsset.create({
        data: {
          jobId,
          visualAssetId: row.visualAssetId,
          caption: row.caption,
          styleTags: row.styleTags as Prisma.InputJsonValue,
          sortOrder: row.sortOrder,
        },
      });
    }

    const fal = getFalClientOrThrow();
    const zipUrl = await fal.storage.upload(
      new Blob([new Uint8Array(zipBuffer)], { type: "application/zip" }),
    );

    const prevRef = job.client.visualModelRef?.trim() || null;
    await prisma.brandVisualTrainingJob.update({
      where: { id: jobId },
      data: {
        previousVisualModelRef: prevRef,
        status: "TRAINING",
        falStatusPayload: { phase: "fal_queue" } as Prisma.InputJsonValue,
      },
    });

    const trainResult = await falSubscribeTraining({
      images_data_url: zipUrl,
      trigger_word: BRAND_STYLE_TRIGGER_WORD,
      is_style: true,
      create_masks: false,
    });

    const output = trainResult.data;
    const loraUrl =
      output &&
      typeof output === "object" &&
      "diffusers_lora_file" in output &&
      output.diffusers_lora_file &&
      typeof output.diffusers_lora_file === "object" &&
      "url" in output.diffusers_lora_file
        ? String((output.diffusers_lora_file as { url: string }).url)
        : "";

    if (!loraUrl) {
      throw new Error("Training finished but no style weights URL was returned.");
    }

    await prisma.brandVisualTrainingJob.update({
      where: { id: jobId },
      data: {
        status: "FINALIZING",
        newVisualModelRef: loraUrl,
        resultPayload: output as Prisma.InputJsonValue,
      },
    });

    await prisma.client.update({
      where: { id: job.clientId },
      data: {
        visualModelRef: loraUrl,
        lastBrandStyleTrainedAt: new Date(),
      },
    });

    const pkg = await findLatestPromptPackageForClient(job.clientId);
    const testPrompt = `${BRAND_STYLE_TRIGGER_WORD} — premium campaign still, natural light, believable texture, shallow depth of field, editorial food or product photography`;

    let baseAssetId: string | null = null;
    let styledAssetId: string | null = null;
    let comparisonNote =
      "Baseline vs your new brand visual style — same prompt. Prefer the right frame if it feels more consistently “you”.";

    if (pkg) {
      const neg =
        typeof pkg.content === "object" && pkg.content && "negativePrompt" in pkg.content
          ? String((pkg.content as Record<string, unknown>).negativePrompt ?? "")
          : "";

      const runFluxToAsset = async (withLora: boolean) => {
        const fluxResult = await falSubscribeFluxGeneral({
          prompt: testPrompt,
          negative_prompt: neg.slice(0, 800),
          image_size: "landscape_4_3",
          num_images: 1,
          enable_safety_checker: true,
          ...(withLora
            ? { loras: [{ path: loraUrl, scale: 1 }] }
            : {}),
        });
        const data = fluxResult.data as {
          images?: { url?: string }[];
        };
        const url = data?.images?.[0]?.url;
        if (!url) throw new Error("Comparison generation returned no image URL.");

        const { buffer, mime } = await downloadImageBuffer(url);
        const asset = await prisma.visualAsset.create({
          data: {
            clientId: job.clientId,
            briefId: pkg.task.briefId,
            taskId: pkg.taskId,
            sourceArtifactId: pkg.id,
            providerTarget: "FAL_IMAGE",
            providerName: "fal",
            modelName: withLora ? "flux-general+lora" : "flux-general",
            promptUsed: testPrompt,
            negativePromptUsed: neg,
            status: "GENERATING",
            variantLabel: withLora ? "style-compare-trained" : "style-compare-baseline",
            metadata: {
              _brandStyleComparison: true,
              _trainingJobId: jobId,
              usedTrainedStyle: withLora,
            } as object,
          },
        });
        const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
        const { relativePath } = await saveVisualAssetFile(asset.id, buffer, ext);
        await prisma.visualAsset.update({
          where: { id: asset.id },
          data: {
            status: "COMPLETED",
            resultUrl: `/api/visual-assets/${asset.id}/file`,
            localPath: relativePath,
            metadata: {
              mimeType: mime,
              _brandStyleComparison: true,
              _trainingJobId: jobId,
              usedTrainedStyle: withLora,
            } as object,
          },
        });
        await evaluateAndPersistVisualAsset(prisma, {
          visualAssetId: asset.id,
          clientId: job.clientId,
        });
        return asset.id;
      };

      baseAssetId = await runFluxToAsset(false);
      styledAssetId = await runFluxToAsset(true);
    } else {
      comparisonNote =
        "Training saved your style. Generate a campaign frame in Studio to see it applied automatically when fal.ai is enabled.";
    }

    await prisma.brandVisualTrainingJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETE",
        completedAt: new Date(),
        comparisonBaseAssetId: baseAssetId,
        comparisonStyledAssetId: styledAssetId,
        comparisonNote,
      },
    });
    const okExt = extractBrandStyleTrainingMemory({
      outcome: "APPROVED",
      imageCount: assetIds.length,
    });
    await recordBrandMemoryEvent(prisma, {
      clientId: job.clientId,
      type: "BRAND_STYLE",
      frameworkId: null,
      summary: okExt.summary,
      attributes: okExt.attributes,
      outcome: "SELECTED",
      strengthScore: 0.95,
    });
    revalidatePath(`/clients/${job.clientId}`, "layout");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[brand-visual-training]", msg);
    await prisma.brandVisualTrainingJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: msg.slice(0, 2000),
        completedAt: new Date(),
      },
    });
    const failExt = extractBrandStyleTrainingMemory({
      outcome: "FAILED",
      imageCount: assetIds.length,
      errorMessage: msg,
    });
    await recordBrandMemoryEvent(prisma, {
      clientId: job.clientId,
      type: "BRAND_STYLE",
      frameworkId: null,
      summary: failExt.summary,
      attributes: failExt.attributes,
      outcome: "FAILED",
      strengthScore: 0.42,
    });
    revalidatePath(`/clients/${job.clientId}`, "layout");
  }
}

export async function validateTrainingSelection(
  clientId: string,
  visualAssetIds: string[],
): Promise<{ error?: string }> {
  if (!process.env.FAL_KEY?.trim()) {
    return { error: "Add FAL_KEY to your environment to teach brand visual style." };
  }
  const n = visualAssetIds.length;
  if (n < BRAND_STYLE_MIN_IMAGES || n > BRAND_STYLE_MAX_IMAGES) {
    return {
      error: `Select between ${BRAND_STYLE_MIN_IMAGES} and ${BRAND_STYLE_MAX_IMAGES} images.`,
    };
  }
  return {};
}

export async function assertCanStartTraining(
  db: Parameters<typeof generateTrainingGuidance>[0],
  clientId: string,
  visualAssetIds: string[],
): Promise<{ error?: string; guidance?: Awaited<ReturnType<typeof generateTrainingGuidance>> }> {
  const basic = await validateTrainingSelection(clientId, visualAssetIds);
  if (basic.error) return basic;

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Client not found." };
  const last = client.lastBrandStyleTrainedAt;
  if (hoursSince(last) < BRAND_STYLE_TRAIN_COOLDOWN_HOURS) {
    const left = Math.ceil(BRAND_STYLE_TRAIN_COOLDOWN_HOURS - hoursSince(last));
    return {
      error: `Please wait about ${left} more hour(s) before teaching the style again — this keeps quality high and costs predictable.`,
    };
  }
  const guidance = await generateTrainingGuidance(db, clientId, visualAssetIds);
  return { guidance };
}
