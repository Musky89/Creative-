import type { PrismaClient, VisualPromptProviderTarget } from "@/generated/prisma/client";
import { visualPromptPackageArtifactSchema } from "@/lib/artifacts/contracts";
import { getPrisma } from "@/server/db/prisma";
import { generateGeminiImagenImage } from "@/server/image-generation/gemini-imagen";
import { generateOpenAiImage } from "@/server/image-generation/openai-images";
import { saveVisualAssetFile } from "@/server/storage/visual-asset-storage";
import { evaluateAndPersistVisualAsset } from "@/server/visual-review/evaluate-visual-asset";

export const MAX_VISUAL_ASSETS_PER_PACKAGE = 16;
export const MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE = 3;

function stripInternalKeys(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const k of Object.keys(out)) {
    if (k.startsWith("_")) delete out[k];
  }
  return out;
}

type Bundle = { prompt: string; negativeOrAvoid: string };

function pickBundle(
  content: Record<string, unknown>,
  target: VisualPromptProviderTarget,
  critiqueSuffix?: string,
): Bundle {
  const parsed = visualPromptPackageArtifactSchema.safeParse(content);
  if (!parsed.success) {
    throw new Error("Invalid VISUAL_PROMPT_PACKAGE artifact content.");
  }
  const pv = parsed.data.providerVariants;
  const key =
    target === "GPT_IMAGE"
      ? "GPT_IMAGE"
      : target === "GEMINI_IMAGE"
        ? "GEMINI_IMAGE"
        : "GENERIC";
  const v = pv[key];
  const basePrompt = v?.prompt ?? parsed.data.primaryPrompt;
  const neg = v?.negativeOrAvoid ?? parsed.data.negativePrompt;
  const suffix = critiqueSuffix?.trim();
  const prompt = suffix
    ? `${basePrompt}\n\nFOUNDER / QA DIRECTION (must honor):\n${suffix.slice(0, 1200)}`
    : basePrompt;
  return { prompt, negativeOrAvoid: neg };
}

async function runProvider(
  target: VisualPromptProviderTarget,
  bundle: Bundle,
): Promise<{
  providerName: string;
  modelName: string;
  buffer: Buffer;
  mime: string;
  genMeta: Record<string, unknown>;
}> {
  const prompt = bundle.prompt;
  const negative = bundle.negativeOrAvoid;

  if (target === "GPT_IMAGE") {
    const r = await generateOpenAiImage({ prompt, negativePrompt: negative });
    return {
      providerName: "openai",
      modelName: process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3",
      buffer: r.imageBuffer,
      mime: r.mimeType,
      genMeta: r.metadata ?? {},
    };
  }

  if (target === "GEMINI_IMAGE") {
    const r = await generateGeminiImagenImage({ prompt, negativePrompt: negative });
    return {
      providerName: "google_imagen",
      modelName: process.env.GEMINI_IMAGE_MODEL?.trim() || "imagen-4.0-generate-001",
      buffer: r.imageBuffer,
      mime: r.mimeType,
      genMeta: r.metadata ?? {},
    };
  }

  // GENERIC: prefer OpenAI if configured, else Gemini, else fail clearly.
  if (process.env.OPENAI_API_KEY?.trim()) {
    const r = await generateOpenAiImage({ prompt, negativePrompt: negative });
    return {
      providerName: "openai",
      modelName: process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3",
      buffer: r.imageBuffer,
      mime: r.mimeType,
      genMeta: { ...((r.metadata as object) ?? {}), genericResolvedAs: "openai" },
    };
  }
  if (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim()
  ) {
    const r = await generateGeminiImagenImage({ prompt, negativePrompt: negative });
    return {
      providerName: "google_imagen",
      modelName: process.env.GEMINI_IMAGE_MODEL?.trim() || "imagen-4.0-generate-001",
      buffer: r.imageBuffer,
      mime: r.mimeType,
      genMeta: { ...((r.metadata as object) ?? {}), genericResolvedAs: "gemini" },
    };
  }

  throw new Error(
    "GENERIC target requires OPENAI_API_KEY or GEMINI_API_KEY/GOOGLE_API_KEY, or choose GPT_IMAGE / GEMINI_IMAGE with the matching key set.",
  );
}

/**
 * Loads VISUAL_PROMPT_PACKAGE, generates image via provider, persists VisualAsset + file.
 * Future: queue worker can call this with the same signature.
 */
export async function generateVisualAssetFromPromptPackage(
  db: PrismaClient,
  args: {
    promptPackageArtifactId: string;
    clientId: string;
    briefId: string;
    providerTarget: VisualPromptProviderTarget;
    variantLabel?: string;
    /** Short founder note appended to prompt; counts as regeneration attempt when non-empty. */
    critique?: string | null;
  },
): Promise<{ id: string; status: "COMPLETED" | "FAILED"; error?: string }> {
  const art = await db.artifact.findUnique({
    where: { id: args.promptPackageArtifactId },
    include: { task: { include: { brief: true } } },
  });

  if (!art || art.type !== "VISUAL_PROMPT_PACKAGE") {
    throw new Error("Artifact is not a VISUAL_PROMPT_PACKAGE.");
  }
  if (art.task.briefId !== args.briefId || art.task.brief.clientId !== args.clientId) {
    throw new Error("Artifact does not belong to this brief/client.");
  }

  const totalForPackage = await db.visualAsset.count({
    where: { sourceArtifactId: art.id },
  });
  if (totalForPackage >= MAX_VISUAL_ASSETS_PER_PACKAGE) {
    throw new Error(
      `Maximum ${MAX_VISUAL_ASSETS_PER_PACKAGE} visual assets per prompt package reached.`,
    );
  }

  const critiqueTrim = args.critique?.trim() ?? "";
  if (critiqueTrim) {
    const critiqueCount = await db.visualAsset.count({
      where: {
        sourceArtifactId: art.id,
        regenerationAttempt: { gt: 0 },
      },
    });
    if (critiqueCount >= MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE) {
      throw new Error(
        `Maximum ${MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE} critique-based regenerations for this package reached.`,
      );
    }
  }

  const content = stripInternalKeys(art.content as Record<string, unknown>);
  const bundle = pickBundle(content, args.providerTarget, critiqueTrim || undefined);
  const regenAttempt = critiqueTrim ? 1 : 0;

  const asset = await db.visualAsset.create({
    data: {
      clientId: args.clientId,
      briefId: args.briefId,
      taskId: art.taskId,
      sourceArtifactId: art.id,
      providerTarget: args.providerTarget,
      providerName: "pending",
      modelName: "pending",
      promptUsed: bundle.prompt,
      negativePromptUsed: bundle.negativeOrAvoid,
      status: "GENERATING",
      variantLabel: args.variantLabel?.trim() || null,
      regenerationAttempt: regenAttempt,
    },
  });

  try {
    const { providerName, modelName, buffer, mime, genMeta } = await runProvider(
      args.providerTarget,
      bundle,
    );
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    const { relativePath } = await saveVisualAssetFile(asset.id, buffer, ext);

    const resultUrl = `/api/visual-assets/${asset.id}/file`;

    await db.visualAsset.update({
      where: { id: asset.id },
      data: {
        providerName,
        modelName,
        status: "COMPLETED",
        resultUrl,
        localPath: relativePath,
        metadata: {
          mimeType: mime,
          critiqueAppended: critiqueTrim || undefined,
          ...genMeta,
        } as object,
        generationNotes: null,
      },
    });

    await evaluateAndPersistVisualAsset(db, {
      visualAssetId: asset.id,
      clientId: args.clientId,
    });

    return { id: asset.id, status: "COMPLETED" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[agenticforce:visual-gen] failed:", msg);
    await db.visualAsset.update({
      where: { id: asset.id },
      data: {
        providerName: "none",
        modelName: "none",
        status: "FAILED",
        generationNotes: msg,
        metadata: { error: msg } as object,
      },
    });
    return { id: asset.id, status: "FAILED", error: msg };
  }
}

/** Convenience for server actions. */
export async function generateVisualAssetFromPromptPackageDefaultDb(
  args: Parameters<typeof generateVisualAssetFromPromptPackage>[1],
) {
  return generateVisualAssetFromPromptPackage(getPrisma(), args);
}
