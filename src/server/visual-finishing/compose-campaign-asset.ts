/**
 * Minimal premium finishing: headline overlay, brand tint, light grain, vignette, subtle contrast.
 * Sharp + SVG text/vignette; procedural noise for grain.
 */
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { getPrisma } from "@/server/db/prisma";
import {
  resolveVisualAssetAbsolutePath,
  saveVisualAssetFile,
} from "@/server/storage/visual-asset-storage";
import type { BrandBible } from "@/generated/prisma/client";

export type TextPlacement = "top_left" | "center" | "bottom_safe";

export type ComposeCampaignAssetArgs = {
  sourceVisualAssetId: string;
  clientId: string;
  briefId: string;
  headline: string;
  placement?: TextPlacement;
  brandBible: Pick<
    BrandBible,
    "colorPhilosophy" | "visualStyle" | "compositionStyle"
  > | null;
  brandColors?: string[];
};

const MAX_EDGE = 1920;
const SAFE_X = 56;
const SAFE_BOTTOM = 140;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function extractBrandHexColors(text: string, max = 3): string[] {
  const re = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && found.length < max) {
    const full = m[0]!.toUpperCase();
    if (!found.includes(full)) found.push(full);
  }
  return found;
}

function wrapHeadlineLines(headline: string, maxCharsPerLine: number): string[] {
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [" "];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxCharsPerLine) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w.length > maxCharsPerLine ? w.slice(0, maxCharsPerLine) : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

function textBlockSvg(
  lines: string[],
  w: number,
  h: number,
  placement: TextPlacement,
  textColor: string,
): string {
  const fontSize = Math.round(Math.min(w, h) * 0.042);
  const lineHeight = fontSize * 1.22;
  const blockH = lines.length * lineHeight;
  let startY: number;
  let anchorX: number;
  let textAnchor: "start" | "middle" = "start";

  if (placement === "top_left") {
    anchorX = SAFE_X;
    startY = SAFE_X + fontSize;
  } else if (placement === "center") {
    anchorX = w / 2;
    startY = h / 2 - blockH / 2 + fontSize;
    textAnchor = "middle";
  } else {
    anchorX = SAFE_X;
    startY = h - SAFE_BOTTOM - blockH + fontSize;
  }

  const tspans = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<tspan x="${anchorX}" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  return `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="txtShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <text
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="600"
    fill="${textColor}"
    text-anchor="${textAnchor}"
    filter="url(#txtShadow)"
    letter-spacing="0.02em"
  >${tspans}</text>
</svg>`;
}

function vignetteSvg(w: number, h: number): string {
  return `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="vig" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.28"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#vig)"/>
</svg>`;
}

async function svgToPngBuffer(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function pickTextColor(backgroundHex: string | null): string {
  if (!backgroundHex) return "#FAFAFA";
  const h = backgroundHex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#141414" : "#F5F5F4";
}

/** Subtle luminance noise, full-frame RGBA */
async function grainPng(w: number, h: number): Promise<Buffer> {
  const channels = 4;
  const buf = Buffer.alloc(w * h * channels);
  for (let i = 0; i < buf.length; i += 4) {
    const n = 235 + Math.floor(Math.random() * 20);
    buf[i] = n;
    buf[i + 1] = n;
    buf[i + 2] = n;
    buf[i + 3] = 22;
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

function brandTintSvg(w: number, h: number, hex: string, opacity: number): string {
  return `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${hex}" opacity="${opacity}"/>
</svg>`;
}

/**
 * Composes a finished campaign still from a raw VisualAsset + headline + Brand OS.
 * Creates a new VisualAsset (variantLabel COMPOSED) for the same prompt package.
 */
export async function composeCampaignAsset(
  args: ComposeCampaignAssetArgs,
): Promise<{ id: string }> {
  const prisma = getPrisma();
  const source = await prisma.visualAsset.findFirst({
    where: {
      id: args.sourceVisualAssetId,
      clientId: args.clientId,
      briefId: args.briefId,
      status: "COMPLETED",
    },
    include: { sourceArtifact: true },
  });
  if (!source?.localPath) {
    throw new Error("Source visual asset not found or has no stored file.");
  }

  const meta = source.metadata as { composed?: boolean } | null;
  if (meta?.composed === true) {
    throw new Error("Cannot compose an already composed asset.");
  }

  await prisma.visualAsset.deleteMany({
    where: {
      briefId: args.briefId,
      sourceArtifactId: source.sourceArtifactId,
      variantLabel: "COMPOSED",
    },
  });

  const abs = resolveVisualAssetAbsolutePath(source.localPath);
  const inputBuf = await readFile(abs);

  let pipeline = sharp(inputBuf).rotate();
  const metaIn = await pipeline.metadata();
  let w = metaIn.width ?? 1024;
  let h = metaIn.height ?? 1024;
  if (Math.max(w, h) > MAX_EDGE) {
    pipeline = pipeline.resize({
      width: w >= h ? MAX_EDGE : undefined,
      height: h > w ? MAX_EDGE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  const resized = await pipeline.png().toBuffer();
  const after = await sharp(resized).metadata();
  w = after.width ?? w;
  h = after.height ?? h;

  const colorText = [
    args.brandBible?.colorPhilosophy ?? "",
    args.brandBible?.visualStyle ?? "",
  ].join(" ");
  const parsedColors = extractBrandHexColors(colorText);
  const brandHex = args.brandColors?.[0] ?? parsedColors[0] ?? null;

  const comp = args.brandBible?.compositionStyle?.toLowerCase() ?? "";
  const placement: TextPlacement =
    args.placement ??
    (comp.includes("center")
      ? "center"
      : comp.includes("bottom") || comp.includes("lower")
        ? "bottom_safe"
        : "top_left");

  const lines = wrapHeadlineLines(args.headline, Math.max(14, Math.floor(w / 28)));
  const textColor = pickTextColor(brandHex);

  const tuned = await sharp(resized)
    .modulate({ saturation: 0.96 })
    .gamma(1.02)
    .png()
    .toBuffer();

  const overlays: sharp.OverlayOptions[] = [];
  if (brandHex) {
    overlays.push({
      input: await svgToPngBuffer(brandTintSvg(w, h, brandHex, 0.08)),
      blend: "multiply",
    });
  }
  overlays.push({
    input: await svgToPngBuffer(vignetteSvg(w, h)),
    blend: "over",
  });
  overlays.push({
    input: await grainPng(w, h),
    blend: "overlay",
  });
  overlays.push({
    input: await svgToPngBuffer(
      textBlockSvg(lines, w, h, placement, textColor),
    ),
    blend: "over",
  });

  const composedBuffer = await sharp(tuned)
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const newAsset = await prisma.visualAsset.create({
    data: {
      clientId: args.clientId,
      briefId: args.briefId,
      taskId: source.taskId,
      sourceArtifactId: source.sourceArtifactId,
      providerTarget: source.providerTarget,
      providerName: "compose",
      modelName: "sharp-campaign",
      promptUsed: `[COMPOSED] headline: ${args.headline.slice(0, 500)}`,
      negativePromptUsed: "",
      status: "COMPLETED",
      variantLabel: "COMPOSED",
      regenerationAttempt: 0,
      isPreferred: false,
      isSecondary: false,
      autoRejected: false,
      founderRejected: false,
      metadata: {
        composed: true,
        sourceVisualAssetId: source.id,
        headline: args.headline,
        placement,
        brandTintHex: brandHex,
        textColor,
      } as object,
    },
  });

  const { relativePath } = await saveVisualAssetFile(newAsset.id, composedBuffer, "png");
  const resultUrl = `/api/visual-assets/${newAsset.id}/file`;

  await prisma.visualAsset.update({
    where: { id: newAsset.id },
    data: {
      resultUrl,
      localPath: relativePath,
      metadata: {
        composed: true,
        sourceVisualAssetId: source.id,
        headline: args.headline,
        placement,
        brandTintHex: brandHex,
        textColor,
        mimeType: "image/png",
      } as object,
    },
  });

  return { id: newAsset.id };
}
