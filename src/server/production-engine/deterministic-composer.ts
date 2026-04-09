/**
 * Server-only Sharp composer — real layer stack (raster + SVG text + optional logo).
 * FAL supplies hero/secondary rasters; platform owns layout and typography.
 */

import sharp from "sharp";
import type { ProductionEngineInput } from "@/lib/production-engine/types";
import type { CompositionPlanDocument } from "@/lib/production-engine/composition-plan-schema";
import type { CompositionLayerManifestEntry } from "@/lib/production-engine/composition-plan-schema";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textSvg(args: {
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
}): Buffer {
  const maxChars = Math.max(12, Math.floor(args.width / (args.fontSize * 0.55)));
  const t = escapeXml(
    args.text.length > maxChars
      ? `${args.text.slice(0, maxChars - 1)}…`
      : args.text,
  );
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${args.width}" height="${args.height}">
  <text x="6" y="${Math.min(args.height * 0.55, args.fontSize + 8)}"
    font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif"
    font-size="${args.fontSize}"
    font-weight="${args.fontWeight}"
    fill="${args.fill}">${t}</text>
</svg>`;
  return Buffer.from(svg);
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

function solidColorBuffer(
  w: number,
  h: number,
  hex: string,
): Promise<Buffer> {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r, g, b },
    },
  })
    .png()
    .toBuffer();
}

export type DeterministicComposeInput = {
  input: ProductionEngineInput;
  plan: CompositionPlanDocument;
  /** Primary FAL (or stub) image — http(s) URL or data URL. */
  heroImageUrl?: string | null;
  secondaryImageUrl?: string | null;
};

export type DeterministicComposeResult = {
  pngBuffer: Buffer;
  width: number;
  height: number;
};

export async function runDeterministicComposeSharp(
  args: DeterministicComposeInput,
): Promise<DeterministicComposeResult> {
  const { plan, input } = args;
  const W = plan.canvasWidth;
  const H = plan.canvasHeight;

  const bgHex = input.brandAssets?.colors?.find((c) => c.role === "background")?.hex ?? "#1a1a1c";
  let base = await solidColorBuffer(W, H, bgHex);

  const heroBuf = args.heroImageUrl
    ? await fetchBuffer(args.heroImageUrl)
    : null;
  if (heroBuf) {
    const fitted = await sharp(heroBuf)
      .resize(plan.heroPlacement.width, plan.heroPlacement.height, {
        fit: "cover",
        position: "attention",
      })
      .png()
      .toBuffer();
    base = await sharp(base)
      .composite([
        {
          input: fitted,
          left: Math.round(plan.heroPlacement.x),
          top: Math.round(plan.heroPlacement.y),
        },
      ])
      .png()
      .toBuffer();
  } else {
    const placeholder = await sharp({
      create: {
        width: plan.heroPlacement.width,
        height: plan.heroPlacement.height,
        channels: 3,
        background: { r: 45, g: 45, b: 52 },
      },
    })
      .png()
      .toBuffer();
    base = await sharp(base)
      .composite([
        {
          input: placeholder,
          left: Math.round(plan.heroPlacement.x),
          top: Math.round(plan.heroPlacement.y),
        },
      ])
      .png()
      .toBuffer();
  }

  if (plan.secondaryPlacement && args.secondaryImageUrl) {
    const sec = await fetchBuffer(args.secondaryImageUrl);
    if (sec) {
      const fitted = await sharp(sec)
        .resize(
          plan.secondaryPlacement.width,
          plan.secondaryPlacement.height,
          { fit: "cover" },
        )
        .png()
        .toBuffer();
      base = await sharp(base)
        .composite([
          {
            input: fitted,
            left: Math.round(plan.secondaryPlacement.x),
            top: Math.round(plan.secondaryPlacement.y),
          },
        ])
        .png()
        .toBuffer();
    }
  }

  for (const f of plan.finishingLayers) {
    if (f.kind === "SCRIM") {
      const op = f.opacity ?? 0.4;
      const scrimH =
        f.id === "bottom-scrim" ? Math.floor(H * 0.34) : Math.floor(H * 0.45);
      const top = f.id === "bottom-scrim" ? H - scrimH : 0;
      const grad = Buffer.from(
        `<svg width="${W}" height="${scrimH}">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#000" stop-opacity="0"/>
              <stop offset="100%" stop-color="#000" stop-opacity="${op}"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>`,
      );
      const scrimPng = await sharp(grad).png().toBuffer();
      base = await sharp(base)
        .composite([{ input: scrimPng, left: 0, top, blend: "over" }])
        .png()
        .toBuffer();
    }
  }

  const hl = plan.headlinePlacement;
  const headlineSvg = textSvg({
    width: hl.width,
    height: hl.height,
    text: input.selectedHeadline,
    fontSize: Math.max(18, Math.floor(hl.height * 0.42)),
    fontWeight: 700,
    fill: "#f4f4f5",
  });
  base = await sharp(base)
    .composite([
      {
        input: headlineSvg,
        left: Math.round(hl.x),
        top: Math.round(hl.y),
      },
    ])
    .png()
    .toBuffer();

  const ct = plan.ctaPlacement;
  const ctaSvg = textSvg({
    width: ct.width,
    height: ct.height,
    text: input.selectedCta,
    fontSize: Math.max(14, Math.floor(ct.height * 0.38)),
    fontWeight: 600,
    fill: "#a1a1aa",
  });
  base = await sharp(base)
    .composite([
      {
        input: ctaSvg,
        left: Math.round(ct.x),
        top: Math.round(ct.y),
      },
    ])
    .png()
    .toBuffer();

  const lg = plan.logoPlacement;
  const logoUrl = input.brandAssets?.logoUrl?.trim();
  if (logoUrl) {
    const logoBuf = await fetchBuffer(logoUrl);
    if (logoBuf) {
      const fitted = await sharp(logoBuf)
        .resize(lg.width, lg.height, { fit: "inside" })
        .png()
        .toBuffer();
      const meta = await sharp(fitted).metadata();
      const lw = meta.width ?? lg.width;
      const lh = meta.height ?? lg.height;
      const lx = Math.round(lg.x + (lg.width - lw) / 2);
      const ly = Math.round(lg.y + (lg.height - lh) / 2);
      base = await sharp(base)
        .composite([{ input: fitted, left: lx, top: ly }])
        .png()
        .toBuffer();
    }
  } else {
    const markSvg = textSvg({
      width: lg.width,
      height: lg.height,
      text: "BRAND",
      fontSize: Math.max(12, Math.floor(lg.height * 0.35)),
      fontWeight: 500,
      fill: "#71717a",
    });
    base = await sharp(base)
      .composite([
        { input: markSvg, left: Math.round(lg.x), top: Math.round(lg.y) },
      ])
      .png()
      .toBuffer();
  }

  const pngBuffer = await sharp(base).png({ compressionLevel: 6 }).toBuffer();
  return { pngBuffer, width: W, height: H };
}

export function manifestToJson(manifest: CompositionLayerManifestEntry[]): string {
  return JSON.stringify(manifest, null, 2);
}
