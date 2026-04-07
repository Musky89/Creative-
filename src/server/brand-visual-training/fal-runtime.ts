import { createFalClient } from "@fal-ai/client";
import type { FluxGeneralInput, FluxLoraFastTrainingInput } from "@fal-ai/client/endpoints";
import { FAL_GENERATION_ENDPOINT, FAL_TRAINING_ENDPOINT } from "./constants";

let cached: ReturnType<typeof createFalClient> | null = null;

export function getFalClientOrThrow() {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new Error("FAL_KEY is not set. Add your fal.ai key to enable brand visual style training.");
  }
  if (!cached) {
    cached = createFalClient({ credentials: key });
  }
  return cached;
}

export function isFalConfigured(): boolean {
  return !!process.env.FAL_KEY?.trim();
}

export async function falSubscribeTraining(input: FluxLoraFastTrainingInput) {
  const fal = getFalClientOrThrow();
  return fal.subscribe(FAL_TRAINING_ENDPOINT, {
    input,
    logs: true,
  });
}

export async function falSubscribeFluxGeneral(input: FluxGeneralInput) {
  const fal = getFalClientOrThrow();
  return fal.subscribe(FAL_GENERATION_ENDPOINT, {
    input,
    logs: false,
  });
}
