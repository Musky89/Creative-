/**
 * Final Output Composer — format-aware hero + headline + CTA + optional logo,
 * high-res scale, and a layer manifest for future PSD/FIG layered export.
 */
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { getPrisma } from "@/server/db/prisma";
import {
  resolveVisualAssetAbsolutePath,
  saveVisualAssetFile,
} from "@/server/storage/visual-asset-storage";
import type { BrandBible } from "@/generated/prisma/client";
import {
  FINAL_OUTPUT_FORMATS,
  FINAL_OUTPUT_HIGH_RES_SCALE,
  type FinalOutputFormatId,
} from "@/lib/visual-finishing/final-output-formats";
export type TextPlacement = "top_left" | "center" | "bottom_safe";

function extractBrandHexColors(text: string, max = 3): string[] {
  const re = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && found.length < max) {
    const full = m[0]!.toUpperCase();
    if (!found.includes(full)) found.push(full);
  }
  return found;
}

export type FinalOutputLayerManifestEntry = {
  id: string;
  role: "hero" | "brand_tint" | "vignette" | "grain" | "headline" | "cta" | "logo";
  /** Future: relative file path per layer; null when baked into single PNG. */
  exportHint: string | null;
};

export type ComposeFinalOutputArgs = {
  sourceVisualAssetId: string;
  clientId: string;
  briefId: string;
  headline: string;
  ctaText?: string | null;
  /** Optional client logo (PNG/SVG URL) — top-right safe zone. */
  logoUrl?: string | null;
  placement?: TextPlacement;
  format: FinalOutputFormatId;
  /** Pixel scale on format base dimensions (default FINAL_OUTPUT_HIGH_RES_SCALE for deliverables). */
  highResScale?: number;
  brandBible: Pick<
    BrandBible,
    "colorPhilosophy" | "visualStyle" | "compositionStyle"
  > | null;
  brandColors?: string[];
};

const LEGACY_MAX_EDGE = 1920;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
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
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines.slice(0, maxLines);
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

async function svgToPngBuffer(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer();
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
 * Headline + optional CTA in one SVG — bottom-weighted hierarchy with safe margins.
 */
function headlineCtaSvg(args: {
  w: number;
  h: number;
  safe: number;
  headlineLines: string[];
  ctaLine: string | null;
  textColor: string;
  headlineSize: number;
  ctaSize: number;
}): string {
  const { w, h, safe, headlineLines, ctaLine, textColor, headlineSize, ctaSize } =
    args;
  const lineH = headlineSize * 1.2;
  const ctaH = ctaLine ? ctaSize * 1.35 : 0;
  const gap = Math.round(headlineSize * 0.35);
  const blockH = headlineLines.length * lineH + (ctaLine ? gap + ctaH : 0);
  const bottomY = h - safe;
  const startY = bottomY - blockH;

  const headlineTspans = headlineLines
    .map((line, i) => {
      const y = startY + headlineSize + i * lineH;
      return `<tspan x="${safe}" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const ctaEl = ctaLine
    ? `<text
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="${ctaSize}"
    font-weight="600"
    fill="${textColor}"
    opacity="0.92"
    letter-spacing="0.04em"
    text-transform="uppercase"
  ><tspan x="${safe}" y="${startY + headlineLines.length * lineH + gap + ctaSize}">${escapeXml(ctaLine)}</tspan></text>`
    : "";

  return `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="txtShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <text
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="${headlineSize}"
    font-weight="700"
    fill="${textColor}"
    text-anchor="start"
    filter="url(#txtShadow)"
    letter-spacing="0.015em"
  >${headlineTspans}</text>
  ${ctaEl}
</svg>`;
}

/** Legacy: headline only, placement-based (top/center/bottom). */
function legacyHeadlineSvg(
  lines: string[],
  w: number,
  h: number,
  placement: TextPlacement,
  textColor: string,
): string {
  const fontSize = Math.round(Math.min(w, h) * 0.042);
  const lineHeight = fontSize * 1.22;
  const blockH = lines.length * lineHeight;
  const SAFE_X = 56;
  const SAFE_BOTTOM = 140;
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

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 12_000);
    const res = await fetch(url, { signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function composeFinalOutput(
  args: ComposeFinalOutputArgs,
): Promise<{ id: string; variantLabel: string }> {
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

  const scale = args.highResScale ?? FINAL_OUTPUT_HIGH_RES_SCALE;
  const isLegacy = args.format === "CAMPAIGN_DEFAULT";

  const variantLabel = isLegacy
    ? "COMPOSED"
    : `COMPOSED_${args.format}`;

  await prisma.visualAsset.deleteMany({
    where: {
      briefId: args.briefId,
      sourceArtifactId: source.sourceArtifactId,
      variantLabel,
    },
  });

  const abs = resolveVisualAssetAbsolutePath(source.localPath);
  const inputBuf = await readFile(abs);

  const colorText = [
    args.brandBible?.colorPhilosophy ?? "",
    args.brandBible?.visualStyle ?? "",
  ].join(" ");
  const parsedColors = extractBrandHexColors(colorText);
  const brandHex = args.brandColors?.[0] ?? parsedColors[0] ?? null;
  const textColor = pickTextColor(brandHex);

  const comp = args.brandBible?.compositionStyle?.toLowerCase() ?? "";
  const placement: TextPlacement =
    args.placement ??
    (comp.includes("center")
      ? "center"
      : comp.includes("bottom") || comp.includes("lower")
        ? "bottom_safe"
        : "top_left");

  let w: number;
  let h: number;
  let baseBuffer: Buffer;

  if (isLegacy) {
    let pipeline = sharp(inputBuf).rotate();
    const metaIn = await pipeline.metadata();
    const iw = metaIn.width ?? 1024;
    const ih = metaIn.height ?? 1024;
    if (Math.max(iw, ih) > LEGACY_MAX_EDGE) {
      pipeline = pipeline.resize({
        width: iw >= ih ? LEGACY_MAX_EDGE : undefined,
        height: ih > iw ? LEGACY_MAX_EDGE : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    baseBuffer = await pipeline.png().toBuffer();
    const after = await sharp(baseBuffer).metadata();
    w = after.width ?? iw;
    h = after.height ?? ih;
  } else {
    const fmt = args.format as Exclude<FinalOutputFormatId, "CAMPAIGN_DEFAULT">;
    const spec = FINAL_OUTPUT_FORMATS[fmt];
    const outW = spec.baseW * scale;
    const outH = spec.baseH * scale;
    baseBuffer = await sharp(inputBuf)
      .rotate()
      .resize(outW, outH, { fit: "cover", position: "attention" })
      .png()
      .toBuffer();
    const m = await sharp(baseBuffer).metadata();
    w = m.width ?? outW;
    h = m.height ?? outH;
  }

  const tuned = await sharp(baseBuffer)
    .modulate({ saturation: 0.96 })
    .gamma(1.02)
    .png()
    .toBuffer();

  const overlays: sharp.OverlayOptions[] = [];
  const manifest: FinalOutputLayerManifestEntry[] = [
    { id: "hero", role: "hero", exportHint: "source_photo_cover" },
  ];

  if (brandHex) {
    overlays.push({
      input: await svgToPngBuffer(brandTintSvg(w, h, brandHex, 0.08)),
      blend: "multiply",
    });
    manifest.push({ id: "brand_tint", role: "brand_tint", exportHint: null });
  }
  overlays.push({
    input: await svgToPngBuffer(vignetteSvg(w, h)),
    blend: "over",
  });
  manifest.push({ id: "vignette", role: "vignette", exportHint: null });

  overlays.push({
    input: await grainPng(w, h),
    blend: "overlay",
  });
  manifest.push({ id: "grain", role: "grain", exportHint: null });

  const ctaRaw = args.ctaText?.trim() || null;
  const ctaLine =
    ctaRaw && ctaRaw.length > 48 ? `${ctaRaw.slice(0, 45)}…` : ctaRaw;

  if (isLegacy) {
    const lines = wrapLines(
      args.headline,
      Math.max(14, Math.floor(w / 28)),
      4,
    );
    overlays.push({
      input: await svgToPngBuffer(
        legacyHeadlineSvg(lines, w, h, placement, textColor),
      ),
      blend: "over",
    });
    manifest.push({ id: "headline", role: "headline", exportHint: null });
  } else {
    const fmt = args.format as Exclude<FinalOutputFormatId, "CAMPAIGN_DEFAULT">;
    const spec = FINAL_OUTPUT_FORMATS[fmt];
    const safe = Math.round(Math.min(w, h) * spec.safeInset);
    const hlLines = wrapLines(
      args.headline,
      spec.headlineCharsPerLine,
      spec.maxHeadlineLines,
    );
    const minDim = Math.min(w, h);
    const headlineSize = Math.round(
      fmt === "OOH" ? minDim * 0.055 : minDim * 0.048,
    );
    const ctaSize = Math.round(headlineSize * 0.4);
    overlays.push({
      input: await svgToPngBuffer(
        headlineCtaSvg({
          w,
          h,
          safe,
          headlineLines: hlLines,
          ctaLine,
          textColor,
          headlineSize,
          ctaSize,
        }),
      ),
      blend: "over",
    });
    manifest.push({ id: "headline", role: "headline", exportHint: null });
    if (ctaLine) {
      manifest.push({ id: "cta", role: "cta", exportHint: null });
    }

    if (args.logoUrl?.trim()) {
      const logoBuf = await fetchLogoBuffer(args.logoUrl.trim());
      if (logoBuf) {
        try {
          const maxLogoW = Math.round(w * 0.2);
          const margin = safe;
          const logoPng = await sharp(logoBuf)
            .resize({ width: maxLogoW, height: maxLogoW, fit: "inside" })
            .ensureAlpha()
            .png()
            .toBuffer();
          const lm = await sharp(logoPng).metadata();
          const lw = lm.width ?? maxLogoW;
          const lx = w - margin - lw;
          const ly = margin;
          overlays.push({
            input: logoPng,
            left: lx,
            top: ly,
            blend: "over",
          });
          manifest.push({ id: "logo", role: "logo", exportHint: "client_logo_png" });
        } catch {
          /* skip bad logo */
        }
      }
    }
  }

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
      providerName: "final-output-composer",
      modelName: isLegacy ? "sharp-campaign" : `sharp-${args.format.toLowerCase()}`,
      promptUsed: `[COMPOSED:${variantLabel}] ${args.headline.slice(0, 400)}${ctaLine ? ` | CTA: ${ctaLine}` : ""}`,
      negativePromptUsed: "",
      status: "COMPLETED",
      variantLabel,
      regenerationAttempt: 0,
      isPreferred: false,
      isSecondary: false,
      autoRejected: false,
      founderRejected: false,
      metadata: {
        composed: true,
        finalOutputComposer: true,
        sourceVisualAssetId: source.id,
        headline: args.headline,
        cta: ctaLine,
        format: args.format,
        highResScale: isLegacy ? 1 : scale,
        placement: isLegacy ? placement : "bottom_stack",
        brandTintHex: brandHex,
        textColor,
        logoUrl: args.logoUrl?.trim() || null,
        layerManifest: manifest,
        layeredExportReady: true,
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
        finalOutputComposer: true,
        sourceVisualAssetId: source.id,
        headline: args.headline,
        cta: ctaLine,
        format: args.format,
        highResScale: isLegacy ? 1 : scale,
        placement: isLegacy ? placement : "bottom_stack",
        brandTintHex: brandHex,
        textColor,
        logoUrl: args.logoUrl?.trim() || null,
        layerManifest: manifest,
        layeredExportReady: true,
        mimeType: "image/png",
      } as object,
    },
  });

  return { id: newAsset.id, variantLabel };
}
