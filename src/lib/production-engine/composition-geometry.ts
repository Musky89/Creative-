/**
 * Pure geometry for archetype → rects (pixels). No I/O.
 */

import type { ProductionMode } from "./modes";
import { oohCanvasDimensions } from "./mode-ooh-social";
import type { LayoutArchetype } from "./layout-archetypes";
import type {
  CompositionPlanDocument,
  PlacementRect,
} from "./composition-plan-schema";

export function defaultCanvasForMode(mode: ProductionMode): {
  width: number;
  height: number;
} {
  switch (mode) {
    case "OOH":
      return oohCanvasDimensions();
    case "SOCIAL":
      return { width: 1080, height: 1350 };
    case "PACKAGING":
      return { width: 1200, height: 1600 };
    case "RETAIL_POS":
      return { width: 1200, height: 1600 };
    case "IDENTITY":
      return { width: 1920, height: 1080 };
    case "ECOMMERCE_FASHION":
      return { width: 1200, height: 1500 };
    case "EXPORT_PRESENTATION":
      return { width: 1920, height: 1080 };
    default:
      return { width: 1200, height: 1200 };
  }
}

const M = 48;

function baseMargins(): CompositionPlanDocument["safeMargins"] {
  return { top: M, right: M, bottom: M, left: M };
}

export function buildRectsForArchetype(args: {
  mode: ProductionMode;
  archetype: LayoutArchetype;
  width: number;
  height: number;
}): Omit<
  CompositionPlanDocument,
  | "productionMode"
  | "layoutArchetype"
  | "textHierarchy"
  | "finishingLayers"
  | "exportFormat"
  | "exportDpiNote"
  | "modeSpecificConstraints"
  | "visualDominance"
> & {
  visualDominance: CompositionPlanDocument["visualDominance"];
  textHierarchy: string[];
  finishingLayers: CompositionPlanDocument["finishingLayers"];
  exportFormat: CompositionPlanDocument["exportFormat"];
  exportDpiNote: string;
  modeSpecificConstraints: CompositionPlanDocument["modeSpecificConstraints"];
} {
  const { width: W, height: H, archetype, mode } = args;
  const margins = baseMargins();
  const innerW = W - margins.left - margins.right;
  const innerH = H - margins.top - margins.bottom;

  let heroPlacement: PlacementRect = {
    x: 0,
    y: 0,
    width: W,
    height: H,
    anchor: "nw",
  };
  let secondaryPlacement: CompositionPlanDocument["secondaryPlacement"];
  let headlinePlacement: PlacementRect = {
    x: margins.left,
    y: margins.top,
    width: Math.min(innerW, Math.floor(W * 0.55)),
    height: Math.floor(H * 0.12),
    anchor: "nw",
  };
  let ctaPlacement: PlacementRect = {
    x: margins.left,
    y: headlinePlacement.y + headlinePlacement.height + 16,
    width: Math.min(innerW, Math.floor(W * 0.45)),
    height: Math.floor(H * 0.06),
    anchor: "nw",
  };
  let logoPlacement: PlacementRect = {
    x: W - margins.right - Math.floor(W * 0.18),
    y: H - margins.bottom - Math.floor(H * 0.12),
    width: Math.floor(W * 0.16),
    height: Math.floor(H * 0.1),
    anchor: "se",
  };
  let visualDominance: CompositionPlanDocument["visualDominance"] = "hero";
  const finishingLayers: CompositionPlanDocument["finishingLayers"] = [];
  const modeSpecificConstraints: CompositionPlanDocument["modeSpecificConstraints"] =
    {};

  switch (archetype) {
    case "FULL_BLEED_HERO_CORNER_COPY": {
      headlinePlacement = {
        x: margins.left,
        y: margins.top,
        width: Math.floor(W * 0.5),
        height: Math.floor(H * 0.14),
        anchor: "nw",
      };
      ctaPlacement = {
        x: margins.left,
        y: headlinePlacement.y + headlinePlacement.height + 12,
        width: Math.floor(W * 0.4),
        height: Math.floor(H * 0.07),
        anchor: "nw",
      };
      logoPlacement = {
        x: W - margins.right - Math.floor(W * 0.2),
        y: margins.top,
        width: Math.floor(W * 0.18),
        height: Math.floor(H * 0.1),
        anchor: "ne",
      };
      finishingLayers.push({
        id: "scrim-readability",
        kind: "SCRIM",
        description: "Subtle bottom or side scrim for type contrast on busy hero.",
        opacity: 0.35,
      });
      modeSpecificConstraints.oohCornerRead = true;
      break;
    }
    case "HERO_LEFT_COPY_RIGHT": {
      const split = Math.floor(W * 0.52);
      heroPlacement = {
        x: 0,
        y: 0,
        width: split,
        height: H,
        anchor: "nw",
      };
      headlinePlacement = {
        x: split + M,
        y: margins.top + Math.floor(innerH * 0.2),
        width: W - split - margins.right - M,
        height: Math.floor(H * 0.14),
        anchor: "nw",
      };
      ctaPlacement = {
        x: headlinePlacement.x,
        y: headlinePlacement.y + headlinePlacement.height + 20,
        width: headlinePlacement.width,
        height: Math.floor(H * 0.07),
        anchor: "nw",
      };
      logoPlacement = {
        x: headlinePlacement.x,
        y: H - margins.bottom - Math.floor(H * 0.1),
        width: Math.floor(headlinePlacement.width * 0.45),
        height: Math.floor(H * 0.08),
        anchor: "sw",
      };
      visualDominance = "balanced";
      break;
    }
    case "CENTERED_HERO_STACK": {
      heroPlacement = {
        x: margins.left,
        y: margins.top,
        width: innerW,
        height: Math.floor(H * 0.62),
        anchor: "nw",
      };
      headlinePlacement = {
        x: margins.left,
        y: heroPlacement.y + heroPlacement.height + 24,
        width: innerW,
        height: Math.floor(H * 0.1),
        anchor: "nw",
      };
      ctaPlacement = {
        x: margins.left,
        y: headlinePlacement.y + headlinePlacement.height + 12,
        width: Math.floor(innerW * 0.7),
        height: Math.floor(H * 0.06),
        anchor: "nw",
      };
      logoPlacement = {
        x: W - margins.right - Math.floor(W * 0.16),
        y: margins.top,
        width: Math.floor(W * 0.14),
        height: Math.floor(H * 0.08),
        anchor: "ne",
      };
      break;
    }
    case "SOCIAL_HERO_BOTTOM_COPY": {
      heroPlacement = { x: 0, y: 0, width: W, height: H, anchor: "nw" };
      const scrimH = Math.floor(H * 0.34);
      finishingLayers.push({
        id: "bottom-scrim",
        kind: "SCRIM",
        description: "Bottom-third gradient for headline/CTA legibility.",
        opacity: 0.55,
      });
      headlinePlacement = {
        x: margins.left,
        y: H - scrimH + 24,
        width: innerW,
        height: Math.floor(scrimH * 0.28),
        anchor: "sw",
      };
      ctaPlacement = {
        x: margins.left,
        y: H - margins.bottom - Math.floor(H * 0.08),
        width: Math.floor(innerW * 0.85),
        height: Math.floor(H * 0.055),
        anchor: "sw",
      };
      logoPlacement = {
        x: margins.left,
        y: margins.top + 16,
        width: Math.floor(W * 0.2),
        height: Math.floor(H * 0.07),
        anchor: "nw",
      };
      modeSpecificConstraints.socialThumbZone = "upper third clear for hook";
      break;
    }
    case "SOCIAL_SPLIT_LAYOUT": {
      const split = Math.floor(W * 0.5);
      heroPlacement = { x: 0, y: 0, width: split, height: H, anchor: "nw" };
      secondaryPlacement = {
        x: split,
        y: 0,
        width: W - split,
        height: H,
        anchor: "nw",
      };
      headlinePlacement = {
        x: split + M,
        y: margins.top + 40,
        width: W - split - margins.right - M,
        height: Math.floor(H * 0.12),
        anchor: "nw",
      };
      ctaPlacement = {
        x: headlinePlacement.x,
        y: headlinePlacement.y + headlinePlacement.height + 16,
        width: headlinePlacement.width,
        height: Math.floor(H * 0.06),
        anchor: "nw",
      };
      logoPlacement = {
        x: headlinePlacement.x,
        y: H - margins.bottom - 80,
        width: Math.floor(headlinePlacement.width * 0.5),
        height: 72,
        anchor: "sw",
      };
      visualDominance = "balanced";
      break;
    }
    case "PACK_FRONT_CENTERED_STACK": {
      heroPlacement = {
        x: margins.left + Math.floor(innerW * 0.15),
        y: margins.top + Math.floor(innerH * 0.18),
        width: Math.floor(innerW * 0.7),
        height: Math.floor(innerH * 0.45),
        anchor: "nw",
      };
      headlinePlacement = {
        x: margins.left,
        y: margins.top,
        width: innerW,
        height: Math.floor(H * 0.08),
        anchor: "nw",
      };
      ctaPlacement = {
        x: margins.left,
        y: heroPlacement.y + heroPlacement.height + 20,
        width: innerW,
        height: Math.floor(H * 0.05),
        anchor: "nw",
      };
      logoPlacement = {
        x: W - margins.right - 160,
        y: margins.top,
        width: 140,
        height: 72,
        anchor: "ne",
      };
      finishingLayers.push({
        id: "pack-grid-guides",
        kind: "SAFE_GUIDE",
        description: "Non-printing safe margin guides for FOP grid.",
        opacity: 0.15,
      });
      modeSpecificConstraints.packFrontHierarchy = "brand → product → claims";
      break;
    }
    case "PACK_VARIANT_BAND_LAYOUT": {
      heroPlacement = {
        x: margins.left,
        y: margins.top + 80,
        width: innerW,
        height: Math.floor(innerH * 0.55),
        anchor: "nw",
      };
      secondaryPlacement = {
        x: margins.left,
        y: H - margins.bottom - Math.floor(H * 0.14),
        width: innerW,
        height: Math.floor(H * 0.1),
        anchor: "sw",
      };
      headlinePlacement = {
        x: margins.left,
        y: margins.top,
        width: innerW,
        height: 64,
        anchor: "nw",
      };
      ctaPlacement = {
        x: margins.left,
        y: secondaryPlacement.y - 56,
        width: Math.floor(innerW * 0.6),
        height: 44,
        anchor: "sw",
      };
      logoPlacement = {
        x: W - margins.right - 140,
        y: margins.top,
        width: 120,
        height: 64,
        anchor: "ne",
      };
      modeSpecificConstraints.variantBand = true;
      break;
    }
    case "IDENTITY_BOARD_GRID": {
      const cell = Math.floor(Math.min(innerW, innerH) * 0.38);
      heroPlacement = {
        x: margins.left,
        y: margins.top,
        width: cell,
        height: cell,
        anchor: "nw",
      };
      secondaryPlacement = {
        x: margins.left + cell + 24,
        y: margins.top,
        width: cell,
        height: cell,
        anchor: "nw",
      };
      headlinePlacement = {
        x: margins.left,
        y: margins.top + cell + 32,
        width: innerW,
        height: 56,
        anchor: "nw",
      };
      ctaPlacement = {
        x: margins.left,
        y: headlinePlacement.y + 60,
        width: Math.floor(innerW * 0.5),
        height: 40,
        anchor: "nw",
      };
      logoPlacement = {
        x: W - margins.right - 120,
        y: H - margins.bottom - 80,
        width: 100,
        height: 64,
        anchor: "se",
      };
      visualDominance = "balanced";
      modeSpecificConstraints.identityGrid = "2-up exploration tiles";
      break;
    }
    case "PRESENTATION_BOARD_LAYOUT": {
      heroPlacement = {
        x: margins.left,
        y: margins.top + 100,
        width: Math.floor(innerW * 0.55),
        height: Math.floor(innerH * 0.62),
        anchor: "nw",
      };
      headlinePlacement = {
        x: margins.left,
        y: margins.top,
        width: Math.floor(innerW * 0.85),
        height: 72,
        anchor: "nw",
      };
      ctaPlacement = {
        x: heroPlacement.x + heroPlacement.width + M,
        y: margins.top + 120,
        width: W - heroPlacement.x - heroPlacement.width - margins.right - M,
        height: 200,
        anchor: "nw",
      };
      logoPlacement = {
        x: W - margins.right - 100,
        y: H - margins.bottom - 56,
        width: 88,
        height: 48,
        anchor: "se",
      };
      finishingLayers.push({
        id: "slide-footer",
        kind: "BORDER",
        description: "Footer rule for deck consistency.",
        opacity: 0.4,
      });
      modeSpecificConstraints.slideMaster = "title | hero | sidebar bullets";
      break;
    }
    default:
      break;
  }

  const textHierarchy = [
    "H1: headline — max weight, highest contrast",
    "CTA: secondary weight, button or underline affordance",
    "Logo: tertiary, clear space preserved",
  ];

  return {
    canvasWidth: W,
    canvasHeight: H,
    heroPlacement,
    secondaryPlacement,
    headlinePlacement,
    ctaPlacement,
    logoPlacement,
    safeMargins: margins,
    visualDominance,
    textHierarchy,
    finishingLayers,
    exportFormat: "png",
    exportDpiNote:
      mode === "PACKAGING" || mode === "RETAIL_POS"
        ? "Export at 300 DPI for print pipeline when size doubles."
        : "Default 72 DPI screen; upscale path optional for OOH print.",
    modeSpecificConstraints,
  };
}
