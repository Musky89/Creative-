/**
 * Reusable layout archetypes for deterministic composition.
 * Mode hints map to defaults; callers may override.
 */

export const LAYOUT_ARCHETYPES = [
  "HERO_LEFT_COPY_RIGHT",
  "CENTERED_HERO_STACK",
  "FULL_BLEED_HERO_CORNER_COPY",
  "PACK_FRONT_CENTERED_STACK",
  "PACK_VARIANT_BAND_LAYOUT",
  "SOCIAL_SPLIT_LAYOUT",
  "SOCIAL_HERO_BOTTOM_COPY",
  "IDENTITY_BOARD_GRID",
  "PRESENTATION_BOARD_LAYOUT",
] as const;

export type LayoutArchetype = (typeof LAYOUT_ARCHETYPES)[number];

export type LayoutArchetypeDefinition = {
  id: LayoutArchetype;
  label: string;
  description: string;
  /** Typical use: which production modes default here. */
  suggestedModes: string[];
};

export const LAYOUT_ARCHETYPE_REGISTRY: Record<
  LayoutArchetype,
  LayoutArchetypeDefinition
> = {
  HERO_LEFT_COPY_RIGHT: {
    id: "HERO_LEFT_COPY_RIGHT",
    label: "Hero left, copy right",
    description: "Split vertical or horizontal: visual anchor left, headline/CTA right.",
    suggestedModes: ["OOH", "RETAIL_POS"],
  },
  CENTERED_HERO_STACK: {
    id: "CENTERED_HERO_STACK",
    label: "Centered hero stack",
    description: "Hero centered with headline and CTA stacked below or overlaid in lower third.",
    suggestedModes: ["SOCIAL", "ECOMMERCE_FASHION"],
  },
  FULL_BLEED_HERO_CORNER_COPY: {
    id: "FULL_BLEED_HERO_CORNER_COPY",
    label: "Full bleed + corner copy",
    description: "Edge-to-edge hero; logo + type in safe corner zones.",
    suggestedModes: ["OOH", "SOCIAL"],
  },
  PACK_FRONT_CENTERED_STACK: {
    id: "PACK_FRONT_CENTERED_STACK",
    label: "Pack front centered stack",
    description: "FOP hierarchy: brand block top, product hero center, claims stack.",
    suggestedModes: ["PACKAGING"],
  },
  PACK_VARIANT_BAND_LAYOUT: {
    id: "PACK_VARIANT_BAND_LAYOUT",
    label: "Pack variant band",
    description: "Horizontal band for variant/SKU stripe under master grid.",
    suggestedModes: ["PACKAGING"],
  },
  SOCIAL_SPLIT_LAYOUT: {
    id: "SOCIAL_SPLIT_LAYOUT",
    label: "Social split",
    description: "50/50 or 40/60 split for thumb-stop zone vs product reveal.",
    suggestedModes: ["SOCIAL"],
  },
  SOCIAL_HERO_BOTTOM_COPY: {
    id: "SOCIAL_HERO_BOTTOM_COPY",
    label: "Social hero + bottom copy",
    description: "Hero fills frame; gradient scrim + headline/CTA in bottom safe zone.",
    suggestedModes: ["SOCIAL"],
  },
  IDENTITY_BOARD_GRID: {
    id: "IDENTITY_BOARD_GRID",
    label: "Identity board grid",
    description: "Neutral grid for route comparison and exploration tiles.",
    suggestedModes: ["IDENTITY"],
  },
  PRESENTATION_BOARD_LAYOUT: {
    id: "PRESENTATION_BOARD_LAYOUT",
    label: "Presentation board",
    description: "16:9 slide regions: title band, hero, bullets, footer.",
    suggestedModes: ["EXPORT_PRESENTATION"],
  },
};

export function listLayoutArchetypes(): LayoutArchetypeDefinition[] {
  return Object.values(LAYOUT_ARCHETYPE_REGISTRY);
}

export function defaultArchetypeForMode(
  mode: import("./modes").ProductionMode,
): LayoutArchetype {
  switch (mode) {
    case "OOH":
      return "FULL_BLEED_HERO_CORNER_COPY";
    case "SOCIAL":
      return "SOCIAL_HERO_BOTTOM_COPY";
    case "PACKAGING":
      return "PACK_FRONT_CENTERED_STACK";
    case "RETAIL_POS":
      return "HERO_LEFT_COPY_RIGHT";
    case "IDENTITY":
      return "IDENTITY_BOARD_GRID";
    case "ECOMMERCE_FASHION":
      return "CENTERED_HERO_STACK";
    case "EXPORT_PRESENTATION":
      return "PRESENTATION_BOARD_LAYOUT";
    default:
      return "CENTERED_HERO_STACK";
  }
}
