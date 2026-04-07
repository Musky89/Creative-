import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { visualSpecArtifactSchema } from "@/lib/artifacts/contracts";
import { extractVisualIdentityFromAsset } from "@/server/visual-identity/extract-visual-identity";
import { resolveVisualAssetAbsolutePath } from "@/server/storage/visual-asset-storage";
import { BRAND_STYLE_TRIGGER_WORD } from "./constants";
import type { PrismaClient } from "@/generated/prisma/client";

export type TrainingDatasetRow = {
  visualAssetId: string;
  caption: string;
  styleTags: string[];
  sortOrder: number;
};

function captionFromIdentity(args: {
  clientName: string;
  triggerLine: string;
  tags: string[];
}): string {
  const tagStr = args.tags.slice(0, 8).join(", ");
  return `${args.triggerLine}. ${args.clientName} brand campaign photography. ${tagStr}`.slice(
    0,
    480,
  );
}

/**
 * Build zip of images + sidecar .txt captions for fal fast training.
 */
export async function buildTrainingZipForAssets(
  db: PrismaClient,
  args: {
    clientId: string;
    clientName: string;
    visualAssetIds: string[];
  },
): Promise<{ buffer: Buffer; rows: TrainingDatasetRow[] }> {
  const zip = new JSZip();
  const rows: TrainingDatasetRow[] = [];

  const assets = await db.visualAsset.findMany({
    where: {
      id: { in: args.visualAssetIds },
      clientId: args.clientId,
      status: "COMPLETED",
      localPath: { not: null },
      founderRejected: false,
    },
    include: {
      sourceArtifact: true,
      review: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (assets.length !== args.visualAssetIds.length) {
    throw new Error("One or more images are not available for training (missing file or rejected).");
  }

  let order = 0;
  for (const a of assets) {
    if (!a.localPath) throw new Error(`Asset ${a.id} has no stored file.`);
    const abs = resolveVisualAssetAbsolutePath(a.localPath);
    const fileBuf = await readFile(abs);
    const ext = a.localPath.toLowerCase().endsWith(".jpg") ? "jpg" : "png";
    const base = `train_${order}_${a.id.slice(0, 8)}`;

    const specIdRaw = (a.sourceArtifact.content as Record<string, unknown>)
      .sourceVisualSpecId;
    const specId = typeof specIdRaw === "string" ? specIdRaw : null;
    let styleTags: string[] = [];

    if (specId) {
      const specArt = await db.artifact.findUnique({ where: { id: specId } });
      const raw =
        specArt?.content && typeof specArt.content === "object"
          ? ({ ...specArt.content } as Record<string, unknown>)
          : null;
      if (raw) {
        for (const k of Object.keys(raw)) {
          if (k.startsWith("_")) delete raw[k];
        }
        const parsed = visualSpecArtifactSchema.safeParse(raw);
        const ev = a.review?.evaluation;
        if (parsed.success) {
          const extracted = extractVisualIdentityFromAsset({
            visualSpec: parsed.data,
            promptUsed: a.promptUsed,
            promptPackageSnippet: String(
              (a.sourceArtifact.content as Record<string, unknown>).primaryPrompt ?? "",
            ),
            evaluation:
              ev && typeof ev === "object" ? (ev as Record<string, unknown>) : null,
          });
          styleTags = [
            ...extracted.lightingPatterns.slice(0, 3),
            ...extracted.compositionPatterns.slice(0, 2),
            ...extracted.colorSignatures.slice(0, 2),
            ...extracted.texturePatterns.slice(0, 2),
          ].filter(Boolean);
        }
      }
    }

    const triggerLine = `${BRAND_STYLE_TRIGGER_WORD} visual style`;
    const caption = captionFromIdentity({
      clientName: args.clientName,
      triggerLine,
      tags: styleTags.length ? styleTags : ["premium", "natural light", "campaign photography"],
    });

    zip.file(`${base}.${ext}`, fileBuf);
    zip.file(`${base}.txt`, caption);
    rows.push({
      visualAssetId: a.id,
      caption,
      styleTags,
      sortOrder: order,
    });
    order += 1;
  }

  const buffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return { buffer, rows };
}
