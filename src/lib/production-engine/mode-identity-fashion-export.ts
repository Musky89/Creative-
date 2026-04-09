/**
 * IDENTITY, ECOMMERCE_FASHION, EXPORT_PRESENTATION — production helpers.
 */

export const IDENTITY_ROUTE_KEYS = ["ROUTE_A", "ROUTE_B", "ROUTE_C"] as const;
export type IdentityRouteKey = (typeof IDENTITY_ROUTE_KEYS)[number];

export const FASHION_OUTPUT_FAMILIES = [
  "CLEAN_ECOM",
  "EDITORIAL_LOOKBOOK",
  "PRODUCT_SOCIAL",
  "OUTFIT_STORY",
] as const;

export type FashionOutputFamily = (typeof FASHION_OUTPUT_FAMILIES)[number];

export type FashionBatchPreset = "1" | "4";

export function fashionBatchCount(preset?: FashionBatchPreset): number {
  return preset === "4" ? 4 : 1;
}

export function fashionFamiliesForBatch(
  count: number,
  explicit?: FashionOutputFamily[],
): FashionOutputFamily[] {
  const pool =
    explicit && explicit.length > 0 ? explicit : [...FASHION_OUTPUT_FAMILIES];
  const out: FashionOutputFamily[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[i % pool.length]!);
  }
  return out;
}

export type FashionVariantCopy = {
  family: FashionOutputFamily;
  index: number;
  headline: string;
  cta: string;
  shotNotes: string;
};

export function buildFashionVariantCopy(
  input: {
    selectedHeadline: string;
    selectedCta: string;
    selectedConceptName: string;
    visualSpecNotes?: string;
  },
  family: FashionOutputFamily,
  index: number,
): FashionVariantCopy {
  const baseHead = input.selectedHeadline.trim().slice(0, 56);
  const baseCta = input.selectedCta.trim().slice(0, 40);

  switch (family) {
    case "CLEAN_ECOM":
      return {
        family,
        index,
        headline: baseHead || `${input.selectedConceptName} — PDP`,
        cta: baseCta || "Shop now",
        shotNotes:
          "Clean e-com: front or 3/4 on seamless or light gray; garment truth; no lifestyle clutter.",
      };
    case "EDITORIAL_LOOKBOOK":
      return {
        family,
        index,
        headline: `Lookbook — ${input.selectedConceptName}`,
        cta: "Discover the line",
        shotNotes:
          "Editorial: environmental set, softer light, narrative styling; still garment-forward.",
      };
    case "PRODUCT_SOCIAL":
      return {
        family,
        index,
        headline: baseHead,
        cta: baseCta || "Tap to shop",
        shotNotes:
          "Product-led social: hero garment + crop-safe; thumb-stop without busy background.",
      };
    case "OUTFIT_STORY":
      return {
        family,
        index,
        headline: `Full look — ${input.selectedConceptName}`,
        cta: "Build your outfit",
        shotNotes:
          "Outfit/story frame: styled set with complementary pieces; hierarchy on hero SKU.",
      };
    default: {
      const _e: never = family;
      return _e;
    }
  }
}

export function buildAllFashionVariants(input: {
  selectedHeadline: string;
  selectedCta: string;
  selectedConceptName: string;
  visualSpecNotes?: string;
  fashionBatchPreset?: FashionBatchPreset;
  fashionOutputFamilies?: FashionOutputFamily[];
}): FashionVariantCopy[] {
  const n = fashionBatchCount(input.fashionBatchPreset);
  const fams = fashionFamiliesForBatch(n, input.fashionOutputFamilies);
  return fams.map((f, i) => buildFashionVariantCopy(input, f, i));
}

export type ExportDeckSection = {
  id: string;
  title: string;
  body: string;
};

export function buildExportDeckSections(input: {
  briefSummary: string;
  selectedHeadline: string;
  selectedCta: string;
  supportingCopy?: string;
  selectedConceptName: string;
  campaignCore?: {
    singleLineIdea?: string;
    emotionalTension?: string;
    visualNarrative?: string;
  };
}): ExportDeckSection[] {
  const cc = input.campaignCore;
  return [
    {
      id: "cover",
      title: input.selectedConceptName,
      body: "Client presentation — campaign direction and selected creative.",
    },
    {
      id: "context",
      title: "Brief & context",
      body: input.briefSummary.slice(0, 600),
    },
    {
      id: "campaign-core",
      title: "Campaign core",
      body: [cc?.singleLineIdea, cc?.emotionalTension, cc?.visualNarrative]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 500),
    },
    {
      id: "concept",
      title: "Selected concept",
      body: `${input.selectedConceptName}\n\n${input.selectedHeadline}\n\n${input.selectedCta}`,
    },
    {
      id: "copy-support",
      title: "Supporting narrative",
      body: (input.supportingCopy ?? "").trim().slice(0, 700) || "(Add supporting copy in brief.)",
    },
    {
      id: "next",
      title: "Next steps",
      body: "Approve direction, refine assets, schedule production handoff.",
    },
  ];
}
