import { NextResponse } from "next/server";
import {
  productionEngineInputSchema,
  buildProductionPlan,
  buildCompositionPlanDocument,
  buildLayerManifest,
  buildAssemblyExplanation,
  evaluateProductionOutput,
  buildAllSocialVariants,
  getPackagingVariantSpec,
  buildAllFashionVariants,
  buildExportDeckSections,
  buildVisualExecutionBundle,
  buildHandoffPackage,
} from "@/lib/production-engine";
import { runDeterministicComposeSharp } from "@/server/production-engine/deterministic-composer";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = productionEngineInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const input = parsed.data;
  const { document: productionPlan } = buildProductionPlan(input);
  const plan = buildCompositionPlanDocument(
    input,
    productionPlan,
    input.layoutArchetype,
  );
  const heroUrl = input.heroImageUrl?.trim() || null;
  const secUrl = input.secondaryImageUrl?.trim() || null;
  const tertiaryUrl = input.tertiaryImageUrl?.trim() || null;

  const socialVariants =
    input.mode === "SOCIAL" ? buildAllSocialVariants(input) : null;
  const socialIdx = socialVariants?.length
    ? Math.min(
        Math.max(0, input.socialVariantIndex ?? 0),
        socialVariants.length - 1,
      )
    : 0;
  const socialSlot = socialVariants?.[socialIdx];

  const fashionVariants =
    input.mode === "ECOMMERCE_FASHION"
      ? buildAllFashionVariants({
          selectedHeadline: input.selectedHeadline,
          selectedCta: input.selectedCta,
          selectedConceptName: input.selectedConcept.conceptName,
          visualSpecNotes: input.visualSpecNotes,
          fashionBatchPreset: input.fashionBatchPreset,
          fashionOutputFamilies: input.fashionOutputFamilies,
        })
      : null;
  const fashionIdx = fashionVariants?.length
    ? Math.min(
        Math.max(0, input.fashionVariantIndex ?? 0),
        fashionVariants.length - 1,
      )
    : 0;
  const fashionSlot = fashionVariants?.[fashionIdx];

  const exportDeckSections =
    input.mode === "EXPORT_PRESENTATION"
      ? buildExportDeckSections({
          briefSummary: input.briefSummary,
          selectedHeadline: input.selectedHeadline,
          selectedCta: input.selectedCta,
          supportingCopy: input.supportingCopy,
          selectedConceptName: input.selectedConcept.conceptName,
          campaignCore: input.campaignCore,
        })
      : null;
  const exportIdx = exportDeckSections?.length
    ? Math.min(
        Math.max(0, input.exportSlideIndex ?? 0),
        exportDeckSections.length - 1,
      )
    : 0;
  const exportDeckSection = exportDeckSections?.[exportIdx];

  const manifest = buildLayerManifest(
    plan,
    input,
    socialSlot
      ? { headline: socialSlot.headline, cta: socialSlot.cta }
      : fashionSlot
        ? { headline: fashionSlot.headline, cta: fashionSlot.cta }
        : undefined,
    fashionSlot || exportDeckSection
      ? {
          fashionVariant: fashionSlot ?? undefined,
          exportSection: exportDeckSection,
        }
      : undefined,
  );
  const explanation = buildAssemblyExplanation(plan, input, manifest);
  const review = evaluateProductionOutput(input, productionPlan);
  const visualExecution = buildVisualExecutionBundle(input, productionPlan);
  const handoff = buildHandoffPackage(
    input,
    productionPlan,
    plan,
    manifest,
    visualExecution,
    {
      qualityTier: input.visualQualityTier,
      textOverride: socialSlot
        ? { headline: socialSlot.headline, cta: socialSlot.cta }
        : fashionSlot
          ? { headline: fashionSlot.headline, cta: fashionSlot.cta }
          : undefined,
      fashionVariant: fashionSlot ?? undefined,
      exportSection: exportDeckSection ?? undefined,
    },
  );

  try {
    const { pngBuffer, width, height } = await runDeterministicComposeSharp({
      input,
      plan,
      heroImageUrl: heroUrl || null,
      secondaryImageUrl: secUrl || null,
      tertiaryImageUrl: tertiaryUrl || null,
      exportDeckSection: exportDeckSection ?? null,
      identityRouteHighlight: input.identityRouteHighlight,
      headlineText: socialSlot?.headline ?? fashionSlot?.headline,
      ctaText: socialSlot?.cta ?? fashionSlot?.cta,
    });

    return NextResponse.json({
      compositionPlanDocument: plan,
      layerManifest: manifest,
      handoffLayerManifest: handoff.layerManifestStructured,
      handoffPackage: {
        bundleName: handoff.bundleName,
        items: handoff.items,
        readme: handoff.readme,
        exportProfile: handoff.exportProfile,
        copyMetadata: handoff.copyMetadata,
        brandMetadata: handoff.brandMetadata,
        sourceVisuals: handoff.sourceVisuals,
        productionNotes: handoff.productionNotes,
      },
      assemblyExplanation: explanation,
      review,
      packagingVariantSpec:
        input.mode === "PACKAGING"
          ? getPackagingVariantSpec(input.packagingVariant ?? "ORIGINAL")
          : undefined,
      socialSlot:
        input.mode === "SOCIAL" && socialSlot
          ? {
              index: socialIdx,
              family: socialSlot.family,
              headline: socialSlot.headline,
              cta: socialSlot.cta,
              visualVariationHint: socialSlot.visualVariationHint,
            }
          : undefined,
      fashionSlot:
        input.mode === "ECOMMERCE_FASHION" && fashionSlot
          ? {
              index: fashionIdx,
              family: fashionSlot.family,
              headline: fashionSlot.headline,
              cta: fashionSlot.cta,
              shotNotes: fashionSlot.shotNotes,
            }
          : undefined,
      exportDeckSections: exportDeckSections ?? undefined,
      exportDeckSection:
        input.mode === "EXPORT_PRESENTATION" && exportDeckSection
          ? { index: exportIdx, ...exportDeckSection }
          : undefined,
      identityRouteLayout: plan.identityLayout,
      fashionLayout: plan.fashionLayout,
      exportLayout: plan.exportLayout,
      preview: {
        mimeType: "image/png",
        width,
        height,
        dataBase64: pngBuffer.toString("base64"),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Compose failed",
        message: msg,
        compositionPlanDocument: plan,
        layerManifest: manifest,
        handoffLayerManifest: handoff.layerManifestStructured,
        handoffPackage: {
          bundleName: handoff.bundleName,
          items: handoff.items,
          readme: handoff.readme,
          exportProfile: handoff.exportProfile,
          copyMetadata: handoff.copyMetadata,
          brandMetadata: handoff.brandMetadata,
          sourceVisuals: handoff.sourceVisuals,
          productionNotes: handoff.productionNotes,
        },
        assemblyExplanation: explanation,
        review,
      },
      { status: 500 },
    );
  }
}
