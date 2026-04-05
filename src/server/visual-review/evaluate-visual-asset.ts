import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { visualSpecArtifactSchema } from "@/lib/artifacts/contracts";
import {
  deterministicVisualAssetEvaluation,
  visualAssetEvaluationSchema,
  type VisualAssetEvaluation,
} from "@/lib/visual/visual-asset-evaluation";
import { extractJsonObject } from "@/server/llm/extract-json";
import { getVisualAssetStorageRoot } from "@/server/storage/visual-asset-storage";

const VISION_SYSTEM = `You are a strict creative director reviewing a generated image for brand work.
You cannot know the full brand bible — use the VISUAL_SPEC excerpt and your visual judgment.
Output a single JSON object only. No markdown.

Fields:
- qualityVerdict: "STRONG" | "ACCEPTABLE" | "WEAK"
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
  brandAlignment: z.string().min(1),
  distinctiveness: z.string().min(1),
  compositionAssessment: z.string().min(1),
  emotionalAlignment: z.string().min(1),
  slopRisk: z.enum(["LOW", "MEDIUM", "HIGH"]),
  avoidListRespected: z.enum(["LIKELY", "UNCERTAIN", "LIKELY_VIOLATED"]),
  recommendations: z.array(z.string()).max(8),
  regenerationRecommended: z.boolean(),
});

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

  let visionPart: z.infer<typeof visionResponseSchema> | null = null;
  let evaluator = "deterministic";

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const visionModel =
    process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";

  if (openaiKey && asset.localPath) {
    try {
      const root = getVisualAssetStorageRoot();
      const abs = path.join(root, asset.localPath);
      const buf = await readFile(abs);
      const b64 = buf.toString("base64");
      const meta = asset.metadata as { mimeType?: string } | null;
      const mime = meta?.mimeType?.includes("jpeg")
        ? "image/jpeg"
        : "image/png";

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
          max_tokens: 900,
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
    } catch {
      evaluator = "deterministic";
    }
  } else if (!openaiKey) {
    evaluator = "skipped_no_provider";
  }

  const merged = mergeVerdicts(det, visionPart);

  const full: VisualAssetEvaluation = {
    qualityVerdict: merged.qualityVerdict,
    slopRisk: merged.slopRisk,
    regenerationRecommended: merged.regenerationRecommended,
    brandAlignment: visionPart?.brandAlignment ?? det.brandAlignment,
    distinctiveness: visionPart?.distinctiveness ?? det.distinctiveness,
    compositionAssessment:
      visionPart?.compositionAssessment ?? det.compositionAssessment,
    emotionalAlignment: visionPart?.emotionalAlignment ?? det.emotionalAlignment,
    avoidListRespected: visionPart?.avoidListRespected ?? det.avoidListRespected,
    recommendations: [
      ...det.recommendations,
      ...(visionPart?.recommendations ?? []),
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
}
