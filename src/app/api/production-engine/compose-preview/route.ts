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

  const socialVariants =
    input.mode === "SOCIAL" ? buildAllSocialVariants(input) : null;
  const socialIdx = socialVariants?.length
    ? Math.min(
        Math.max(0, input.socialVariantIndex ?? 0),
        socialVariants.length - 1,
      )
    : 0;
  const socialSlot = socialVariants?.[socialIdx];

  const manifest = buildLayerManifest(
    plan,
    input,
    socialSlot
      ? { headline: socialSlot.headline, cta: socialSlot.cta }
      : undefined,
  );
  const explanation = buildAssemblyExplanation(plan, input, manifest);
  const review = evaluateProductionOutput(input, productionPlan);

  try {
    const { pngBuffer, width, height } = await runDeterministicComposeSharp({
      input,
      plan,
      heroImageUrl: heroUrl || null,
      secondaryImageUrl: secUrl || null,
      headlineText: socialSlot?.headline,
      ctaText: socialSlot?.cta,
    });

    return NextResponse.json({
      compositionPlanDocument: plan,
      layerManifest: manifest,
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
        assemblyExplanation: explanation,
        review,
      },
      { status: 500 },
    );
  }
}
