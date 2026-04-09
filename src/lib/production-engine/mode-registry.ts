import type { ProductionMode } from "./types";

/** Rich mode config for planning, review, and export behavior. */
export type ProductionModeConfig = {
  id: ProductionMode;
  label: string;
  description: string;
  typicalAspectRatios: string[];
  defaultFalEndpointId: string;
  exportFormats: string[];
  notes: string;
  /** What this mode is trying to achieve in production. */
  objective: string;
  /** Criteria the review layer should enforce. */
  successCriteria: string[];
  /** Ordered composition priorities (what wins in layout conflicts). */
  compositionPriorities: string[];
  /** How much copy is acceptable (e.g. minimal vs flexible). */
  textTolerance: string;
  /** What imagery should deliver (subject, style, fidelity). */
  imageExpectations: string[];
  /** Grid, hierarchy, safe zones, batch structure. */
  layoutExpectations: string[];
  /** Extra emphasis for QA / Brand-style review. */
  reviewFocus: string[];
  /** Expected deliverable shapes and formats. */
  exportExpectations: string[];
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
    objective:
      "Maximum impact at distance with minimal cognitive load — one idea, one focal read.",
    successCriteria: [
      "Readable headline at specified viewing distance",
      "Single dominant focal point",
      "Brand mark legible in peripheral vision",
      "No clutter competing with the core message",
    ],
    compositionPriorities: [
      "Focal point dominance",
      "Negative space",
      "Simple typographic hierarchy",
      "Logo / lockup discipline",
    ],
    textTolerance: "Minimal — headline + optional short subline + CTA only; avoid body copy.",
    imageExpectations: [
      "Bold, simple visual with clear silhouette",
      "High contrast for outdoor lighting variance",
      "Avoid fine detail that dies at distance",
    ],
    layoutExpectations: [
      "Generous margins and safe zones for trim",
      "Vertical or horizontal dominance — not busy grids",
      "CTA subordinate but findable",
    ],
    reviewFocus: [
      "Distance readability",
      "Focal point strength",
      "Negative space usage",
      "Hierarchy simplicity",
    ],
    exportExpectations: [
      "Print-ready raster at target OOH spec",
      "Optional reduced proof for client PDF",
    ],
  },
  SOCIAL: {
    id: "SOCIAL",
    label: "Social",
    description: "Feed, story, and paid social crops.",
    typicalAspectRatios: ["1:1", "4:5", "9:16"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["png", "jpg"],
    notes: "Platform-specific safe areas; thumb-stopping hook zone.",
    objective:
      "Campaign-family creative with controlled variation across placements and batches.",
    successCriteria: [
      "Instant hook in thumb-stop zone",
      "Recognizable campaign family across crops",
      "Platform-safe areas respected",
      "CTA visible without crowding the hook",
    ],
    compositionPriorities: [
      "Hook zone (upper/third or center-weighted by format)",
      "Brand consistency across variants",
      "Headline legibility on small screens",
      "Variation that does not break campaign logic",
    ],
    textTolerance:
      "More flexible than OOH — short body or sticker text OK; still scannable.",
    imageExpectations: [
      "Thumb-stopping contrast or motion-implied still",
      "Crop-robust composition (safe for 1:1 / 4:5 / 9:16)",
    ],
    layoutExpectations: [
      "Batch-friendly master → derive crops",
      "Recurring motif or color anchor across set",
      "Optional carousel sequencing logic",
    ],
    reviewFocus: [
      "Campaign family coherence",
      "Variation rules (what may change vs must stay)",
      "Platform crop safety",
    ],
    exportExpectations: [
      "Per-platform dimension sets",
      "Naming convention for asset families",
    ],
  },
  PACKAGING: {
    id: "PACKAGING",
    label: "Packaging",
    description: "Structural panels, dielines, shelf-facing hero.",
    typicalAspectRatios: ["varies by dieline"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["png", "pdf", "svg"],
    notes: "Regulatory blocks; barcode/ingredient zones reserved.",
    objective:
      "Shelf-facing clarity with strict front-of-pack hierarchy and variant discipline.",
    successCriteria: [
      "Brand block and variant read in 3-second aisle scan",
      "Mandatory claims and regulatory zones reserved",
      "Structured grid — no drifting type",
    ],
    compositionPriorities: [
      "Front-of-pack hierarchy (brand → variant → benefit)",
      "Deterministic logo placement",
      "Claims priority order locked",
      "Barcode / nutrition / legal greeking zones",
    ],
    textTolerance:
      "Structured — only approved copy blocks; no free-form marketing paragraphs on FOP.",
    imageExpectations: [
      "Product truth or approved hero render",
      "Flavor / variant cues consistent with naming",
    ],
    layoutExpectations: [
      "Grid and margin system from dieline",
      "Variant system logic (colorway, SKU stripe)",
      "Panel-specific roles (FOP, BOP, topper)",
    ],
    reviewFocus: [
      "Shelf impact at distance",
      "Hierarchy vs competitors in set",
      "Variant logic integrity",
      "Grid compliance",
    ],
    exportExpectations: [
      "Separated layers or print PDF per panel",
      "3D mock or flat dieline export",
    ],
  },
  RETAIL_POS: {
    id: "RETAIL_POS",
    label: "Retail / POS",
    description: "Shelf talkers, counter cards, window clings.",
    typicalAspectRatios: ["3:4", "2:3", "custom trim"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["png", "pdf"],
    notes: "Print bleed; store lighting assumptions.",
    objective:
      "In-store clarity — product, offer, and urgency readable under retail lighting.",
    successCriteria: [
      "Offer readable from expected viewing distance",
      "Product recognition or pack shot clear",
      "Promo hierarchy unambiguous",
    ],
    compositionPriorities: [
      "Offer / price / CTA prominence",
      "Product + pack clarity",
      "Urgency treatment (time-bound, seasonal)",
      "Retailer co-brand zones if required",
    ],
    textTolerance:
      "Promo-forward — short offer lines, price, legal asterisk space reserved.",
    imageExpectations: [
      "High legibility under warm/cool store light",
      "Appetite or efficacy cues appropriate to category",
    ],
    layoutExpectations: [
      "Promo hierarchy: anchor offer → supporting proof → CTA",
      "Bleed and trim for irregular POS shapes",
    ],
    reviewFocus: [
      "Offer visibility",
      "Urgency / promo hierarchy",
      "In-store readability",
    ],
    exportExpectations: [
      "Print PDF with bleed",
      "Optional digital screen spec",
    ],
  },
  IDENTITY: {
    id: "IDENTITY",
    label: "Identity",
    description: "Logo applications, stationery, brand marks in context.",
    typicalAspectRatios: ["vector-first", "1:1 lockup"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["svg", "png", "pdf"],
    notes: "Clear space; single-color reversals.",
    objective:
      "Route and exploration boards — symbol, wordmark, and system logic presented clearly.",
    successCriteria: [
      "Each route distinguishable — not reworded duplicates",
      "Clear space and minimum size rules visible",
      "Narrative ties strategy to form",
    ],
    compositionPriorities: [
      "Route board logic (comparison legible)",
      "Symbol vs wordmark presentation",
      "Exploration breadth without noise",
      "Application previews (stub in plan)",
    ],
    textTolerance:
      "Labels and rationale lines OK; avoid marketing fluff on pure mark boards.",
    imageExpectations: [
      "Crisp vector-first where possible",
      "Context shots subdued so mark remains hero",
    ],
    layoutExpectations: [
      "Board type structure (e.g. route A/B/C, exploration grid)",
      "Consistent scale across routes for comparison",
    ],
    reviewFocus: [
      "Ownability vs category cliché",
      "Route differentiation",
      "Lockup discipline",
    ],
    exportExpectations: [
      "Board PDF / PNG set",
      "Asset package manifest for handoff",
    ],
  },
  ECOMMERCE_FASHION: {
    id: "ECOMMERCE_FASHION",
    label: "E-commerce (fashion)",
    description: "PDP hero, lookbook stills, on-model or flat-lay.",
    typicalAspectRatios: ["3:4", "4:5"],
    defaultFalEndpointId: "fal-ai/flux-general (placeholder)",
    exportFormats: ["png", "webp"],
    notes: "SKU consistency; fabric truth vs stylization.",
    objective:
      "Consistent set of garment-forward images — catalog truth with optional editorial lift.",
    successCriteria: [
      "Garment silhouette and color accurate vs SKU",
      "Set coherence (lighting, crop, model role)",
      "Clear PDP vs lookbook intent per asset",
    ],
    compositionPriorities: [
      "Garment as hero",
      "Model pose serving fit drape",
      "Scene supporting brand world without stealing focus",
      "Shot type consistency within set",
    ],
    textTolerance:
      "Minimal on-image; copy lives in PDP template — optional small badge.",
    imageExpectations: [
      "Fabric texture credible",
      "Pose and shot type aligned to plan (e.g. front, three-quarter, detail)",
      "Editorial vs catalog bias explicit",
    ],
    layoutExpectations: [
      "Safe crop for PDP carousel",
      "Set-level consistency checklist",
    ],
    reviewFocus: [
      "Catalog vs editorial bias",
      "Cross-SKU consistency",
      "Garment truth",
    ],
    exportExpectations: [
      "Web-optimized masters",
      "Naming aligned to SKU / angle",
    ],
  },
  EXPORT_PRESENTATION: {
    id: "EXPORT_PRESENTATION",
    label: "Export / presentation",
    description: "Founder-ready deck or one-pager bundle.",
    typicalAspectRatios: ["16:9", "A4"],
    defaultFalEndpointId: "n/a — composition-first (placeholder)",
    exportFormats: ["pdf", "markdown"],
    notes: "Narrative order; appendix for raw prompts/specs.",
    objective:
      "Client-facing sequencing — story arc, grouped outputs, and rationale density controlled.",
    successCriteria: [
      "Narrative order matches decision journey",
      "Rationale grouped with the work it explains",
      "Appendix for specs without cluttering story slides",
    ],
    compositionPriorities: [
      "Story arc clarity",
      "Output grouping (concepts, copy, visual, identity)",
      "Rationale density appropriate to audience",
      "Cover / agenda / closing CTA",
    ],
    textTolerance:
      "High for rationale slides; low on pure visual reveal slides.",
    imageExpectations: [
      "Placed creative at consistent slide margins",
      "Optional before/after or evolution sequences",
    ],
    layoutExpectations: [
      "Slide master consistency",
      "Grouping logic explicit in plan",
    ],
    reviewFocus: [
      "Story arc flow",
      "Rationale density",
      "Client-facing tone",
    ],
    exportExpectations: [
      "PDF deck",
      "Companion markdown or speaker notes",
    ],
  },
};

export function getModeConfig(mode: ProductionMode): ProductionModeConfig {
  return PRODUCTION_MODE_REGISTRY[mode];
}

export function listProductionModes(): ProductionModeConfig[] {
  return Object.values(PRODUCTION_MODE_REGISTRY);
}
