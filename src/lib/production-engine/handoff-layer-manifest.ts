/**
 * PSD/Figma-ready structured layer manifest — placement, scale, source URIs, typography.
 */

import type { ProductionEngineInput } from "./types";
import type { VisualExecutionBundle } from "./types";
import type {
  CompositionLayerManifestEntry,
  CompositionPlanDocument,
} from "./composition-plan-schema";
import type { HandoffExportProfile } from "./handoff-export-profile";
import { packagingComposerCopy, retailPosComposerCopy } from "./mode-packaging-retail";
import type { ExportDeckSection, FashionVariantCopy } from "./mode-identity-fashion-export";

export type HandoffLayerSourceRole =
  | "CANVAS"
  | "GENERATED_RASTER"
  | "USER_RASTER"
  | "LOGO"
  | "VECTOR_TEXT"
  | "FINISHING"
  | "PLACEHOLDER";

export type HandoffTextRole =
  | "headline"
  | "cta"
  | "body"
  | "tertiary"
  | "slide_title"
  | "footer"
  | "route_label"
  | "strategy"
  | "legal_placeholder";

export type HandoffLayerManifestLayer = {
  id: string;
  zIndex: number;
  kind: CompositionLayerManifestEntry["kind"];
  role: HandoffLayerSourceRole;
  layerType: string;
  placement: {
    x: number;
    y: number;
    width: number;
    height: number;
    anchor?: string;
  };
  scale: {
    uniform: number;
    scaleX: number;
    scaleY: number;
    fit: "cover" | "contain" | "fill" | "none";
  };
  sourceAsset?: {
    uri?: string;
    role: string;
    targetId?: string;
    falPathId?: string;
    stubAssetId?: string;
  };
  textContent?: {
    role: HandoffTextRole;
    text: string;
    suggestedFontFamily: string;
    suggestedFontWeight: number;
    suggestedFillHex: string;
  };
  logoAsset?: {
    url?: string;
    placementIntent: "contain_in_rect" | "placeholder_type";
    description?: string;
  };
  finishing?: {
    finishingLayerId: string;
    kind: string;
    opacity?: number;
    description: string;
  };
  notes?: string;
};

export type HandoffLayerManifestDocument = {
  schemaVersion: 1;
  generatedAt: string;
  productionMode: ProductionEngineInput["mode"];
  conceptName: string;
  exportProfile: Pick<
    HandoffExportProfile,
    | "presetId"
    | "label"
    | "canvasPx"
    | "exportDimensionsPx"
    | "logicalDpiScreen"
    | "printDpiRecommended"
    | "colorSpace"
    | "primaryFormats"
    | "allowUpscaleMaster"
    | "mediaSpecHint"
  >;
  canvas: {
    widthPx: number;
    heightPx: number;
    safeMargins: CompositionPlanDocument["safeMargins"];
    layoutArchetype: CompositionPlanDocument["layoutArchetype"];
    exportFormat: CompositionPlanDocument["exportFormat"];
    exportDpiNote: string;
  };
  layers: HandoffLayerManifestLayer[];
};

export type HandoffResolvedCopy = {
  headline: string;
  cta: string;
  strategyStrip?: string;
  slideTitle?: string;
  slideBody?: string;
  slideFooterLine?: string;
  secondaryClaim?: string;
  promoHeadline?: string;
  offerLine?: string;
  urgencyLine?: string;
};

export function resolveHandoffCopy(
  input: ProductionEngineInput,
  textOverride?: { headline: string; cta: string },
  context?: { fashionVariant?: FashionVariantCopy; exportSection?: ExportDeckSection },
): HandoffResolvedCopy {
  const packCopy =
    input.mode === "PACKAGING"
      ? packagingComposerCopy({
          selectedHeadline: input.selectedHeadline,
          selectedCta: input.selectedCta,
          supportingCopy: input.supportingCopy,
          selectedConceptName: input.selectedConcept.conceptName,
        })
      : null;
  const retailCopy =
    input.mode === "RETAIL_POS"
      ? retailPosComposerCopy({
          selectedHeadline: input.selectedHeadline,
          selectedCta: input.selectedCta,
          supportingCopy: input.supportingCopy,
        })
      : null;
  const fv = context?.fashionVariant;
  const es = context?.exportSection;

  const headline =
    textOverride?.headline ??
    fv?.headline ??
    (packCopy ? packCopy.brandLine : retailCopy?.promoHeadline ?? input.selectedHeadline);
  const cta =
    textOverride?.cta ??
    fv?.cta ??
    (packCopy ? packCopy.primaryClaim : retailCopy?.offerLine ?? input.selectedCta);

  const brief = input.briefSummary.slice(0, 600);
  const strategyStrip =
    input.mode === "IDENTITY" ? `Strategy · ${brief}${input.briefSummary.length > 600 ? "…" : ""}` : undefined;

  return {
    headline,
    cta,
    strategyStrip,
    slideTitle: es?.title,
    slideBody: es?.body,
    slideFooterLine: es ? `${es.id} · ${input.selectedConcept.conceptName}` : undefined,
    secondaryClaim: packCopy?.secondaryClaim,
    promoHeadline: retailCopy?.promoHeadline,
    offerLine: retailCopy?.offerLine,
    urgencyLine: retailCopy?.urgencyLine,
  };
}

function rasterExecutions(bundle: VisualExecutionBundle) {
  return bundle.routedExecutions.filter((ex) => ex.response.assets.length > 0);
}

function stubAt(bundle: VisualExecutionBundle, index: number) {
  const list = rasterExecutions(bundle);
  const ex = list[index];
  const a = ex?.response.assets[0];
  return {
    uri: a?.uri,
    targetId: ex?.target.id,
    falPathId: ex?.response.falPathUsed,
    stubAssetId: a?.assetId,
  };
}

function scaleForRasterKind(
  kind: CompositionLayerManifestEntry["kind"],
): HandoffLayerManifestLayer["scale"] {
  if (kind === "HERO_RASTER" || kind === "SECONDARY_RASTER") {
    return { uniform: 1, scaleX: 1, scaleY: 1, fit: "cover" };
  }
  if (kind === "LOGO_RASTER") {
    return { uniform: 1, scaleX: 1, scaleY: 1, fit: "contain" };
  }
  return { uniform: 1, scaleX: 1, scaleY: 1, fit: "none" };
}

export function buildHandoffLayerManifestDocument(args: {
  input: ProductionEngineInput;
  compositionPlan: CompositionPlanDocument;
  logicalManifest: CompositionLayerManifestEntry[];
  visualExecution: VisualExecutionBundle;
  exportProfile: HandoffExportProfile;
  resolvedCopy: HandoffResolvedCopy;
}): HandoffLayerManifestDocument {
  const { input, compositionPlan: doc, logicalManifest, visualExecution, exportProfile, resolvedCopy } = args;
  const inUrl = (u?: string) => !!u?.trim();

  const layers: HandoffLayerManifestLayer[] = logicalManifest.map((e) => {
    const base = {
      id: e.id,
      zIndex: e.zIndex,
      kind: e.kind,
      placement: { ...e.rect },
      scale: scaleForRasterKind(e.kind),
      notes: e.description,
    };

    if (e.kind === "CANVAS") {
      return { ...base, role: "CANVAS" as const, layerType: "artboard" };
    }
    if (e.kind === "SOLID") {
      const bg = input.brandAssets?.colors?.find((c) => c.role === "background");
      return {
        ...base,
        role: "PLACEHOLDER" as const,
        layerType: "solid_background",
        textContent: {
          role: "body" as const,
          text: `Background ${bg?.hex ?? "#1a1a1c"}`,
          suggestedFontFamily: "n/a",
          suggestedFontWeight: 400,
          suggestedFillHex: bg?.hex ?? "#1a1a1c",
        },
      };
    }
    if (e.kind === "HERO_RASTER") {
      const user = inUrl(input.heroImageUrl);
      return {
        ...base,
        role: user ? "USER_RASTER" : "GENERATED_RASTER",
        layerType: "hero_raster",
        sourceAsset: user
          ? { uri: input.heroImageUrl!.trim(), role: "heroImageUrl" }
          : { ...stubAt(visualExecution, 0), role: "fal_stub_hero" },
      };
    }
    if (e.kind === "SECONDARY_RASTER") {
      const isIdentityC = e.id === "tertiary-raster-identity";
      const isDetail = e.id === "fashion-detail-raster";
      const user =
        isIdentityC && inUrl(input.tertiaryImageUrl)
          ? input.tertiaryImageUrl!.trim()
          : inUrl(input.secondaryImageUrl)
            ? input.secondaryImageUrl!.trim()
            : undefined;
      const stubIdx =
        isIdentityC ? 2 : isDetail ? Math.max(0, rasterExecutions(visualExecution).length - 1) : 1;
      return {
        ...base,
        role: user ? "USER_RASTER" : "GENERATED_RASTER",
        layerType: isDetail ? "detail_raster" : isIdentityC ? "route_c_raster" : "secondary_raster",
        sourceAsset: user
          ? {
              uri: user,
              role: isIdentityC ? "tertiaryImageUrl" : "secondaryImageUrl",
            }
          : { ...stubAt(visualExecution, stubIdx), role: "fal_stub_secondary" },
      };
    }
    if (e.kind === "VARIANT_BAND") {
      return {
        ...base,
        role: "VECTOR_TEXT" as const,
        layerType: "packaging_variant_band",
        finishing: {
          finishingLayerId: "variant-band-compose",
          kind: "BORDER",
          description: e.description,
        },
      };
    }
    if (e.kind === "FINISHING") {
      const fin = doc.finishingLayers.find((f) => `finishing-${f.id}` === e.id);
      return {
        ...base,
        role: "FINISHING" as const,
        layerType: "finishing_overlay",
        finishing: fin
          ? {
              finishingLayerId: fin.id,
              kind: fin.kind,
              opacity: fin.opacity,
              description: fin.description,
            }
          : {
              finishingLayerId: e.id,
              kind: "UNKNOWN",
              description: e.description,
            },
      };
    }
    if (e.kind === "SLIDE_TITLE") {
      const typeHex =
        input.brandAssets?.colors?.find((c) => c.role === "type")?.hex ?? "#f4f4f5";
      return {
        ...base,
        role: "VECTOR_TEXT" as const,
        layerType: "text_layer",
        textContent: {
          role: "slide_title",
          text: resolvedCopy.slideTitle ?? resolvedCopy.headline,
          suggestedFontFamily: "DejaVu Sans, Liberation Sans, Arial, sans-serif",
          suggestedFontWeight: 700,
          suggestedFillHex: typeHex,
        },
      };
    }
    if (e.kind === "TEXT_HEADLINE") {
      const typeHex =
        input.mode === "PACKAGING" || input.mode === "IDENTITY" ? "#18181b" : "#f4f4f5";
      return {
        ...base,
        role: "VECTOR_TEXT" as const,
        layerType: "text_layer",
        textContent: {
          role: "headline",
          text: resolvedCopy.headline,
          suggestedFontFamily: "DejaVu Sans, Liberation Sans, Arial, sans-serif",
          suggestedFontWeight: 700,
          suggestedFillHex: typeHex,
        },
      };
    }
    if (e.kind === "TEXT_CTA") {
      const typeHex =
        input.mode === "PACKAGING" || input.mode === "IDENTITY" ? "#3f3f46" : "#a1a1aa";
      return {
        ...base,
        role: "VECTOR_TEXT" as const,
        layerType: "text_layer",
        textContent: {
          role: "cta",
          text: resolvedCopy.cta,
          suggestedFontFamily: "DejaVu Sans, Liberation Sans, Arial, sans-serif",
          suggestedFontWeight: 600,
          suggestedFillHex: typeHex,
        },
      };
    }
    if (e.kind === "TEXT_BODY") {
      const isExport = e.id === "export-body";
      const isStrategy = e.id === "identity-strategy";
      const text = isExport
        ? resolvedCopy.slideBody ?? ""
        : isStrategy
          ? resolvedCopy.strategyStrip ?? resolvedCopy.headline
          : "";
      const role: HandoffTextRole = isExport ? "body" : "strategy";
      return {
        ...base,
        role: "VECTOR_TEXT" as const,
        layerType: "text_layer",
        textContent: {
          role,
          text,
          suggestedFontFamily: "DejaVu Sans, Liberation Sans, Arial, sans-serif",
          suggestedFontWeight: isStrategy ? 500 : 400,
          suggestedFillHex: isExport ? "#e4e4e7" : "#27272a",
        },
      };
    }
    if (e.kind === "TEXT_TERTIARY") {
      return {
        ...base,
        role: "VECTOR_TEXT" as const,
        layerType: "text_layer",
        textContent: {
          role: "tertiary",
          text: resolvedCopy.secondaryClaim ?? e.description,
          suggestedFontFamily: "DejaVu Sans, Liberation Sans, Arial, sans-serif",
          suggestedFontWeight: 500,
          suggestedFillHex: "#52525b",
        },
      };
    }
    if (e.kind === "LEGAL_PLACEHOLDER") {
      return {
        ...base,
        role: "VECTOR_TEXT" as const,
        layerType: "legal_zone",
        textContent: {
          role: "legal_placeholder",
          text: "NUTRITION / INGREDIENTS / LEGAL — PLACEHOLDER (composer zone)",
          suggestedFontFamily: "DejaVu Sans, Liberation Sans, Arial, sans-serif",
          suggestedFontWeight: 400,
          suggestedFillHex: "#71717a",
        },
      };
    }
    if (e.kind === "LOGO_RASTER") {
      const url = input.brandAssets?.logoUrl?.trim();
      return {
        ...base,
        role: url ? "LOGO" : "PLACEHOLDER",
        layerType: "logo",
        logoAsset: {
          url: url || undefined,
          placementIntent: url ? "contain_in_rect" : "placeholder_type",
          description: e.description,
        },
      };
    }
    return {
      ...base,
      role: "PLACEHOLDER" as const,
      layerType: e.kind.toLowerCase(),
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    productionMode: input.mode,
    conceptName: input.selectedConcept.conceptName,
    exportProfile: {
      presetId: exportProfile.presetId,
      label: exportProfile.label,
      canvasPx: exportProfile.canvasPx,
      exportDimensionsPx: exportProfile.exportDimensionsPx,
      logicalDpiScreen: exportProfile.logicalDpiScreen,
      printDpiRecommended: exportProfile.printDpiRecommended,
      colorSpace: exportProfile.colorSpace,
      primaryFormats: exportProfile.primaryFormats,
      allowUpscaleMaster: exportProfile.allowUpscaleMaster,
      mediaSpecHint: exportProfile.mediaSpecHint,
    },
    canvas: {
      widthPx: doc.canvasWidth,
      heightPx: doc.canvasHeight,
      safeMargins: doc.safeMargins,
      layoutArchetype: doc.layoutArchetype,
      exportFormat: doc.exportFormat,
      exportDpiNote: doc.exportDpiNote,
    },
    layers,
  };
}
