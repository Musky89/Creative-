import { NextResponse } from "next/server";
import { z } from "zod";
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
  verifyComposedOutputContext,
  resolveSocialCanvasDimensions,
  type VisualExecutionBundleOptions,
} from "@/lib/production-engine";
import { runDeterministicComposeSharp } from "@/server/production-engine/deterministic-composer";
import { repurposeSocialPngToPlatforms } from "@/server/production-engine/social-repurpose";

const visualOptsSchema = z
  .object({
    extraReferenceUrls: z.array(z.string()).optional(),
    preferEditOverGenerate: z.boolean().optional(),
    strongReferenceImages: z.boolean().optional(),
  })
  .optional();

const composeBodySchema = z.union([
  productionEngineInputSchema,
  z.object({
    input: productionEngineInputSchema,
    visualBundleOptions: visualOptsSchema,
  }),
]);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = composeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const raw = parsed.data;
  const input =
    "input" in raw && raw.input !== undefined ? raw.input : (raw as z.infer<typeof productionEngineInputSchema>);
  const visualBundleOptions: VisualExecutionBundleOptions | undefined =
    "visualBundleOptions" in raw && raw.visualBundleOptions
      ? {
          extraReferenceUrls: raw.visualBundleOptions.extraReferenceUrls,
          preferEditOverGenerate: raw.visualBundleOptions.preferEditOverGenerate,
          strongReferenceImages: raw.visualBundleOptions.strongReferenceImages,
        }
      : undefined;
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
  const visualExecution = buildVisualExecutionBundle(
    input,
    productionPlan,
    visualBundleOptions,
  );
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

    const composeVerification = verifyComposedOutputContext({
      input,
      plan,
      socialVariants: socialVariants ?? undefined,
    });

    const socialPlatformMeta =
      input.mode === "SOCIAL"
        ? resolveSocialCanvasDimensions(input.socialOutputTarget)
        : undefined;

    let socialRepurpose:
      | { platformId: string; width: number; height: number; dataBase64: string }[]
      | undefined;
    const isShowcaseMaster =
      input.mode === "SOCIAL" &&
      resolveSocialCanvasDimensions(input.socialOutputTarget).platformId === "showcase_master";
    if (input.mode === "SOCIAL" && input.socialRepurposePlatformIds?.length && isShowcaseMaster) {
      socialRepurpose = (
        await repurposeSocialPngToPlatforms(pngBuffer, input.socialRepurposePlatformIds)
      ).map((r) => ({
        platformId: r.platformId,
        width: r.width,
        height: r.height,
        dataBase64: r.pngBuffer.toString("base64"),
      }));
    }

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
      composeVerification,
      socialPlatform: socialPlatformMeta,
      socialRepurpose,
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
    const socialVariantsErr =
      input.mode === "SOCIAL" ? buildAllSocialVariants(input) : null;
    const composeVerificationErr = verifyComposedOutputContext({
      input,
      plan,
      socialVariants: socialVariantsErr ?? undefined,
    });
    return NextResponse.json(
      {
        error: "Compose failed",
        message: msg,
        composeVerification: composeVerificationErr,
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
