import { NextResponse } from "next/server";
import { z } from "zod";
import {
  productionEngineInputSchema,
  runProductionEngineStub,
  type VisualExecutionBundleOptions,
} from "@/lib/production-engine";

const visualOptsSchema = z
  .object({
    extraReferenceUrls: z.array(z.string()).optional(),
    preferEditOverGenerate: z.boolean().optional(),
    strongReferenceImages: z.boolean().optional(),
  })
  .optional();

const bodySchema = z.object({
  input: productionEngineInputSchema,
  visualBundleOptions: visualOptsSchema,
});

export async function POST(req: Request) {
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

  const { input, visualBundleOptions } = parsed.data;
  const opts: VisualExecutionBundleOptions | undefined = visualBundleOptions
    ? {
        extraReferenceUrls: visualBundleOptions.extraReferenceUrls,
        preferEditOverGenerate: visualBundleOptions.preferEditOverGenerate,
        strongReferenceImages: visualBundleOptions.strongReferenceImages,
      }
    : undefined;

  const result = runProductionEngineStub(input, opts);
  return NextResponse.json(result);
}
