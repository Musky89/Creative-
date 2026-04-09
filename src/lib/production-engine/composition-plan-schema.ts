/**
 * COMPOSITION_PLAN — platform-owned layout, type, logo, safe zones, export.
 */

import { z } from "zod";
import { PRODUCTION_MODES } from "./modes";
import { LAYOUT_ARCHETYPES } from "./layout-archetypes";

const productionModeEnum = z.enum(PRODUCTION_MODES);
const layoutArchetypeEnum = z.enum(LAYOUT_ARCHETYPES);

export const placementRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  anchor: z.enum(["nw", "ne", "sw", "se", "center"]).optional(),
});

export type PlacementRect = z.infer<typeof placementRectSchema>;

const finishingLayerSchema = z.object({
  id: z.string(),
  kind: z.enum(["SCRIM", "VIGNETTE", "BORDER", "SAFE_GUIDE", "COLOR_GRADE"]),
  description: z.string(),
  opacity: z.number().min(0).max(1).optional(),
});

export const compositionPlanDocumentSchema = z.object({
  productionMode: productionModeEnum,
  layoutArchetype: layoutArchetypeEnum,
  canvasWidth: z.number().int().positive(),
  canvasHeight: z.number().int().positive(),
  heroPlacement: placementRectSchema,
  secondaryPlacement: placementRectSchema.optional(),
  headlinePlacement: placementRectSchema,
  ctaPlacement: placementRectSchema,
  logoPlacement: placementRectSchema,
  safeMargins: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
  }),
  visualDominance: z.enum(["hero", "balanced", "type_forward"]),
  textHierarchy: z.array(z.string()).min(1),
  finishingLayers: z.array(finishingLayerSchema),
  exportFormat: z.enum(["png", "webp", "jpeg"]),
  exportDpiNote: z.string(),
  modeSpecificConstraints: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  /** PACKAGING: FOP-specific rects (composer-driven; not ad layout). */
  packagingLayout: z
    .object({
      variantBand: placementRectSchema,
      secondaryClaim: placementRectSchema,
      legalStrip: placementRectSchema,
    })
    .optional(),
  /** RETAIL_POS: promo-specific rects. */
  retailLayout: z
    .object({
      offerBand: placementRectSchema,
      urgencyStrip: placementRectSchema,
    })
    .optional(),
  /** IDENTITY: 3-up route board + strategy strip. */
  identityLayout: z
    .object({
      strategyStrip: placementRectSchema,
      routeA: placementRectSchema,
      routeB: placementRectSchema,
      routeC: placementRectSchema,
      routeLabelA: placementRectSchema,
      routeLabelB: placementRectSchema,
      routeLabelC: placementRectSchema,
    })
    .optional(),
  /** ECOMMERCE_FASHION: hero + optional detail inset. */
  fashionLayout: z
    .object({
      modelShot: placementRectSchema,
      detailCrop: placementRectSchema.optional(),
    })
    .optional(),
  /** EXPORT_PRESENTATION: slide body + footer (title uses headlinePlacement). */
  exportLayout: z
    .object({
      bodyCopy: placementRectSchema,
      footerStrip: placementRectSchema,
    })
    .optional(),
});

export type CompositionPlanDocument = z.infer<typeof compositionPlanDocumentSchema>;

export type CompositionLayerManifestEntry = {
  id: string;
  zIndex: number;
  kind:
    | "CANVAS"
    | "SOLID"
    | "HERO_RASTER"
    | "SECONDARY_RASTER"
    | "TEXT_HEADLINE"
    | "TEXT_CTA"
    | "TEXT_BODY"
    | "TEXT_TERTIARY"
    | "LOGO_RASTER"
    | "FINISHING"
    | "VARIANT_BAND"
    | "LEGAL_PLACEHOLDER"
    | "SLIDE_BACKGROUND"
    | "SLIDE_TITLE";
  rect: { x: number; y: number; width: number; height: number };
  description: string;
};
