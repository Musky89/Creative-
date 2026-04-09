import { NextResponse } from "next/server";
import { z } from "zod";
import {
  productionEngineInputSchema,
  buildProductionPlan,
  buildVisualExecutionBundle,
  type VisualExecutionBundleOptions,
} from "@/lib/production-engine";
import type { LabExecutionKind } from "@/server/creative-testing-lab/execute-fal";
import { executeFalForLabTargets } from "@/server/creative-testing-lab/execute-fal";

const visualOptsSchema = z
  .object({
    extraReferenceUrls: z.array(z.string()).optional(),
    preferEditOverGenerate: z.boolean().optional(),
    strongReferenceImages: z.boolean().optional(),
  })
  .optional();

const executionKindSchema = z.enum([
  "router_default",
  "force_text",
  "force_edit",
  "force_lora",
  "force_lora_edit",
]);

const bodySchema = z.object({
  input: productionEngineInputSchema,
  visualBundleOptions: visualOptsSchema,
  targetIndices: z.array(z.number().int().min(0)).min(1).max(12),
  executionKind: executionKindSchema,
  batchSize: z.number().int().min(1).max(4).optional(),
});

export async function POST(req: Request) {
  if (!process.env.FAL_KEY?.trim()) {
    return NextResponse.json(
      {
        error: "FAL_KEY not configured",
        hint: "Set FAL_KEY in the environment to run live FAL jobs from the lab.",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { input, visualBundleOptions, targetIndices, executionKind, batchSize } =
    parsed.data;

  const opts: VisualExecutionBundleOptions | undefined = visualBundleOptions
    ? {
        extraReferenceUrls: visualBundleOptions.extraReferenceUrls,
        preferEditOverGenerate: visualBundleOptions.preferEditOverGenerate,
        strongReferenceImages: visualBundleOptions.strongReferenceImages,
      }
    : undefined;

  const { document: plan } = buildProductionPlan(input);
  const bundle = buildVisualExecutionBundle(input, plan, opts);

  const requests = bundle.routedExecutions.map((ex) => ex.request);

  try {
    const results = await executeFalForLabTargets({
      requests,
      targetIndices,
      executionKind: executionKind as LabExecutionKind,
      batchSize: batchSize ?? 1,
      heroImageUrl: input.heroImageUrl,
      secondaryImageUrl: input.secondaryImageUrl,
      visualQualityTier: input.visualQualityTier,
      modelRef: input.modelRef,
    });

    return NextResponse.json({ results, requestedIndices: targetIndices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
