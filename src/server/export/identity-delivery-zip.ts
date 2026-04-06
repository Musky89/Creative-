import JSZip from "jszip";
import type { IdentityDeliveryManifest } from "@/lib/export/identity-delivery-contract";
import {
  buildIdentityDeliveryManifest,
  buildIdentityDeliveryPdf,
  buildIdentityFullJsonPayload,
  buildPlaceholderJpegBuffer,
  buildPlaceholderPngBuffer,
  buildSelectedRouteMarkdown,
  buildStrategySummary,
  latestArtifactContent,
  type IdentityDeliveryInputs,
  svgContractXml,
} from "@/server/export/identity-delivery-builders";
import { stripMeta } from "@/server/export/studio-export";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readmeMarkdown(manifest: IdentityDeliveryManifest): string {
  return `# Identity delivery package

**Client:** ${manifest.project.clientName}  
**Project:** ${manifest.project.briefTitle}  
**Exported:** ${manifest.exportedAt}  
**Package version:** ${manifest.version}

## Folder structure

| Path | Contents |
|------|----------|
| \`DELIVERY_MANIFEST.json\` | Machine-readable manifest (roles, formats, selection status) |
| \`README.md\` | This file |
| \`01_Strategy/\` | Full identity strategy JSON (stripped of internal meta) |
| \`02_Routes/\` | Full routes pack JSON including founder selection |
| \`03_Documents/\` | Human-readable Markdown + PDF summary |
| \`04_Assets/\` | Vector contracts (SVG), raster placeholders (PNG/JPG) |

## Important

- **SVG files** in \`04_Assets/vector/\` are **contract placeholders** until real mark vectors are generated or supplied from design tools.
- **PNG / JPG** placeholders are **not** equivalent to vector masters — see \`isMasterEquivalent\` in the manifest.
- **Future:** layered PSD, Illustrator packages, and similar are listed under \`futureSourceExports\` in the manifest but are **not** attached until real source files exist.

## Selected route

${
  manifest.selectedRoute.selectionStatus === "selected"
    ? `**${manifest.selectedRoute.routeName ?? "—"}** (${String(manifest.selectedRoute.routeType ?? "").replace(/_/g, " ")})`
    : "_No founder-preferred route saved yet — export still includes strategy and full routes pack._"
}
`;
}

function svgBundleForRoute(routeLabel: string): Record<string, string> {
  const disclaimer = [
    "Contract placeholder — not final logo artwork.",
    "Populate via mark generation pipeline or design export.",
  ];
  return {
    master_mark: svgContractXml(`Master mark — ${routeLabel}`, disclaimer),
    monochrome: svgContractXml(`Monochrome — ${routeLabel}`, disclaimer),
    reversed: svgContractXml(`Reversed — ${routeLabel}`, disclaimer),
    symbol_only: svgContractXml(`Symbol only — ${routeLabel}`, disclaimer),
    wordmark: svgContractXml(`Wordmark — ${routeLabel}`, disclaimer),
    combination_lockup: svgContractXml(`Combination lockup — ${routeLabel}`, disclaimer),
  };
}

export async function buildIdentityDeliveryZip(
  input: IdentityDeliveryInputs,
): Promise<{ filename: string; buffer: Buffer } | null> {
  const manifest = buildIdentityDeliveryManifest(input);
  if (!manifest) return null;

  const strategyRaw = latestArtifactContent(
    input.tasks,
    "IDENTITY_STRATEGY",
    "IDENTITY_STRATEGY",
  );
  const routesRaw = latestArtifactContent(
    input.tasks,
    "IDENTITY_ROUTING",
    "IDENTITY_ROUTES_PACK",
  );

  const strategy = strategyRaw ? stripMeta(strategyRaw) : null;
  const routesPack = routesRaw ? stripMeta(routesRaw) : null;

  const strategyMd = strategy ? buildStrategySummary(strategy) : "_No identity strategy artifact._";
  let selectedRoute: Record<string, unknown> | null = null;
  let selectedIndex: number | null = null;
  if (routesPack && Array.isArray(routesPack.routes)) {
    const idx = routesPack.founderPreferredRouteIndex;
    if (typeof idx === "number" && Number.isInteger(idx) && idx >= 0) {
      const r = routesPack.routes[idx];
      if (isRecord(r)) {
        selectedIndex = idx;
        selectedRoute = r;
      }
    }
  }
  const feedback =
    typeof routesPack?.founderRouteFeedback === "string"
      ? routesPack.founderRouteFeedback
      : null;
  const routeMd = buildSelectedRouteMarkdown(selectedRoute, selectedIndex, feedback);

  const pdfBytes = await buildIdentityDeliveryPdf(manifest, strategyMd, routeMd);

  const routeLabel =
    selectedRoute && typeof selectedRoute.routeName === "string"
      ? selectedRoute.routeName
      : input.briefTitle;

  const svgs = svgBundleForRoute(routeLabel);

  const zip = new JSZip();

  zip.file("DELIVERY_MANIFEST.json", JSON.stringify(manifest, null, 2));
  zip.file("README.md", readmeMarkdown(manifest));

  if (strategy) {
    zip.file("01_Strategy/identity_strategy.json", JSON.stringify(strategy, null, 2));
  }
  if (routesPack) {
    zip.file("02_Routes/identity_routes_pack.json", JSON.stringify(routesPack, null, 2));
  }

  zip.file("03_Documents/strategy_summary.md", strategyMd);
  zip.file("03_Documents/selected_route.md", routeMd);
  zip.file("03_Documents/IDENTITY_DELIVERY.pdf", Buffer.from(pdfBytes));

  const v = zip.folder("04_Assets/vector");
  if (v) {
    v.file("master_mark.svg", svgs.master_mark);
    v.file("monochrome.svg", svgs.monochrome);
    v.file("reversed.svg", svgs.reversed);
    v.file("symbol_only.svg", svgs.symbol_only);
    v.file("wordmark.svg", svgs.wordmark);
    v.file("combination_lockup.svg", svgs.combination_lockup);
  }

  const r = zip.folder("04_Assets/raster");
  if (r) {
    r.file("master_mark_placeholder.png", buildPlaceholderPngBuffer());
  }

  const p = zip.folder("04_Assets/previews");
  if (p) {
    p.file("usage_preview_placeholder.jpg", buildPlaceholderJpegBuffer());
  }

  const full = buildIdentityFullJsonPayload(manifest, strategy, routesPack);
  zip.file("_package_full.json", JSON.stringify(full, null, 2));

  const safeTitle = input.briefTitle.replace(/[^\w\d-]+/g, "-").slice(0, 40);
  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    filename: `identity-delivery-${safeTitle}-${input.briefId.slice(0, 8)}.zip`,
    buffer: buf,
  };
}
