# Production Engine — composer typography (portable module)

Branch: **`feature/production-typography-tool`** (sub-branch of `cursor/dev-server-deployment-34ee`).

## What this adds

1. **`brandAssets.fonts[]` extended** (`schemas.ts`, `types.ts`): `role`, `source`, `googleFontFamily`, `fontFileUrl`, etc.
2. **`typography-resolve.ts`**: resolves **headline** / **cta** / **body** roles to either default stack or **embedded `@font-face`** (data URL in SVG).
3. **`deterministic-composer.ts`**: preloads resolved fonts and passes them into **headline**, **CTA**, and other text layers.
4. **Creative Testing Lab**: “Composer typography” panel + **`POST /api/creative-testing-lab/upload-font`** for `.woff2` / `.woff` / `.ttf`.

## Pull into another project

Copy (or cherry-pick this branch):

- `src/lib/production-engine/typography-resolve.ts`
- `src/lib/production-engine/schemas.ts` (font entry shape)
- `src/lib/production-engine/types.ts` (`BrandAssetFonts`)
- `src/lib/production-engine/index.ts` (export line)
- `src/server/production-engine/deterministic-composer.ts` (textSvg + compose entry)
- Optional lab glue: `map-to-production-input.ts`, lab shell typography UI, `upload-font/route.ts`

## Google Fonts

Server fetches CSS from `fonts.googleapis.com` with a browser User-Agent, then pulls the **woff2** URL and base64-embeds it. Requires **outbound network** at compose time.

## Client fonts

Upload stores **data URL** in session; ensure **license** allows server-side embedding for previews.

## Not included

- AI glyph extrapolation from a few characters (out of scope).
- Variable-font axis selection; single weight per resolve (matches `fontWeight` passed).
