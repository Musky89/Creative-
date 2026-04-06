import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import type { Prisma } from "@/generated/prisma/client";
import { stripMeta } from "@/server/export/studio-export";
import {
  IDENTITY_DELIVERY_VERSION,
  type IdentityAssetSlot,
  type IdentityDeliveryManifest,
  emptyFutureSourceNote,
} from "@/lib/export/identity-delivery-contract";

type JsonValue = Prisma.JsonValue;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function latestArtifactContent(
  tasks: Array<{
    stage: string;
    artifacts: Array<{ type: string; version: number; content: JsonValue }>;
  }>,
  stage: string,
  artifactType: string,
): Record<string, unknown> | null {
  const task = tasks.find((t) => t.stage === stage);
  if (!task) return null;
  const same = task.artifacts.filter((a) => a.type === artifactType);
  if (same.length === 0) return null;
  const best = same.reduce((a, b) => (a.version >= b.version ? a : b));
  const c = best.content;
  return isRecord(c) ? c : null;
}

function buildStrategySummary(strategy: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`**Brand core idea**  `);
  lines.push(String(strategy.brandCoreIdea ?? "—"));
  lines.push("");
  lines.push("**Symbolic territories**");
  for (const s of asStringArray(strategy.symbolicTerritories)) {
    lines.push(`- ${s}`);
  }
  lines.push("");
  lines.push("**Must signal**");
  for (const s of asStringArray(strategy.whatTheIdentityMustSignal)) {
    lines.push(`- ${s}`);
  }
  lines.push("");
  lines.push("**Must avoid**");
  for (const s of asStringArray(strategy.whatTheIdentityMustAvoid)) {
    lines.push(`- ${s}`);
  }
  return lines.join("\n");
}

function buildSelectedRouteMarkdown(
  route: Record<string, unknown> | null,
  index: number | null,
  feedback: string | null,
): string {
  if (!route || index == null) {
    return (
      "_No founder-preferred route is saved on the routes pack yet._\n\n" +
      "Select a route in Studio, then re-export for a complete delivery package."
    );
  }
  const lines: string[] = [
    `# Selected route: ${String(route.routeName ?? `Route ${index + 1}`)}`,
    "",
    `**Type:** ${String(route.routeType ?? "—").replace(/_/g, " ")}  `,
    `**Pack index:** ${index + 1} (0-based index: ${index})`,
    "",
    "## Core concept",
    "",
    String(route.coreConcept ?? "—"),
    "",
    "## Symbolic logic",
    "",
    String(route.symbolicLogic ?? "—"),
    "",
    "## Typography logic",
    "",
    String(route.typographyLogic ?? "—"),
    "",
    "## Geometry logic",
    "",
    String(route.geometryLogic ?? "—"),
    "",
    "## Distinctiveness",
    "",
    String(route.distinctivenessRationale ?? "—"),
    "",
    "## Why it works for the brand",
    "",
    String(route.whyItWorksForBrand ?? "—"),
    "",
    "## Risks",
    "",
    ...asStringArray(route.risks).map((r) => `- ${r}`),
    "",
    "## Avoid",
    "",
    ...asStringArray(route.avoidList).map((r) => `- ${r}`),
    "",
    "## Differentiation contract",
    "",
    `- **Core tension:** ${String(route.coreTension ?? "—")}`,
    `- **Emotional center:** ${String(route.emotionalCenter ?? "—")}`,
    `- **Beats category norm:** ${String(route.whyBeatsCategoryNorm ?? "—")}`,
    `- **Could fail if:** ${String(route.whyCouldFail ?? "—")}`,
    `- **Distinct visual world:** ${String(route.distinctVisualWorld ?? "—")}`,
    "",
  ];
  if (feedback?.trim()) {
    lines.push("## Founder notes", "", feedback.trim(), "");
  }
  return lines.join("\n");
}

function buildAssetSlots(): IdentityAssetSlot[] {
  const base = "04_Assets";
  return [
    {
      role: "master_vector",
      format: "svg",
      path: `${base}/vector/master_mark.svg`,
      status: "placeholder_contract",
      isMasterEquivalent: true,
      notes:
        "Contract file until mark generation writes the real vector master. Do not treat raster exports as equivalent.",
    },
    {
      role: "master_raster_png",
      format: "png",
      path: `${base}/raster/master_mark_placeholder.png`,
      status: "generated_placeholder",
      isMasterEquivalent: false,
      notes: "Structural placeholder — not a vector master.",
    },
    {
      role: "monochrome_vector",
      format: "svg",
      path: `${base}/vector/monochrome.svg`,
      status: "placeholder_contract",
      isMasterEquivalent: true,
    },
    {
      role: "reversed_vector",
      format: "svg",
      path: `${base}/vector/reversed.svg`,
      status: "placeholder_contract",
      isMasterEquivalent: true,
    },
    {
      role: "symbol_only_vector",
      format: "svg",
      path: `${base}/vector/symbol_only.svg`,
      status: "placeholder_contract",
      isMasterEquivalent: true,
    },
    {
      role: "wordmark_vector",
      format: "svg",
      path: `${base}/vector/wordmark.svg`,
      status: "placeholder_contract",
      isMasterEquivalent: true,
    },
    {
      role: "combination_lockup_vector",
      format: "svg",
      path: `${base}/vector/combination_lockup.svg`,
      status: "placeholder_contract",
      isMasterEquivalent: true,
    },
    {
      role: "usage_preview_jpg",
      format: "jpg",
      path: `${base}/previews/usage_preview_placeholder.jpg`,
      status: "generated_placeholder",
      isMasterEquivalent: false,
      notes: "Low-fidelity preview placeholder for packaging layout.",
    },
  ];
}

function svgContractXml(title: string, bodyLines: string[]): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const text = bodyLines.map((l) => esc(l)).join("\n    ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="320" viewBox="0 0 512 320">
  <title>${esc(title)}</title>
  <rect width="100%" height="100%" fill="#f4f4f5"/>
  <text x="256" y="48" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#18181b">
    AgenticForce — identity asset contract (not final artwork)
  </text>
  <text x="256" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#52525b">
    ${esc(title)}
  </text>
  <foreignObject x="40" y="100" width="432" height="180">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:system-ui,sans-serif;font-size:11px;color:#3f3f46;line-height:1.5;">
    ${text}
    </div>
  </foreignObject>
</svg>
`;
}

function buildPlaceholderPngBuffer(): Buffer {
  const w = 512;
  const h = 320;
  const png = new PNG({ width: w, height: h, colorType: 6 });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (w * y + x) * 4;
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      png.data[i] = edge ? 60 : 244;
      png.data[i + 1] = edge ? 60 : 244;
      png.data[i + 2] = edge ? 67 : 244;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

function buildPlaceholderJpegBuffer(): Buffer {
  const w = 640;
  const h = 400;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (w * y + x) * 4;
      data[i] = 250;
      data[i + 1] = 250;
      data[i + 2] = 249;
      data[i + 3] = 255;
    }
  }
  return Buffer.from(jpeg.encode({ data, width: w, height: h }, 85).data);
}

export type IdentityDeliveryInputs = {
  briefId: string;
  clientId: string;
  briefTitle: string;
  clientName: string;
  deadline: Date;
  identityWorkflowEnabled: boolean;
  tasks: Array<{
    stage: string;
    artifacts: Array<{ type: string; version: number; content: JsonValue }>;
  }>;
};

export function buildIdentityDeliveryManifest(
  input: IdentityDeliveryInputs,
): IdentityDeliveryManifest | null {
  if (!input.identityWorkflowEnabled) return null;

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

  if (!strategyRaw && !routesRaw) return null;

  const strategy = strategyRaw ? stripMeta(strategyRaw) : null;
  const routesPack = routesRaw ? stripMeta(routesRaw) : null;

  let selectedIndex: number | null = null;
  let founderFeedback: string | null = null;
  let selectedRoute: Record<string, unknown> | null = null;

  if (routesPack && Array.isArray(routesPack.routes)) {
    const idx = routesPack.founderPreferredRouteIndex;
    if (typeof idx === "number" && Number.isInteger(idx) && idx >= 0) {
      const r = routesPack.routes[idx];
      if (isRecord(r)) {
        selectedIndex = idx;
        selectedRoute = r;
      }
    }
    if (typeof routesPack.founderRouteFeedback === "string") {
      founderFeedback = routesPack.founderRouteFeedback.trim() || null;
    }
  }

  const assets = buildAssetSlots();
  const exportedAt = new Date().toISOString();

  return {
    schema: "agenticforce.identity_delivery_manifest",
    version: IDENTITY_DELIVERY_VERSION,
    exportedAt,
    project: {
      briefId: input.briefId,
      briefTitle: input.briefTitle,
      clientId: input.clientId,
      clientName: input.clientName,
      deadline: input.deadline.toISOString(),
    },
    selectedRoute: {
      index: selectedIndex,
      routeName: selectedRoute ? String(selectedRoute.routeName ?? null) : null,
      routeType: selectedRoute ? String(selectedRoute.routeType ?? null) : null,
      founderFeedback,
      selectionStatus: selectedIndex != null ? "selected" : "not_selected",
    },
    documents: {
      strategySummaryIncluded: !!strategy,
      selectedRouteDetailIncluded: !!selectedRoute,
      fullStrategyJsonIncluded: !!strategy,
      fullRoutesPackJsonIncluded: !!routesPack,
    },
    assets,
    futureSourceExports: {
      kinds: ["psd_layers", "ai_package"],
      note: emptyFutureSourceNote(),
    },
    notes: [
      "Vector masters in this package are contract SVGs until automated mark generation attaches production paths.",
      "PNG/JPG files marked as placeholders are for folder structure and previews only.",
    ],
  };
}

export async function buildIdentityDeliveryPdf(
  manifest: IdentityDeliveryManifest,
  strategyMd: string,
  routeMd: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [612, 792];
  const margin = 50;
  const lineHeight = 14;
  const maxWidth = pageSize[0] - margin * 2;

  function addPage() {
    return doc.addPage(pageSize);
  }

  function drawWrapped(
    page: ReturnType<PDFDocument["getPages"]>[0],
    text: string,
    startY: number,
    size = 11,
    useBold = false,
  ): number {
    const f = useBold ? fontBold : font;
    const words = text.split(/\s+/);
    let y = startY;
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      const tw = f.widthOfTextAtSize(test, size);
      if (tw > maxWidth && line) {
        page.drawText(line, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.12) });
        y -= lineHeight;
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.12) });
      y -= lineHeight;
    }
    return y;
  }

  let page = addPage();
  let y = pageSize[1] - margin;

  page.drawText("Identity delivery — AgenticForce", {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.05, 0.05, 0.08),
  });
  y -= 28;

  y = drawWrapped(
    page,
    `Client: ${manifest.project.clientName} · Project: ${manifest.project.briefTitle} · Exported: ${manifest.exportedAt}`,
    y,
    10,
  );
  y -= 8;
  y = drawWrapped(
    page,
    `Selected route: ${manifest.selectedRoute.selectionStatus === "selected" ? `${manifest.selectedRoute.routeName ?? "—"} (${manifest.selectedRoute.routeType ?? "—"})` : "Not selected — save preference in Studio"}`,
    y,
    10,
    true,
  );
  y -= 16;

  const sections: { title: string; body: string }[] = [
    { title: "Strategy summary", body: strategyMd.replace(/\*\*/g, "") },
    { title: "Selected route", body: routeMd.replace(/\*\*/g, "") },
  ];

  for (const sec of sections) {
    if (y < margin + 120) {
      page = addPage();
      y = pageSize[1] - margin;
    }
    page.drawText(sec.title, {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.12, 0.12, 0.15),
    });
    y -= 22;
    const paras = sec.body.split(/\n\n+/);
    for (const p of paras) {
      const lines = p.split("\n");
      for (const ln of lines) {
        if (y < margin + 40) {
          page = addPage();
          y = pageSize[1] - margin;
        }
        y = drawWrapped(page, ln.trim() || " ", y, 10) - 4;
      }
      y -= 6;
    }
    y -= 10;
  }

  return doc.save();
}

/** Full package JSON for download (manifest + stripped strategy + routes pack). */
export function buildIdentityFullJsonPayload(
  manifest: IdentityDeliveryManifest,
  strategy: Record<string, unknown> | null,
  routesPack: Record<string, unknown> | null,
): Record<string, unknown> {
  return {
    manifest,
    identityStrategy: strategy,
    identityRoutesPack: routesPack,
  };
}

export {
  buildStrategySummary,
  buildSelectedRouteMarkdown,
  latestArtifactContent,
  svgContractXml,
  buildPlaceholderPngBuffer,
  buildPlaceholderJpegBuffer,
};
