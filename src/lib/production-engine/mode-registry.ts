import type { ProductionMode } from "./types";

export type ProductionModeConfig = {
  id: ProductionMode;
  label: string;
  description: string;
  typicalAspectRatios: string[];
  defaultFalEndpointId: string;
  exportFormats: string[];
  notes: string;
};

export const PRODUCTION_MODE_REGISTRY: Record<
  ProductionMode,
  ProductionModeConfig
> = {
  OOH: {
    id: "OOH",
    label: "Out-of-home",
    description: "Billboards, transit, large-format street media.",
    typicalAspectRatios: ["14:48", "4:1", "1:1"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["png", "pdf"],
    notes: "High legibility distance; brand lockups in safe zones.",
  },
  SOCIAL: {
    id: "SOCIAL",
    label: "Social",
    description: "Feed, story, and paid social crops.",
    typicalAspectRatios: ["1:1", "4:5", "9:16"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["png", "jpg"],
    notes: "Platform-specific safe areas; thumb-stopping hook zone.",
  },
  PACKAGING: {
    id: "PACKAGING",
    label: "Packaging",
    description: "Structural panels, dielines, shelf-facing hero.",
    typicalAspectRatios: ["varies by dieline"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["png", "pdf", "svg"],
    notes: "Regulatory blocks; barcode/ingredient zones reserved.",
  },
  RETAIL_POS: {
    id: "RETAIL_POS",
    label: "Retail / POS",
    description: "Shelf talkers, counter cards, window clings.",
    typicalAspectRatios: ["3:4", "2:3", "custom trim"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["png", "pdf"],
    notes: "Print bleed; store lighting assumptions.",
  },
  IDENTITY: {
    id: "IDENTITY",
    label: "Identity",
    description: "Logo applications, stationery, brand marks in context.",
    typicalAspectRatios: ["vector-first", "1:1 lockup"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["svg", "png", "pdf"],
    notes: "Clear space; single-color reversals.",
  },
  ECOMMERCE_FASHION: {
    id: "ECOMMERCE_FASHION",
    label: "E-commerce (fashion)",
    description: "PDP hero, lookbook stills, on-model or flat-lay.",
    typicalAspectRatios: ["3:4", "4:5"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["png", "webp"],
    notes: "SKU consistency; fabric truth vs stylization.",
  },
  EXPORT_PRESENTATION: {
    id: "EXPORT_PRESENTATION",
    label: "Export / presentation",
    description: "Founder-ready deck or one-pager bundle.",
    typicalAspectRatios: ["16:9", "A4"],
    defaultFalEndpointId: "n/a — composition-first (placeholder)",
    exportFormats: ["pdf", "markdown"],
    notes: "Narrative order; appendix for raw prompts/specs.",
  },
};

export function getModeConfig(mode: ProductionMode): ProductionModeConfig {
  return PRODUCTION_MODE_REGISTRY[mode];
}

export function listProductionModes(): ProductionModeConfig[] {
  return Object.values(PRODUCTION_MODE_REGISTRY);
}
