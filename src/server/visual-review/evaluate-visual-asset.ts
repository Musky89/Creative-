import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { visualSpecArtifactSchema } from "@/lib/artifacts/contracts";
import {
  deterministicVisualAssetEvaluation,
  visualAssetEvaluationSchema,
  type VisualAssetEvaluation,
} from "@/lib/visual/visual-asset-evaluation";
import { detectVisualSlop } from "@/lib/visual/slop-detection";
import {
  VISUAL_REALISM_REJECT_THRESHOLD,
  VISUAL_SLOP_REJECT_THRESHOLD,
} from "@/lib/visual/visual-variant-thresholds";
import { extractJsonObject } from "@/server/llm/extract-json";
import { resolveVisualAssetAbsolutePath } from "@/server/storage/visual-asset-storage";

const VISION_SYSTEM = `You are a strict creative director reviewing a generated image for brand work.
You cannot know the full brand bible — use the VISUAL_SPEC excerpt and your visual judgment.
Output a single JSON object only. No markdown.

Fields:
- qualityVerdict: "STRONG" | "ACCEPTABLE" | "WEAK"
- realismScore: number 0-1 (1 = photographic, believable; 0 = plastic/CGI/stock-slop)
- compositionScore: number 0-1 (layout, hierarchy, breathing room)
- brandFitScore: number 0-1 (fits VISUAL_SPEC / brief cues)
- slopScore: number 0-1 (1 = maximum generic AI / hyper-polish / wrong anatomy)
- brandAlignment: one short paragraph
- distinctiveness: one short paragraph (vs generic stock / AI wallpaper)
- compositionAssessment: one short paragraph
- emotionalAlignment: one short paragraph vs stated mood/tone
- slopRisk: "LOW" | "MEDIUM" | "HIGH" (generic AI aesthetics, plastic skin, extra fingers, incoherent text, etc.)
- avoidListRespected: "LIKELY" | "UNCERTAIN" | "LIKELY_VIOLATED" (based on visible cues vs avoid list if provided)
- recommendations: string array, max 6, concrete
- regenerationRecommended: boolean — true if WEAK or HIGH slop or likely violated avoid list

Be honest: if you cannot see detail, use UNCERTAIN and explain.`;

const visionResponseSchema = z.object({
  qualityVerdict: z.enum(["STRONG", "ACCEPTABLE", "WEAK"]),
  realismScore: z.number().min(0).max(1),
  compositionScore: z.number().min(0).max(1),
  brandFitScore: z.number().min(0).max(1),
  slopScore: z.number().min(0).max(1),
  brandAlignment: z.string().min(1),
  distinctiveness: z.string().min(1),
  compositionAssessment: z.string().min(1),
  emotionalAlignment: z.string().min(1),
  slopRisk: z.enum(["LOW", "MEDIUM", "HIGH"]),
  avoidListRespected: z.enum(["LIKELY", "UNCERTAIN", "LIKELY_VIOLATED"]),
  recommendations: z.array(z.string()).max(8),
  regenerationRecommended: z.boolean(),
});

function slopRiskToScore(r: "LOW" | "MEDIUM" | "HIGH"): number {
  if (r === "HIGH") return 0.85;
  if (r === "MEDIUM") return 0.5;
  return 0.2;
}

function heuristicScores(args: {
  det: ReturnType<typeof deterministicVisualAssetEvaluation>;
  slopPixels: ReturnType<typeof detectVisualSlop>;
}): Pick<
  VisualAssetEvaluation,
  | "realismScore"
  | "compositionScore"
  | "brandFitScore"
  | "slopScore"
> {
  const textSlop = slopRiskToScore(args.det.slopRisk);
  const slopScore = Math.min(
    1,
    args.slopPixels.aggregateSlopScore * 0.72 + textSlop * 0.28,
  );
  const realismScore = Math.max(0, Math.min(1, 1 - slopScore * 0.92));
  const compositionScore = Math.max(
    0,
    Math.min(
      1,
      1 -
        args.slopPixels.clutteredCompositionScore * 0.45 -
        args.slopPixels.lackOfNegativeSpaceScore * 0.35 -
        args.slopPixels.unnaturalSymmetryScore * 0.12,
    ),
  );
  const weakSpec = args.det.deterministicIssues.length >= 2 ? 0.12 : 0;
  const brandFitScore = Math.max(
    0,
    Math.min(1, 0.55 + (args.det.qualityVerdict === "STRONG" ? 0.25 : 0) - weakSpec),
  );
  return { realismScore, compositionScore, brandFitScore, slopScore };
}

function mergeNumericScores(
  detScores: Pick<
    VisualAssetEvaluation,
    "realismScore" | "compositionScore" | "brandFitScore" | "slopScore"
  >,
  vision: Pick<
    VisualAssetEvaluation,
    "realismScore" | "compositionScore" | "brandFitScore" | "slopScore"
  > | null,
): Pick<
  VisualAssetEvaluation,
  "realismScore" | "compositionScore" | "brandFitScore" | "slopScore"
> {
  if (!vision) return detScores;
  const w = 0.55;
  const blend = (a: number, b: number) => Math.max(0, Math.min(1, a * (1 - w) + b * w));
  return {
    realismScore: blend(detScores.realismScore, vision.realismScore),
    compositionScore: blend(detScores.compositionScore, vision.compositionScore),
    brandFitScore: blend(detScores.brandFitScore, vision.brandFitScore),
    slopScore: blend(detScores.slopScore, vision.slopScore),
  };
}

function mergeVerdicts(
  det: Pick<VisualAssetEvaluation, "qualityVerdict" | "slopRisk" | "regenerationRecommended">,
  vision: Pick<
    VisualAssetEvaluation,
    "qualityVerdict" | "slopRisk" | "regenerationRecommended"
  > | null,
): Pick<
  VisualAssetEvaluation,
  "qualityVerdict" | "slopRisk" | "regenerationRecommended"
> {
  if (!vision) return det;
  const order = { WEAK: 0, ACCEPTABLE: 1, STRONG: 2 };
  const q =
    order[det.qualityVerdict] <= order[vision.qualityVerdict]
      ? det.qualityVerdict
      : vision.qualityVerdict;
  const slopRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const s =
    slopRank[det.slopRisk] <= slopRank[vision.slopRisk]
      ? det.slopRisk
      : vision.slopRisk;
  return {
    qualityVerdict: q,
    slopRisk: s,
    regenerationRecommended:
      det.regenerationRecommended || vision.regenerationRecommended,
  };
}

/**
 * Loads VISUAL_SPEC by id from prompt package; runs deterministic + optional OpenAI vision.
 * Persists VisualAssetReview row.
 */
export async function evaluateAndPersistVisualAsset(
  db: PrismaClient,
  args: {
    visualAssetId: string;
    clientId: string;
  },
): Promise<void> {
  const asset = await db.visualAsset.findUnique({
    where: { id: args.visualAssetId },
    include: {
      sourceArtifact: true,
    },
  });
  if (!asset || asset.clientId !== args.clientId || asset.status !== "COMPLETED") {
    return;
  }

  const existing = await db.visualAssetReview.findUnique({
    where: { visualAssetId: asset.id },
  });
  if (existing) return;

  const pkgContent = asset.sourceArtifact.content as Record<string, unknown>;
  const specId =
    typeof pkgContent.sourceVisualSpecId === "string"
      ? pkgContent.sourceVisualSpecId
      : null;

  let spec: z.infer<typeof visualSpecArtifactSchema> | null = null;
  let specArtifactId: string | null = null;
  if (specId) {
    const specArt = await db.artifact.findUnique({ where: { id: specId } });
    if (specArt?.type === "VISUAL_SPEC") {
      const raw = { ...(specArt.content as Record<string, unknown>) };
      for (const k of Object.keys(raw)) {
        if (k.startsWith("_")) delete raw[k];
      }
      const p = visualSpecArtifactSchema.safeParse(raw);
      if (p.success) {
        spec = p.data;
        specArtifactId = specArt.id;
      }
    }
  }

  const det = deterministicVisualAssetEvaluation({
    promptUsed: asset.promptUsed,
    negativePromptUsed: asset.negativePromptUsed,
    spec,
  });

  let imageBuf: Buffer | null = null;
  let imageMime = "image/png";
  if (asset.localPath) {
    try {
      const abs = resolveVisualAssetAbsolutePath(asset.localPath);
      imageBuf = await readFile(abs);
      const meta = asset.metadata as { mimeType?: string } | null;
      imageMime = meta?.mimeType?.includes("jpeg") ? "image/jpeg" : "image/png";
    } catch {
      imageBuf = null;
    }
  }

  const slopPixels =
    imageBuf != null
      ? detectVisualSlop({
          imageBuffer: imageBuf,
          mime: imageMime,
          promptUsed: asset.promptUsed,
        })
      : detectVisualSlop({
          imageBuffer: Buffer.alloc(0),
          mime: imageMime,
          promptUsed: asset.promptUsed,
        });

  const detScores = heuristicScores({ det, slopPixels });

  let visionPart: z.infer<typeof visionResponseSchema> | null = null;
  let evaluator = "deterministic";

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const visionModel =
    process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";

  if (openaiKey && imageBuf) {
    try {
      const b64 = imageBuf.toString("base64");
      const mime = imageMime;

      const specExcerpt = spec
        ? [
            `visualObjective: ${spec.visualObjective.slice(0, 400)}`,
            `mood: ${spec.mood}`,
            `emotionalTone: ${spec.emotionalTone}`,
            `composition: ${spec.composition.slice(0, 400)}`,
            `avoidList: ${spec.avoidList.join(" | ")}`,
            `distinctivenessNotes: ${spec.distinctivenessNotes.slice(0, 300)}`,
          ].join("\n")
        : "(No VISUAL_SPEC)";

      const userText = [
        "## VISUAL_SPEC (excerpt)",
        specExcerpt,
        "",
        "## Image generation prompt used (text)",
        asset.promptUsed.slice(0, 8000),
        "",
        "## Negative / avoid instructions",
        asset.negativePromptUsed.slice(0, 4000),
      ].join("\n");

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: visionModel,
          max_tokens: 1200,
          messages: [
            { role: "system", content: VISION_SYSTEM },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mime};base64,${b64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(data.error?.message ?? `Vision HTTP ${res.status}`);
      }
      const text = data.choices?.[0]?.message?.content ?? "";
      const slice = extractJsonObject(text);
      const parsed = visionResponseSchema.safeParse(JSON.parse(slice));
      if (parsed.success) {
        visionPart = parsed.data;
        evaluator = "openai_vision";
      }
    } catch (e) {
      console.error(
        "[agenticforce:visual-review] vision pass failed:",
        e instanceof Error ? e.message : e,
      );
      evaluator = "deterministic";
    }
  } else if (!openaiKey) {
    evaluator = "skipped_no_provider";
  }

  const merged = mergeVerdicts(det, visionPart);

  const visionScores = visionPart
    ? {
        realismScore: visionPart.realismScore,
        compositionScore: visionPart.compositionScore,
        brandFitScore: visionPart.brandFitScore,
        slopScore: visionPart.slopScore,
      }
    : null;
  const numericMerged = mergeNumericScores(detScores, visionScores);

  const autoRejectQuality =
    numericMerged.slopScore > VISUAL_SLOP_REJECT_THRESHOLD ||
    numericMerged.realismScore < VISUAL_REALISM_REJECT_THRESHOLD;

  const full: VisualAssetEvaluation = {
    qualityVerdict: merged.qualityVerdict,
    slopRisk: merged.slopRisk,
    regenerationRecommended:
      merged.regenerationRecommended || autoRejectQuality,
    brandAlignment: visionPart?.brandAlignment ?? det.brandAlignment,
    distinctiveness: visionPart?.distinctiveness ?? det.distinctiveness,
    compositionAssessment:
      visionPart?.compositionAssessment ?? det.compositionAssessment,
    emotionalAlignment: visionPart?.emotionalAlignment ?? det.emotionalAlignment,
    avoidListRespected: visionPart?.avoidListRespected ?? det.avoidListRespected,
    recommendations: [
      ...det.recommendations,
      ...(visionPart?.recommendations ?? []),
      ...(autoRejectQuality
        ? [
            numericMerged.slopScore > VISUAL_SLOP_REJECT_THRESHOLD
              ? `Auto-reject: slopScore ${numericMerged.slopScore.toFixed(2)} > ${VISUAL_SLOP_REJECT_THRESHOLD}.`
              : "",
            numericMerged.realismScore < VISUAL_REALISM_REJECT_THRESHOLD
              ? `Auto-reject: realismScore ${numericMerged.realismScore.toFixed(2)} < ${VISUAL_REALISM_REJECT_THRESHOLD}.`
              : "",
          ].filter(Boolean)
        : []),
      ...slopPixels.notes,
    ]
      .filter(Boolean)
      .slice(0, 10),
    deterministicIssues: det.deterministicIssues,
    llmNotes:
      visionPart && evaluator === "openai_vision"
        ? "OpenAI vision pass merged with deterministic heuristics."
        : evaluator === "skipped_no_provider"
          ? "Vision skipped: OPENAI_API_KEY not set."
          : undefined,
    realismScore: numericMerged.realismScore,
    compositionScore: numericMerged.compositionScore,
    brandFitScore: numericMerged.brandFitScore,
    slopScore: numericMerged.slopScore,
    slopDetection: {
      overSaturationScore: slopPixels.overSaturationScore,
      specularGlossScore: slopPixels.specularGlossScore,
      unnaturalSymmetryScore: slopPixels.unnaturalSymmetryScore,
      cgiLookScore: slopPixels.cgiLookScore,
      lackOfNegativeSpaceScore: slopPixels.lackOfNegativeSpaceScore,
      clutteredCompositionScore: slopPixels.clutteredCompositionScore,
      aggregateSlopScore: slopPixels.aggregateSlopScore,
      notes: slopPixels.notes,
    },
  };

  const validated = visualAssetEvaluationSchema.safeParse(full);
  if (!validated.success) {
    return;
  }

  await db.visualAssetReview.create({
    data: {
      clientId: args.clientId,
      visualAssetId: asset.id,
      sourceSpecArtifactId: specArtifactId,
      evaluation: validated.data as object,
      qualityVerdict: validated.data.qualityVerdict,
      regenerationRecommended: validated.data.regenerationRecommended,
      evaluator,
    },
  });

  await db.visualAsset.update({
    where: { id: asset.id },
    data: {
      autoRejected: autoRejectQuality,
      ...(autoRejectQuality
        ? { isPreferred: false, isSecondary: false }
        : {}),
    },
  });
}
