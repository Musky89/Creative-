import type { ProductionEngineInput, ProductionEngineRunResult } from "./types";
import { buildProductionPlan } from "./planning";
import { routeFalForProduction } from "./fal-routing";
import { buildVisualExecutionBundle } from "./visual-execution";
import { buildProductionJobs } from "./jobs";
import { buildCompositionPlanDocument } from "./composition-plan";
import {
  buildLayerManifest,
  buildAssemblyExplanation,
} from "./composition-manifest";
import { buildComposedArtifactStubs } from "./composer";
import { evaluateProductionOutput } from "./review";
import { buildHandoffPackage } from "./handoff";
import { buildAllSocialVariants } from "./mode-ooh-social";
import { getPackagingVariantSpec } from "./mode-packaging-retail";
import {
  buildAllFashionVariants,
  buildExportDeckSections,
} from "./mode-identity-fashion-export";

/**
 * End-to-end stub pipeline for the standalone engine (no I/O).
 */
export function runProductionEngineStub(
  input: ProductionEngineInput,
): ProductionEngineRunResult {
  const { document: productionPlan, operational: operationalPlan } =
    buildProductionPlan(input);
  const visualExecution = buildVisualExecutionBundle(input, productionPlan);
  const falRouting = routeFalForProduction(input, productionPlan);
  const jobs = buildProductionJobs(input, visualExecution);
  const compositionPlanDocument = buildCompositionPlanDocument(
    input,
    productionPlan,
    input.layoutArchetype,
  );
  const socialVariants =
    input.mode === "SOCIAL" ? buildAllSocialVariants(input) : undefined;
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
      : undefined;
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
      : undefined;
  const exportIdx = exportDeckSections?.length
    ? Math.min(
        Math.max(0, input.exportSlideIndex ?? 0),
        exportDeckSections.length - 1,
      )
    : 0;
  const exportSection = exportDeckSections?.[exportIdx];
  const layerManifest = buildLayerManifest(
    compositionPlanDocument,
    input,
    socialSlot
      ? { headline: socialSlot.headline, cta: socialSlot.cta }
      : undefined,
    fashionSlot || exportSection
      ? {
          fashionVariant: fashionSlot,
          exportSection,
        }
      : undefined,
  );
  const assemblyExplanation = buildAssemblyExplanation(
    compositionPlanDocument,
    input,
    layerManifest,
  );
  const composed = buildComposedArtifactStubs(
    input,
    compositionPlanDocument,
    layerManifest,
  );
  const review = evaluateProductionOutput(input, productionPlan);
  const handoff = buildHandoffPackage(input, productionPlan);
  const packagingVariantSpec =
    input.mode === "PACKAGING"
      ? getPackagingVariantSpec(input.packagingVariant ?? "ORIGINAL")
      : undefined;
  return {
    input,
    productionPlan,
    operationalPlan,
    falRouting,
    visualExecution,
    socialVariants,
    fashionVariants,
    exportDeckSections,
    packagingVariantSpec,
    jobs,
    compositionPlanDocument,
    layerManifest,
    assemblyExplanation,
    composed,
    review,
    handoff,
  };
}
