import type { PrismaClient, VisualPromptProviderTarget } from "@/generated/prisma/client";
import { visualPromptPackageArtifactSchema } from "@/lib/artifacts/contracts";
import { getPrisma } from "@/server/db/prisma";
import { generateGeminiImagenImage } from "@/server/image-generation/gemini-imagen";
import { generateOpenAiImage } from "@/server/image-generation/openai-images";
import { saveVisualAssetFile } from "@/server/storage/visual-asset-storage";
import { evaluateAndPersistVisualAsset } from "@/server/visual-review/evaluate-visual-asset";
import { applyVisualVariantSelectionForPackage } from "@/server/visual-review/visual-variant-selection";
import {
  VISUAL_VARIANTS_PER_RUN_MAX,
  VISUAL_VARIANTS_PER_RUN_MIN,
} from "@/lib/visual/visual-variant-thresholds";
import {
  MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE,
  MAX_VISUAL_ASSETS_PER_PACKAGE,
} from "@/lib/visual/visual-generation-limits";

export {
  MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE,
  MAX_VISUAL_ASSETS_PER_PACKAGE,
} from "@/lib/visual/visual-generation-limits";

function stripInternalKeys(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const k of Object.keys(out)) {
    if (k.startsWith("_")) delete out[k];
  }
  return out;
}

function brandProfileInfluenceFromPackageContent(
  content: Record<string, unknown>,
): { profileId: string; traitsUsed: string[] } | undefined {
  const raw = content._brandVisualProfileInfluence;
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const profileId = String(o.profileId ?? "");
  const tu = o.traitsUsed;
  if (!profileId || !Array.isArray(tu)) return undefined;
  const traitsUsed = tu.map((x) => String(x)).filter(Boolean);
  return traitsUsed.length ? { profileId, traitsUsed } : undefined;
}

function visualModelRefFromPackageContent(
  content: Record<string, unknown>,
): string | undefined {
  const v = content._visualModelRef;
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function visualReferencesUsedFromPackageContent(
  content: Record<string, unknown>,
): { id: string; label: string }[] | undefined {
  const raw = content._visualReferencesUsed;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: { id: string; label: string }[] = [];
  for (const x of raw) {
    if (x && typeof x === "object" && "id" in x) {
      const o = x as Record<string, unknown>;
      out.push({
        id: String(o.id),
        label: String(o.label ?? ""),
      });
    }
  }
  return out.length ? out : undefined;
}

type Bundle = { prompt: string; negativeOrAvoid: string };

export function resolveProviderTargetForGeneration(
  requested: VisualPromptProviderTarget,
): VisualPromptProviderTarget {
  if (requested !== "GENERIC") return requested;
  const gemini =
    !!process.env.GEMINI_API_KEY?.trim() || !!process.env.GOOGLE_API_KEY?.trim();
  const openai = !!process.env.OPENAI_API_KEY?.trim();
  if (gemini) return "GEMINI_IMAGE";
  if (openai) return "GPT_IMAGE";
  return "GENERIC";
}

function variantPromptSuffixes(count: number): string[] {
  const lenses = [
    "Variant note: grittier texture, less polish, real-world imperfection, documentary still.",
    "Variant note: wider negative space, single hero subject, calmer palette, less contrast.",
    "Variant note: natural window light, shallow depth, avoid studio-perfect gloss.",
    "Variant note: asymmetrical framing, environmental context, candid energy.",
    "Variant note: muted color grade, matte surfaces, reduce specular highlights.",
    "Variant note: tighter crop on subject, busier foreground acceptable only if motivated.",
    "Variant note: cooler shadows, less saturation, editorial photography bias.",
    "Variant note: warmer practicals, softer fill, human-scale props only.",
    "Variant note: high contrast monochrome bias in lighting only — keep color truth elsewhere.",
    "Variant note: handheld micro-tilt, imperfect horizon, avoid CGI symmetry.",
    "Variant note: food/product macro with real oil/sheen — not plastic specular.",
    "Variant note: street-level context, avoid floating subjects and fake bokeh orbs.",
  ];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(lenses[i % lenses.length]!);
  }
  return out;
}

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

export async function runProvider(
  target: VisualPromptProviderTarget,
  bundle: Bundle,
  options?: { visualModelRef?: string | null },
): Promise<{
  providerName: string;
  modelName: string;
  buffer: Buffer;
  mime: string;
  genMeta: Record<string, unknown>;
}> {
  const vmRef = options?.visualModelRef?.trim() || null;
  const refMeta = vmRef
    ? { visualModelRef: vmRef, visualModelRefPending: true as const }
    : {};
  const prompt = vmRef
    ? `[Brand visual model ref (reserved for future LoRA / fine-tune): ${vmRef}]\n\n${bundle.prompt}`
    : bundle.prompt;
  const negative = bundle.negativeOrAvoid;

  if (target === "GPT_IMAGE") {
    const r = await generateOpenAiImage({ prompt, negativePrompt: negative });
    return {
      providerName: "openai",
      modelName: process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3",
      buffer: r.imageBuffer,
      mime: r.mimeType,
      genMeta: { ...(r.metadata ?? {}), ...refMeta },
    };
  }

  if (target === "GEMINI_IMAGE") {
    const r = await generateGeminiImagenImage({ prompt, negativePrompt: negative });
    return {
      providerName: "google_imagen",
      modelName: process.env.GEMINI_IMAGE_MODEL?.trim() || "imagen-4.0-generate-001",
      buffer: r.imageBuffer,
      mime: r.mimeType,
      genMeta: { ...(r.metadata ?? {}), ...refMeta },
    };
  }

  // GENERIC: prefer Gemini when available, else OpenAI (see resolveProviderTargetForGeneration).
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
      genMeta: {
        ...((r.metadata as object) ?? {}),
        genericResolvedAs: "gemini",
        ...refMeta,
      },
    };
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    const r = await generateOpenAiImage({ prompt, negativePrompt: negative });
    return {
      providerName: "openai",
      modelName: process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3",
      buffer: r.imageBuffer,
      mime: r.mimeType,
      genMeta: {
        ...((r.metadata as object) ?? {}),
        genericResolvedAs: "openai",
        ...refMeta,
      },
    };
  }

  throw new Error(
    "GENERIC target requires GEMINI_API_KEY/GOOGLE_API_KEY or OPENAI_API_KEY, or choose GPT_IMAGE / GEMINI_IMAGE with the matching key set.",
  );
}

function parseVariantCount(): number {
  const raw = process.env.VISUAL_VARIANTS_PER_RUN?.trim();
  if (raw) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) {
      return Math.min(
        VISUAL_VARIANTS_PER_RUN_MAX,
        Math.max(VISUAL_VARIANTS_PER_RUN_MIN, n),
      );
    }
  }
  return 8;
}

export type VariantGenResult = { id: string; status: "COMPLETED" | "FAILED"; error?: string };

/**
 * Generates multiple variants in one run, evaluates each, then surfaces top 2 for the package.
 */
export async function generateVisualVariantsFromPromptPackage(
  db: PrismaClient,
  args: {
    promptPackageArtifactId: string;
    clientId: string;
    briefId: string;
    providerTarget: VisualPromptProviderTarget;
    critique?: string | null;
    /** Override batch size (e.g. 1 for scripts); clamped to min/max. */
    variantCount?: number;
  },
): Promise<{ results: VariantGenResult[]; resolvedTarget: VisualPromptProviderTarget }> {
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

  const totalForPackage = await db.visualAsset.count({
    where: { sourceArtifactId: art.id },
  });
  let count = critiqueTrim
    ? 1
    : args.variantCount != null
      ? Math.min(
          VISUAL_VARIANTS_PER_RUN_MAX,
          Math.max(1, Math.floor(args.variantCount)),
        )
      : parseVariantCount();
  if (totalForPackage + count > MAX_VISUAL_ASSETS_PER_PACKAGE) {
    count = Math.max(1, MAX_VISUAL_ASSETS_PER_PACKAGE - totalForPackage);
  }
  if (count < 1) {
    throw new Error(
      `Maximum ${MAX_VISUAL_ASSETS_PER_PACKAGE} visual assets per prompt package reached.`,
    );
  }

  const resolvedTarget = resolveProviderTargetForGeneration(args.providerTarget);
  const rawPkg = art.content as Record<string, unknown>;
  const refsUsed = visualReferencesUsedFromPackageContent(rawPkg);
  const profileInfl = brandProfileInfluenceFromPackageContent(rawPkg);
  const visualModelRef = visualModelRefFromPackageContent(rawPkg);
  const content = stripInternalKeys(rawPkg);
  const baseBundle = pickBundle(content, resolvedTarget, critiqueTrim || undefined);
  const suffixes = critiqueTrim ? [""] : variantPromptSuffixes(count);
  const regenAttempt = critiqueTrim ? 1 : 0;

  const results: VariantGenResult[] = [];

  for (let i = 0; i < count; i++) {
    const suffix = suffixes[i] ?? "";
    const bundle: Bundle = {
      prompt: suffix
        ? `${baseBundle.prompt}\n\n${suffix}`
        : baseBundle.prompt,
      negativeOrAvoid: baseBundle.negativeOrAvoid,
    };

    const asset = await db.visualAsset.create({
      data: {
        clientId: args.clientId,
        briefId: args.briefId,
        taskId: art.taskId,
        sourceArtifactId: art.id,
        providerTarget: resolvedTarget,
        providerName: "pending",
        modelName: "pending",
        promptUsed: bundle.prompt,
        negativePromptUsed: bundle.negativeOrAvoid,
        status: "GENERATING",
        variantLabel: critiqueTrim
          ? "critique-regen"
          : `batch-v${i + 1}-of-${count}`,
        regenerationAttempt: regenAttempt,
      },
    });

    try {
      const { providerName, modelName, buffer, mime, genMeta } =
        await runProvider(resolvedTarget, bundle, {
          visualModelRef: visualModelRef ?? null,
        });
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
            variantIndex: i + 1,
            variantBatchSize: count,
            critiqueAppended: critiqueTrim || undefined,
            ...(refsUsed ? { _visualReferencesUsed: refsUsed } : {}),
            ...(profileInfl ? { _brandVisualProfileInfluence: profileInfl } : {}),
            ...genMeta,
          } as object,
          generationNotes: null,
        },
      });

      await evaluateAndPersistVisualAsset(db, {
        visualAssetId: asset.id,
        clientId: args.clientId,
      });

      results.push({ id: asset.id, status: "COMPLETED" });
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
      results.push({ id: asset.id, status: "FAILED", error: msg });
    }
  }

  if (!critiqueTrim) {
    await applyVisualVariantSelectionForPackage(db, art.id);
  }

  return { results, resolvedTarget };
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

  const resolvedTarget = resolveProviderTargetForGeneration(args.providerTarget);
  const rawPkg = art.content as Record<string, unknown>;
  const refsUsed = visualReferencesUsedFromPackageContent(rawPkg);
  const profileInfl = brandProfileInfluenceFromPackageContent(rawPkg);
  const visualModelRef = visualModelRefFromPackageContent(rawPkg);
  const content = stripInternalKeys(rawPkg);
  const bundle = pickBundle(content, resolvedTarget, critiqueTrim || undefined);
  const regenAttempt = critiqueTrim ? 1 : 0;

  const asset = await db.visualAsset.create({
    data: {
      clientId: args.clientId,
      briefId: args.briefId,
      taskId: art.taskId,
      sourceArtifactId: art.id,
      providerTarget: resolvedTarget,
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
      resolvedTarget,
      bundle,
      { visualModelRef: visualModelRef ?? null },
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
          ...(refsUsed ? { _visualReferencesUsed: refsUsed } : {}),
          ...(profileInfl ? { _brandVisualProfileInfluence: profileInfl } : {}),
          ...genMeta,
        } as object,
        generationNotes: null,
      },
    });

    await evaluateAndPersistVisualAsset(db, {
      visualAssetId: asset.id,
      clientId: args.clientId,
    });

    await applyVisualVariantSelectionForPackage(db, art.id);

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

export async function generateVisualVariantsFromPromptPackageDefaultDb(
  args: Parameters<typeof generateVisualVariantsFromPromptPackage>[1],
) {
  return generateVisualVariantsFromPromptPackage(getPrisma(), args);
}
