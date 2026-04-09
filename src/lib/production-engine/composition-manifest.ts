import type { ProductionEngineInput } from "./types";
import type {
  CompositionPlanDocument,
  CompositionLayerManifestEntry,
} from "./composition-plan-schema";

export function buildLayerManifest(
  doc: CompositionPlanDocument,
  input: ProductionEngineInput,
  textOverride?: { headline: string; cta: string },
): CompositionLayerManifestEntry[] {
  const hl = textOverride?.headline ?? input.selectedHeadline;
  const ct = textOverride?.cta ?? input.selectedCta;
  const entries: CompositionLayerManifestEntry[] = [];
  let z = 0;

  entries.push({
    id: "canvas",
    zIndex: z++,
    kind: "CANVAS",
    rect: { x: 0, y: 0, width: doc.canvasWidth, height: doc.canvasHeight },
    description: `Canvas ${doc.canvasWidth}×${doc.canvasHeight} · ${doc.layoutArchetype}`,
  });

  entries.push({
    id: "solid-base",
    zIndex: z++,
    kind: "SOLID",
    rect: { x: 0, y: 0, width: doc.canvasWidth, height: doc.canvasHeight },
    description: "Neutral base plate under hero (platform-owned background).",
  });

  entries.push({
    id: "hero-raster",
    zIndex: z++,
    kind: "HERO_RASTER",
    rect: {
      x: doc.heroPlacement.x,
      y: doc.heroPlacement.y,
      width: doc.heroPlacement.width,
      height: doc.heroPlacement.height,
    },
    description: "FAL hero asset fitted with cover; clipped to hero rect.",
  });

  if (doc.secondaryPlacement) {
    entries.push({
      id: "secondary-raster",
      zIndex: z++,
      kind: "SECONDARY_RASTER",
      rect: {
        x: doc.secondaryPlacement.x,
        y: doc.secondaryPlacement.y,
        width: doc.secondaryPlacement.width,
        height: doc.secondaryPlacement.height,
      },
      description: "Secondary FAL or split-panel asset.",
    });
  }

  for (const f of doc.finishingLayers) {
    entries.push({
      id: `finishing-${f.id}`,
      zIndex: z++,
      kind: "FINISHING",
      rect: { x: 0, y: 0, width: doc.canvasWidth, height: doc.canvasHeight },
      description: `${f.kind}: ${f.description}`,
    });
  }

  entries.push({
    id: "text-headline",
    zIndex: z++,
    kind: "TEXT_HEADLINE",
    rect: {
      x: doc.headlinePlacement.x,
      y: doc.headlinePlacement.y,
      width: doc.headlinePlacement.width,
      height: doc.headlinePlacement.height,
    },
    description: `Headline: "${hl.slice(0, 80)}${hl.length > 80 ? "…" : ""}"`,
  });

  entries.push({
    id: "text-cta",
    zIndex: z++,
    kind: "TEXT_CTA",
    rect: {
      x: doc.ctaPlacement.x,
      y: doc.ctaPlacement.y,
      width: doc.ctaPlacement.width,
      height: doc.ctaPlacement.height,
    },
    description: `CTA: "${ct}"`,
  });

  entries.push({
    id: "logo",
    zIndex: z++,
    kind: "LOGO_RASTER",
    rect: {
      x: doc.logoPlacement.x,
      y: doc.logoPlacement.y,
      width: doc.logoPlacement.width,
      height: doc.logoPlacement.height,
    },
    description: input.brandAssets?.logoUrl
      ? "Brand logo from brandAssets.logoUrl (contain, preserve aspect)."
      : "Placeholder mark (deterministic label) — no logo URL.",
  });

  return entries;
}

export function buildAssemblyExplanation(
  doc: CompositionPlanDocument,
  input: ProductionEngineInput,
  manifest: CompositionLayerManifestEntry[],
): string[] {
  const lines: string[] = [];
  lines.push(
    `Layout archetype **${doc.layoutArchetype}** drives rects on a **${doc.canvasWidth}×${doc.canvasHeight}** canvas.`,
  );
  lines.push(
    `Safe margins: T${doc.safeMargins.top} R${doc.safeMargins.right} B${doc.safeMargins.bottom} L${doc.safeMargins.left}px — platform-owned.`,
  );
  lines.push(
    `Visual dominance: **${doc.visualDominance}**. Text hierarchy: ${doc.textHierarchy.join(" → ")}.`,
  );
  lines.push(
    `Hero region receives the primary **FAL** raster (cover-fit). Headline and CTA are rendered as **vector text** (platform) in fixed boxes, not baked into the model prompt.`,
  );
  if (input.brandAssets?.logoUrl) {
    lines.push(
      `Logo is composited **after** type, **contain** within logo rect with clear space implied by rect size.`,
    );
  } else {
    lines.push(
      `No logo URL — a **type-based placeholder** occupies the logo rect for structure.`,
    );
  }
  if (doc.finishingLayers.length > 0) {
    lines.push(
      `Finishing: ${doc.finishingLayers.map((f) => f.kind).join(", ")} applied as separate layers above hero, below type.`,
    );
  }
  lines.push(
    `Layer manifest (${manifest.length} entries) is stored for **layered handoff** (PSD/Figma export is a future step).`,
  );
  lines.push(`Export: **${doc.exportFormat}** — ${doc.exportDpiNote}`);
  return lines;
}
