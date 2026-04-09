/**
 * Server-only Sharp composer — real layer stack (raster + SVG text + optional logo).
 * FAL supplies hero/secondary rasters; platform owns layout and typography.
 */

import sharp from "sharp";
import type { ProductionEngineInput } from "@/lib/production-engine/types";
import type { CompositionPlanDocument } from "@/lib/production-engine/composition-plan-schema";
import type { CompositionLayerManifestEntry } from "@/lib/production-engine/composition-plan-schema";
import {
  packagingComposerCopy,
  retailPosComposerCopy,
} from "@/lib/production-engine/mode-packaging-retail";

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
  /** Override platform type (e.g. SOCIAL variant headline/CTA). */
  headlineText?: string;
  ctaText?: string;
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
            blend: "over",
          },
        ])
        .png()
        .toBuffer();
    }
  }

  if (input.mode === "PACKAGING" && plan.packagingLayout) {
    const bandHex = String(
      plan.modeSpecificConstraints.packagingBandHex ?? "#52525b",
    );
    const b = plan.packagingLayout.variantBand;
    const bandBuf = await solidColorBuffer(b.width, b.height, bandHex);
    base = await sharp(base)
      .composite([
        { input: bandBuf, left: Math.round(b.x), top: Math.round(b.y) },
      ])
      .png()
      .toBuffer();
    const ribbon = String(plan.modeSpecificConstraints.packagingRibbon ?? "").trim();
    if (ribbon) {
      const ribSvg = textSvg({
        width: b.width - 16,
        height: b.height - 8,
        text: ribbon,
        fontSize: Math.min(22, Math.floor(b.height * 0.42)),
        fontWeight: 800,
        fill: "#fafafa",
      });
      base = await sharp(base)
        .composite([
          {
            input: ribSvg,
            left: Math.round(b.x + 8),
            top: Math.round(b.y + 4),
          },
        ])
        .png()
        .toBuffer();
    }
  }

  for (const f of plan.finishingLayers) {
    if (f.kind === "SCRIM") {
      const op = f.opacity ?? 0.4;
      if (f.id === "ooh-readability-scrim") {
        const sw = Math.floor(W * 0.42);
        const grad = Buffer.from(
          `<svg width="${sw}" height="${H}">
          <defs>
            <linearGradient id="og" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#000" stop-opacity="${op}"/>
              <stop offset="100%" stop-color="#000" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#og)"/>
        </svg>`,
        );
        const scrimPng = await sharp(grad).png().toBuffer();
        base = await sharp(base)
          .composite([{ input: scrimPng, left: 0, top: 0, blend: "over" }])
          .png()
          .toBuffer();
        continue;
      }
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

  function oohShortHeadline(s: string): string {
    const words = s.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 8) return s.trim();
    return `${words.slice(0, 8).join(" ")}…`;
  }

  const packCopy =
    input.mode === "PACKAGING"
      ? packagingComposerCopy({
          selectedHeadline: input.selectedHeadline,
          selectedCta: input.selectedCta,
          supportingCopy: input.supportingCopy,
          selectedConceptName: input.selectedConcept.conceptName,
        })
      : null;
  const retailCopy =
    input.mode === "RETAIL_POS"
      ? retailPosComposerCopy({
          selectedHeadline: input.selectedHeadline,
          selectedCta: input.selectedCta,
          supportingCopy: input.supportingCopy,
        })
      : null;

  const headlineStr =
    args.headlineText?.trim() ??
    (input.mode === "OOH"
      ? oohShortHeadline(input.selectedHeadline)
      : input.mode === "PACKAGING" && packCopy
        ? packCopy.brandLine
        : input.mode === "RETAIL_POS" && retailCopy
          ? retailCopy.promoHeadline
          : input.selectedHeadline);
  const ctaStr =
    args.ctaText?.trim() ??
    (input.mode === "PACKAGING" && packCopy
      ? packCopy.primaryClaim
      : input.mode === "RETAIL_POS" && retailCopy
        ? retailCopy.offerLine
        : input.selectedCta);

  const hl = plan.headlinePlacement;
  const headlineSvg = textSvg({
    width: hl.width,
    height: hl.height,
    text: headlineStr,
    fontSize: Math.max(
      16,
      Math.floor(
        hl.height *
          (input.mode === "PACKAGING" ? 0.36 : input.mode === "RETAIL_POS" ? 0.4 : 0.42),
      ),
    ),
    fontWeight: input.mode === "RETAIL_POS" ? 800 : 700,
    fill: input.mode === "PACKAGING" ? "#18181b" : "#f4f4f5",
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
    text:
      input.mode === "OOH"
        ? ctaStr.split(/\s+/).slice(0, 5).join(" ")
        : ctaStr,
    fontSize: Math.max(
      13,
      Math.floor(ct.height * (input.mode === "PACKAGING" ? 0.34 : 0.38)),
    ),
    fontWeight: 600,
    fill: input.mode === "PACKAGING" ? "#3f3f46" : "#a1a1aa",
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

  if (input.mode === "PACKAGING" && plan.packagingLayout && packCopy) {
    const sec = plan.packagingLayout.secondaryClaim;
    const secSvg = textSvg({
      width: sec.width,
      height: sec.height,
      text: packCopy.secondaryClaim,
      fontSize: Math.max(12, Math.floor(sec.height * 0.32)),
      fontWeight: 500,
      fill: "#52525b",
    });
    base = await sharp(base)
      .composite([
        { input: secSvg, left: Math.round(sec.x), top: Math.round(sec.y) },
      ])
      .png()
      .toBuffer();
    const leg = plan.packagingLayout.legalStrip;
    const legSvg = textSvg({
      width: leg.width,
      height: leg.height,
      text: "NUTRITION / INGREDIENTS / LEGAL — PLACEHOLDER (composer zone)",
      fontSize: Math.max(10, Math.floor(leg.height * 0.28)),
      fontWeight: 400,
      fill: "#71717a",
    });
    base = await sharp(base)
      .composite([
        { input: legSvg, left: Math.round(leg.x), top: Math.round(leg.y) },
      ])
      .png()
      .toBuffer();
  }

  if (input.mode === "RETAIL_POS" && plan.retailLayout && retailCopy) {
    const urg = plan.retailLayout.urgencyStrip;
    const urgSvg = textSvg({
      width: urg.width,
      height: urg.height,
      text: retailCopy.urgencyLine,
      fontSize: Math.max(12, Math.floor(urg.height * 0.36)),
      fontWeight: 700,
      fill: "#fca5a5",
    });
    base = await sharp(base)
      .composite([
        { input: urgSvg, left: Math.round(urg.x), top: Math.round(urg.y) },
      ])
      .png()
      .toBuffer();
  }

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
