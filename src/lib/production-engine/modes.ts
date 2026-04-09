export const PRODUCTION_MODES = [
  "OOH",
  "SOCIAL",
  "PACKAGING",
  "RETAIL_POS",
  "IDENTITY",
  "ECOMMERCE_FASHION",
  "EXPORT_PRESENTATION",
] as const;

export type ProductionMode = (typeof PRODUCTION_MODES)[number];
