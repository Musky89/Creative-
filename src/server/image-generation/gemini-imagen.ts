import type { ImageGenerationInput, ImageGenerationResult } from "./types";

type PredictResponse = {
  predictions?: { bytesBase64Encoded?: string; mimeType?: string }[];
  error?: { message?: string };
};

/**
 * Google AI / Imagen predict API.
 * Env: GEMINI_API_KEY or GOOGLE_API_KEY, GEMINI_IMAGE_MODEL (default imagen-3.0-generate-002).
 * @see https://ai.google.dev/gemini-api/docs/imagen
 */
export async function generateGeminiImagenImage(
  input: ImageGenerationInput,
): Promise<ImageGenerationResult> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set.");
  }

  const model =
    process.env.GEMINI_IMAGE_MODEL?.trim() || "imagen-4.0-generate-001";
  const sampleCount = Math.min(
    4,
    Math.max(1, Number(process.env.GEMINI_IMAGE_SAMPLE_COUNT) || 1),
  );

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`;

  const instancePrompt = input.negativePrompt?.trim()
    ? `${input.prompt}\n\nDo not include: ${input.negativePrompt.trim()}`
    : input.prompt;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: instancePrompt }],
      parameters: { sampleCount },
    }),
  });

  const data = (await res.json()) as PredictResponse & { message?: string };
  if (!res.ok) {
    throw new Error(
      data.error?.message ?? data.message ?? `Gemini/Imagen HTTP ${res.status}`,
    );
  }

  const pred = data.predictions?.[0];
  const b64 = pred?.bytesBase64Encoded;
  if (!b64) {
    throw new Error("Imagen returned no image bytes.");
  }

  return {
    imageBuffer: Buffer.from(b64, "base64"),
    mimeType: pred.mimeType?.trim() || "image/png",
    metadata: { model, sampleCount },
  };
}
