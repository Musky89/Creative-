/**
 * Resolves brand typography for deterministic SVG text in the Sharp composer.
 * - public_catalog + google_fonts: fetches WOFF2 from Google Fonts (server-side) and embeds @font-face
 * - client_upload: embeds uploaded font file (data URL or https) as @font-face
 *
 * Portable module: no orchestrator imports.
 */

import type { BrandAssetsInput } from "./types";

export type TypographyRole = "headline" | "body" | "cta" | "display";

export type ResolvedFont =
  | { kind: "default" }
  | {
      kind: "embedded";
      /** Safe CSS font-family name */
      cssFamily: string;
      /** Full @font-face rule(s) to inject in SVG <defs><style> */
      fontFaceCss: string;
    };

const DEFAULT_STACK =
  "DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";

function sanitizeCssFamilyToken(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "BrandFont";
}

function pickFontEntry(
  assets: BrandAssetsInput | undefined,
  role: TypographyRole,
): NonNullable<BrandAssetsInput["fonts"]>[number] | undefined {
  const fonts = assets?.fonts;
  if (!fonts?.length) return undefined;
  const byRole = fonts.find((f) => f.role === role);
  if (byRole) return byRole;
  if (role === "headline" || role === "display") {
    return fonts.find((f) => f.role === "display") ?? fonts[0];
  }
  if (role === "body") return fonts.find((f) => f.role === "body") ?? fonts[1];
  if (role === "cta")
    return fonts.find((f) => f.role === "cta") ?? fonts.find((f) => f.role === "body") ?? fonts[0];
  return fonts[0];
}

async function fetchBuffer(url: string, headers?: Record<string, string>): Promise<Buffer | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent":
          headers?.["User-Agent"] ??
          "Mozilla/5.0 (compatible; CreativeProductionEngine/1.0; +https://github.com/)",
        ...headers,
      },
    });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Google Fonts CSS references woff2; fetch CSS with a browser UA, then fetch the font file.
 */
export async function fetchGoogleFontWoff2Base64(
  family: string,
  weight: number,
): Promise<{ base64: string; mime: string; cssFamily: string } | null> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const cssBuf = await fetchBuffer(cssUrl, {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  if (!cssBuf) return null;
  const css = cssBuf.toString("utf-8");
  const m = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s+format\(['"]woff2['"]\)/);
  if (!m?.[1]) return null;
  const woff = await fetchBuffer(m[1]);
  if (!woff) return null;
  const cssFamily = sanitizeCssFamilyToken(family);
  return {
    base64: woff.toString("base64"),
    mime: "font/woff2",
    cssFamily,
  };
}

function fontMimeFromUrl(url: string): string {
  const lower = url.split("?")[0]!.toLowerCase();
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.startsWith("data:")) {
    const semi = url.indexOf(";");
    if (semi > 5) return url.slice(5, semi);
  }
  return "application/octet-stream";
}

function extractBase64FromDataUrl(dataUrl: string): { base64: string; mime: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1]!, base64: m[2]! };
}

/**
 * Resolve font for a typography role (async when Google or remote URL needs fetch).
 */
export async function resolveTypographyForRole(
  assets: BrandAssetsInput | undefined,
  role: TypographyRole,
  weight: number,
): Promise<ResolvedFont> {
  const entry = pickFontEntry(assets, role);
  if (!entry) return { kind: "default" };

  if (entry.source === "client_upload" && entry.fontFileUrl?.trim()) {
    const url = entry.fontFileUrl.trim();
    let base64: string;
    let mime: string;
    if (url.startsWith("data:")) {
      const ex = extractBase64FromDataUrl(url);
      if (!ex) return { kind: "default" };
      base64 = ex.base64;
      mime = ex.mime;
    } else {
      const buf = await fetchBuffer(url);
      if (!buf) return { kind: "default" };
      base64 = buf.toString("base64");
      mime = fontMimeFromUrl(url);
    }
    const cssFamily = sanitizeCssFamilyToken(
      entry.embeddedFontFamily ?? entry.family ?? `client_${role}`,
    );
    const format =
      mime.includes("woff2") ? "woff2" : mime.includes("woff") ? "woff" : "truetype";
    const fontFaceCss = `@font-face{font-family:'${cssFamily}';src:url(data:${mime};base64,${base64}) format('${format}');font-weight:${weight};font-style:normal;}`;
    return { kind: "embedded", cssFamily, fontFaceCss };
  }

  if (
    entry.source === "public_catalog" &&
    entry.catalogSource === "google_fonts" &&
    entry.googleFontFamily?.trim()
  ) {
    const gf = entry.googleFontFamily.trim();
    const got = await fetchGoogleFontWoff2Base64(gf, weight);
    if (!got) return { kind: "default" };
    const fontFaceCss = `@font-face{font-family:'${got.cssFamily}';src:url(data:${got.mime};base64,${got.base64}) format('woff2');font-weight:${weight};font-style:normal;}`;
    return { kind: "embedded", cssFamily: got.cssFamily, fontFaceCss };
  }

  return { kind: "default" };
}

export function fontFamilyCss(resolved: ResolvedFont): string {
  if (resolved.kind === "default") return DEFAULT_STACK;
  return `'${resolved.cssFamily}', ${DEFAULT_STACK}`;
}

export function fontFaceBlockForSvg(resolved: ResolvedFont): string {
  if (resolved.kind !== "embedded") return "";
  return resolved.fontFaceCss;
}
