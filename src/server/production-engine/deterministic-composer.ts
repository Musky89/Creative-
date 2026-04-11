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
import type { IdentityRouteKey } from "@/lib/production-engine/mode-identity-fashion-export";
import {
  fontFaceBlockForSvg,
  fontFamilyCss,
  resolveTypographyForRole,
  type ResolvedFont,
} from "@/lib/production-engine/typography-resolve";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Attribute-safe (double-quoted) — keep single quotes for CSS font stacks */
function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function textSvg(args: {
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  resolvedFont?: ResolvedFont;
}): Buffer {
  const maxChars = Math.max(12, Math.floor(args.width / (args.fontSize * 0.55)));
  const t = escapeXml(
    args.text.length > maxChars
      ? `${args.text.slice(0, maxChars - 1)}…`
      : args.text,
  );
  const ff = args.resolvedFont
    ? fontFaceBlockForSvg(args.resolvedFont)
    : "";
  const fam = fontFamilyCss(args.resolvedFont ?? { kind: "default" });
  const defs = ff
    ? `<defs><style type="text/css"><![CDATA[${ff}]]></style></defs>`
    : "";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${args.width}" height="${args.height}">
  ${defs}
  <text x="6" y="${Math.min(args.height * 0.55, args.fontSize + 8)}"
    font-family="${escapeXmlAttr(fam)}"
    font-size="${args.fontSize}"
    font-weight="${args.fontWeight}"
    fill="${args.fill}">${t}</text>
</svg>`;
  return Buffer.from(svg);
}

function multilineTextSvg(args: {
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  lineHeight: number;
  resolvedFont?: ResolvedFont;
}): Buffer {
  const maxChars = Math.max(16, Math.floor(args.width / (args.fontSize * 0.52)));
  const rawLines = args.text.split(/\n/).flatMap((para) => {
    const words = para.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > maxChars) {
        if (cur) lines.push(cur);
        cur = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  });
  const maxLines = Math.max(
    1,
    Math.floor(args.height / args.lineHeight) - 1,
  );
  const lines = rawLines.slice(0, maxLines);
  const tspans = lines
    .map((line, i) => {
      const y = args.fontSize + 4 + i * args.lineHeight;
      const t = escapeXml(line);
      return `<tspan x="6" y="${y}">${t}</tspan>`;
    })
    .join("");
  const ff = args.resolvedFont
    ? fontFaceBlockForSvg(args.resolvedFont)
    : "";
  const fam = fontFamilyCss(args.resolvedFont ?? { kind: "default" });
  const defs = ff
    ? `<defs><style type="text/css"><![CDATA[${ff}]]></style></defs>`
    : "";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${args.width}" height="${args.height}">
  ${defs}
  <text font-family="${escapeXmlAttr(fam)}"
    font-size="${args.fontSize}"
    font-weight="${args.fontWeight}"
    fill="${args.fill}">${tspans}</text>
</svg>`;
  return Buffer.from(svg);
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        // Wikimedia and some CDNs return 403/429 without a normal browser UA
        "User-Agent":
          "Mozilla/5.0 (compatible; CreativeProductionEngine/1.0; +https://github.com/)",
        Accept: "image/*,*/*;q=0.8",
      },
    });
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
  /** IDENTITY: route C tile; ECOMMERCE_FASHION: optional detail inset. */
  tertiaryImageUrl?: string | null;
  /** EXPORT_PRESENTATION: active slide content (title/body). */
  exportDeckSection?: { id: string; title: string; body: string } | null;
  identityRouteHighlight?: IdentityRouteKey;
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

  const headlineWeight = input.mode === "RETAIL_POS" ? 800 : 700;
  const headlineFont = await resolveTypographyForRole(
    input.brandAssets,
    "headline",
    headlineWeight,
  );
  const ctaFont = await resolveTypographyForRole(input.brandAssets, "cta", 600);
  const bodyFont = await resolveTypographyForRole(input.brandAssets, "body", 500);

  const bgHex = input.brandAssets?.colors?.find((c) => c.role === "background")?.hex ?? "#1a1a1c";
  let base = await solidColorBuffer(W, H, bgHex);

  async function placeRasterInRect(
    buf: Buffer | null,
    rect: { x: number; y: number; width: number; height: number },
  ): Promise<void> {
    if (buf) {
      const fitted = await sharp(buf)
        .resize(rect.width, rect.height, { fit: "cover", position: "attention" })
        .png()
        .toBuffer();
      base = await sharp(base)
        .composite([
          { input: fitted, left: Math.round(rect.x), top: Math.round(rect.y) },
        ])
        .png()
        .toBuffer();
      return;
    }
    const placeholder = await sharp({
      create: {
        width: rect.width,
        height: rect.height,
        channels: 3,
        background: { r: 45, g: 45, b: 52 },
      },
    })
      .png()
      .toBuffer();
    base = await sharp(base)
      .composite([
        { input: placeholder, left: Math.round(rect.x), top: Math.round(rect.y) },
      ])
      .png()
      .toBuffer();
  }

  if (input.mode === "IDENTITY" && plan.identityLayout) {
    const il = plan.identityLayout;
    const urls = [
      args.heroImageUrl,
      args.secondaryImageUrl,
      args.tertiaryImageUrl,
    ];
    const rects = [il.routeA, il.routeB, il.routeC];
    for (let i = 0; i < 3; i++) {
      const u = urls[i]?.trim();
      const b = u ? await fetchBuffer(u) : null;
      await placeRasterInRect(b, rects[i]!);
    }
    const hi = args.identityRouteHighlight ?? input.identityRouteHighlight;
    if (hi) {
      const rect =
        hi === "ROUTE_A" ? il.routeA : hi === "ROUTE_B" ? il.routeB : il.routeC;
      const stroke = Buffer.from(
        `<svg width="${rect.width}" height="${rect.height}">
          <rect x="2" y="2" width="${rect.width - 4}" height="${rect.height - 4}"
            fill="none" stroke="#fbbf24" stroke-width="4"/>
        </svg>`,
      );
      const strokePng = await sharp(stroke).png().toBuffer();
      base = await sharp(base)
        .composite([
          {
            input: strokePng,
            left: Math.round(rect.x),
            top: Math.round(rect.y),
            blend: "over",
          },
        ])
        .png()
        .toBuffer();
    }
  } else {
    const heroBuf = args.heroImageUrl
      ? await fetchBuffer(args.heroImageUrl)
      : null;
    await placeRasterInRect(heroBuf, plan.heroPlacement);

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

    if (
      input.mode === "ECOMMERCE_FASHION" &&
      plan.fashionLayout?.detailCrop &&
      args.tertiaryImageUrl?.trim()
    ) {
      const dc = plan.fashionLayout.detailCrop;
      const detailBuf = await fetchBuffer(args.tertiaryImageUrl.trim());
      if (detailBuf) {
        const fitted = await sharp(detailBuf)
          .resize(dc.width, dc.height, { fit: "cover" })
          .png()
          .toBuffer();
        base = await sharp(base)
          .composite([
            {
              input: fitted,
              left: Math.round(dc.x),
              top: Math.round(dc.y),
              blend: "over",
            },
          ])
          .png()
          .toBuffer();
      }
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
        resolvedFont: headlineFont,
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

  const exportSection = args.exportDeckSection;
  const headlineStr =
    args.headlineText?.trim() ??
    (input.mode === "EXPORT_PRESENTATION" && exportSection
      ? exportSection.title
      : input.mode === "IDENTITY"
        ? input.selectedConcept.conceptName
        : input.mode === "OOH"
          ? oohShortHeadline(input.selectedHeadline)
          : input.mode === "PACKAGING" && packCopy
            ? packCopy.brandLine
            : input.mode === "RETAIL_POS" && retailCopy
              ? retailCopy.promoHeadline
              : input.selectedHeadline);
  const ctaStr =
    args.ctaText?.trim() ??
    (input.mode === "EXPORT_PRESENTATION" && exportSection
      ? exportSection.body.split("\n")[0]?.trim().slice(0, 120) ||
        input.selectedHeadline.slice(0, 80)
      : input.mode === "IDENTITY"
        ? `Exploration board · ${input.visualDirection.slice(0, 90)}${input.visualDirection.length > 90 ? "…" : ""}`
        : input.mode === "PACKAGING" && packCopy
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
          (input.mode === "PACKAGING"
            ? 0.36
            : input.mode === "RETAIL_POS"
              ? 0.4
              : input.mode === "IDENTITY" || input.mode === "EXPORT_PRESENTATION"
                ? 0.38
                : 0.42),
      ),
    ),
    fontWeight: input.mode === "RETAIL_POS" ? 800 : 700,
    fill:
      input.mode === "PACKAGING" || input.mode === "IDENTITY"
        ? "#18181b"
        : "#f4f4f5",
    resolvedFont: headlineFont,
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
    fill:
      input.mode === "PACKAGING" || input.mode === "IDENTITY"
        ? "#3f3f46"
        : "#a1a1aa",
    resolvedFont: ctaFont,
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

  if (input.mode === "IDENTITY" && plan.identityLayout) {
    const il = plan.identityLayout;
    const strat = multilineTextSvg({
      width: il.strategyStrip.width,
      height: il.strategyStrip.height,
      text: `Strategy · ${input.briefSummary.slice(0, 320)}${input.briefSummary.length > 320 ? "…" : ""}`,
      fontSize: Math.max(11, Math.floor(il.strategyStrip.height * 0.26)),
      fontWeight: 500,
      fill: "#27272a",
      lineHeight: Math.max(14, Math.floor(il.strategyStrip.height * 0.32)),
      resolvedFont: bodyFont,
    });
    base = await sharp(base)
      .composite([
        {
          input: strat,
          left: Math.round(il.strategyStrip.x),
          top: Math.round(il.strategyStrip.y),
        },
      ])
      .png()
      .toBuffer();
    const labels: { rect: typeof il.routeLabelA; text: string }[] = [
      { rect: il.routeLabelA, text: "Route A — geometric mark" },
      { rect: il.routeLabelB, text: "Route B — wordmark-forward" },
      { rect: il.routeLabelC, text: "Route C — combination lockup study" },
    ];
    for (const { rect, text } of labels) {
      const lb = textSvg({
        width: rect.width,
        height: rect.height,
        text,
        fontSize: Math.max(11, Math.floor(rect.height * 0.42)),
        fontWeight: 700,
        fill: "#18181b",
        resolvedFont: headlineFont,
      });
      base = await sharp(base)
        .composite([
          { input: lb, left: Math.round(rect.x), top: Math.round(rect.y) },
        ])
        .png()
        .toBuffer();
    }
  }

  if (
    input.mode === "EXPORT_PRESENTATION" &&
    plan.exportLayout &&
    exportSection
  ) {
    const body = multilineTextSvg({
      width: plan.exportLayout.bodyCopy.width,
      height: plan.exportLayout.bodyCopy.height,
      text: exportSection.body,
      fontSize: 18,
      fontWeight: 400,
      fill: "#e4e4e7",
      lineHeight: 24,
      resolvedFont: bodyFont,
    });
    base = await sharp(base)
      .composite([
        {
          input: body,
          left: Math.round(plan.exportLayout.bodyCopy.x),
          top: Math.round(plan.exportLayout.bodyCopy.y),
        },
      ])
      .png()
      .toBuffer();
    const foot = textSvg({
      width: plan.exportLayout.footerStrip.width,
      height: plan.exportLayout.footerStrip.height,
      text: `${exportSection.id} · ${input.selectedConcept.conceptName}`,
      fontSize: Math.max(11, Math.floor(plan.exportLayout.footerStrip.height * 0.36)),
      fontWeight: 500,
      fill: "#71717a",
      resolvedFont: bodyFont,
    });
    base = await sharp(base)
      .composite([
        {
          input: foot,
          left: Math.round(plan.exportLayout.footerStrip.x),
          top: Math.round(plan.exportLayout.footerStrip.y),
        },
      ])
      .png()
      .toBuffer();
  }

  if (input.mode === "PACKAGING" && plan.packagingLayout && packCopy) {
    const sec = plan.packagingLayout.secondaryClaim;
    const secSvg = textSvg({
      width: sec.width,
      height: sec.height,
      text: packCopy.secondaryClaim,
      fontSize: Math.max(12, Math.floor(sec.height * 0.32)),
      fontWeight: 500,
      fill: "#52525b",
      resolvedFont: bodyFont,
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
      resolvedFont: bodyFont,
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
      resolvedFont: headlineFont,
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
      resolvedFont: headlineFont,
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
