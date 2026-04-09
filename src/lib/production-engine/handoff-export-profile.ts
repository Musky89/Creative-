/**
 * Mode-aware export / DPI / format expectations for agency handoff.
 * Pixel canvas is authoritative; print dimensions are advisory until a print spec is bound.
 */

import type { ProductionMode } from "./modes";
import type { CompositionPlanDocument } from "./composition-plan-schema";
import type { ProductionPlanDocument } from "./production-plan-schema";
import type { QualityTier } from "./fal-contracts";

export type HandoffExportProfile = {
  mode: ProductionMode;
  presetId: string;
  label: string;
  canvasPx: { width: number; height: number };
  /** Suggested master export at same px unless upscale pipeline is enabled. */
  exportDimensionsPx: { width: number; height: number };
  /** When true, downstream may 2× for proofing (OOH high tier, etc.). */
  allowUpscaleMaster: boolean;
  logicalDpiScreen: number;
  printDpiRecommended?: number;
  colorSpace: "sRGB" | "CMYK_AT_RIP";
  primaryFormats: ("png" | "jpeg" | "webp" | "pdf")[];
  deliveryNotes: string[];
  /** Human-readable spec line for quotes (OOH face, FOP trim, etc.). */
  mediaSpecHint: string;
};

export function buildHandoffExportProfile(args: {
  mode: ProductionMode;
  compositionPlan: CompositionPlanDocument;
  productionPlan: ProductionPlanDocument;
  qualityTier?: QualityTier;
}): HandoffExportProfile {
  const { mode, compositionPlan: doc, productionPlan: plan, qualityTier } = args;
  const W = doc.canvasWidth;
  const H = doc.canvasHeight;
  const highTier = qualityTier === "high" || qualityTier === "premium";

  const base = {
    canvasPx: { width: W, height: H },
    exportDimensionsPx: { width: W, height: H },
    colorSpace: "sRGB" as const,
  };

  switch (mode) {
    case "OOH":
      return {
        ...base,
        mode,
        presetId: "ooh-print-master",
        label: "OOH — large-format print master",
        allowUpscaleMaster: highTier,
        logicalDpiScreen: 72,
        printDpiRecommended: 300,
        primaryFormats: ["png", "pdf"],
        deliveryNotes: [
          doc.exportDpiNote,
          "Deliver flattened master + layered manifest; trim/bleed per media vendor IO.",
          "Vector headline/CTA in manifest for re-set in vendor template if required.",
        ],
        mediaSpecHint: `OOH face ${W}×${H}px logical — map to final mm/inch at 300 DPI with vendor grid.`,
      };
    case "SOCIAL":
      return {
        ...base,
        mode,
        presetId: "social-feed-master",
        label: "Social — feed / paid placements",
        allowUpscaleMaster: false,
        logicalDpiScreen: 72,
        primaryFormats: ["png", "jpeg"],
        deliveryNotes: [
          doc.exportDpiNote,
          "Export 1:1 / 4:5 / 9:16 variants via additional canvas presets (future); manifest documents this master.",
          "Safe zones: keep type inside composition plan margins for platform UI chrome.",
        ],
        mediaSpecHint: `Social master ${W}×${H}px — platform-native aspect; sRGB.`,
      };
    case "PACKAGING":
      return {
        ...base,
        mode,
        presetId: "packaging-fop-master",
        label: "Packaging — front-of-pack composed master",
        allowUpscaleMaster: true,
        logicalDpiScreen: 72,
        printDpiRecommended: 300,
        primaryFormats: ["png", "pdf"],
        deliveryNotes: [
          doc.exportDpiNote,
          "FAL rasters are support-only; FOP type and variant band are platform layers — rebuild in dieline AI.",
          "Include bleed and die path from structural design — not embedded here.",
        ],
        mediaSpecHint: `FOP comp ${W}×${H}px @ 300 DPI effective for shelf print pipeline.`,
      };
    case "RETAIL_POS":
      return {
        ...base,
        mode,
        presetId: "retail-pos-signage",
        label: "Retail / POS — promo board",
        allowUpscaleMaster: true,
        logicalDpiScreen: 72,
        printDpiRecommended: 300,
        primaryFormats: ["png", "pdf"],
        deliveryNotes: [
          doc.exportDpiNote,
          "Price/offer numerals are composed vectors — adjust per locale/regulation in layout app.",
        ],
        mediaSpecHint: `POS board ${W}×${H}px — high contrast for aisle distance.`,
      };
    case "IDENTITY":
      return {
        ...base,
        mode,
        presetId: "identity-exploration-board",
        label: "Identity — route exploration board",
        allowUpscaleMaster: false,
        logicalDpiScreen: 72,
        printDpiRecommended: 300,
        primaryFormats: ["png", "pdf"],
        deliveryNotes: [
          "Three route tiles are generative studies; final marks must be redrawn as vector in brand app.",
          plan.typographyIntent.slice(0, 200),
        ],
        mediaSpecHint: `Board ${W}×${H}px — presentation + PDF deck handoff.`,
      };
    case "ECOMMERCE_FASHION":
      return {
        ...base,
        mode,
        presetId: "fashion-pdp-lookbook",
        label: "E-commerce fashion — PDP / lookbook / social crop",
        allowUpscaleMaster: highTier,
        logicalDpiScreen: 72,
        printDpiRecommended: 150,
        primaryFormats: ["png", "webp", "jpeg"],
        deliveryNotes: [
          doc.exportDpiNote,
          "Detail inset optional for PDP zoom; hero is cover-fit into manifest rect.",
          "sRGB for web; print lookbooks may require ICC profile swap at RIP.",
        ],
        mediaSpecHint: `Fashion set ${W}×${H}px master — crop siblings in DAM from manifest rects.`,
      };
    case "EXPORT_PRESENTATION": {
      const story =
        plan.productionMode === "EXPORT_PRESENTATION"
          ? plan.storyArc.slice(0, 220)
          : "";
      return {
        ...base,
        mode,
        presetId: "client-deck-slide",
        label: "Presentation — 16:9 slide master",
        allowUpscaleMaster: false,
        logicalDpiScreen: 72,
        primaryFormats: ["png", "pdf"],
        deliveryNotes: [
          doc.exportDpiNote,
          "One slide per exportSlideIndex in UI; full deck = N sequential exports + shared manifest schema.",
          story,
        ].filter(Boolean),
        mediaSpecHint: `Slide ${W}×${H}px (16:9) — PDF sequence for client delivery.`,
      };
    }
    default: {
      const _never: never = mode;
      return _never;
    }
  }
}
