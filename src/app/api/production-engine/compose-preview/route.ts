import { NextResponse } from "next/server";
import {
  productionEngineInputSchema,
  buildProductionPlan,
  buildCompositionPlanDocument,
  buildLayerManifest,
  buildAssemblyExplanation,
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
  const manifest = buildLayerManifest(plan, input);
  const explanation = buildAssemblyExplanation(plan, input, manifest);

  const heroUrl = input.heroImageUrl?.trim() || null;
  const secUrl = input.secondaryImageUrl?.trim() || null;

  try {
    const { pngBuffer, width, height } = await runDeterministicComposeSharp({
      input,
      plan,
      heroImageUrl: heroUrl || null,
      secondaryImageUrl: secUrl || null,
    });

    return NextResponse.json({
      compositionPlanDocument: plan,
      layerManifest: manifest,
      assemblyExplanation: explanation,
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
      },
      { status: 500 },
    );
  }
}
