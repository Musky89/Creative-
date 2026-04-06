import { logProviderCall } from "@/server/observability/provider-observability";
import type { ImageGenerationInput, ImageGenerationResult } from "./types";

/** OpenAI Images API hard limit (dall-e-2 / dall-e-3). Longer strings return 400 errors. */
export const OPENAI_IMAGE_PROMPT_MAX_CHARS = 4000;

const TRUNCATION_NOTE = "\n\n[Truncated to fit OpenAI Images 4000-character prompt limit.]";

function clampOpenAiPrompt(full: string): { text: string; truncated: boolean } {
  if (full.length <= OPENAI_IMAGE_PROMPT_MAX_CHARS) {
    return { text: full, truncated: false };
  }
  const budget = OPENAI_IMAGE_PROMPT_MAX_CHARS - TRUNCATION_NOTE.length;
  const safeBudget = Math.max(500, budget);
  return {
    text: full.slice(0, safeBudget) + TRUNCATION_NOTE,
    truncated: true,
  };
}

type OpenAiImageResponse = {
  data?: { b64_json?: string; url?: string; revised_prompt?: string }[];
  error?: { message?: string };
};

/**
 * OpenAI Images API — env: OPENAI_API_KEY, OPENAI_IMAGE_MODEL (default dall-e-3).
 * Uses b64_json to avoid transient URLs and keep storage local.
 */
export async function generateOpenAiImage(
  input: ImageGenerationInput,
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const model =
    process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3";
  const size =
    (process.env.OPENAI_IMAGE_SIZE?.trim() as "1024x1024" | "1792x1024" | "1024x1792") ||
    "1024x1024";

  let combinedPrompt = input.prompt;
  if (model.startsWith("dall-e-3") && input.negativePrompt?.trim()) {
    combinedPrompt = `${input.prompt}\n\nAvoid: ${input.negativePrompt.trim()}`;
  }

  const { text: promptForApi, truncated } = clampOpenAiPrompt(combinedPrompt);

  const body: Record<string, unknown> = {
    model,
    prompt: promptForApi,
    n: 1,
    size,
    response_format: "b64_json",
  };

  const t0 = Date.now();
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as OpenAiImageResponse;
  if (!res.ok) {
    const err = data.error?.message ?? `OpenAI images HTTP ${res.status}`;
    logProviderCall({
      kind: "openai_images",
      providerId: "openai",
      model,
      durationMs: Date.now() - t0,
      ok: false,
      error: err,
    });
    throw new Error(err);
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    const url = data.data?.[0]?.url;
    if (url) {
      const imgRes = await fetch(url);
      if (!imgRes.ok) {
        const err = `Failed to download OpenAI image URL: ${imgRes.status}`;
        logProviderCall({
          kind: "openai_images",
          providerId: "openai",
          model,
          durationMs: Date.now() - t0,
          ok: false,
          error: err,
          fallback: "url_download",
        });
        throw new Error(err);
      }
      const buf = Buffer.from(await imgRes.arrayBuffer());
      logProviderCall({
        kind: "openai_images",
        providerId: "openai",
        model,
        durationMs: Date.now() - t0,
        ok: true,
        fallback: "b64_missing_used_url",
      });
      return {
        imageBuffer: buf,
        mimeType: imgRes.headers.get("content-type") || "image/png",
        metadata: {
          revised_prompt: data.data?.[0]?.revised_prompt,
          source: "openai_url_fallback",
        },
      };
    }
    const err = "OpenAI returned no image data.";
    logProviderCall({
      kind: "openai_images",
      providerId: "openai",
      model,
      durationMs: Date.now() - t0,
      ok: false,
      error: err,
    });
    throw new Error(err);
  }

  logProviderCall({
    kind: "openai_images",
    providerId: "openai",
    model,
    durationMs: Date.now() - t0,
    ok: true,
  });
  return {
    imageBuffer: Buffer.from(b64, "base64"),
    mimeType: "image/png",
    metadata: {
      revised_prompt: data.data?.[0]?.revised_prompt,
      ...(truncated
        ? {
            promptTruncatedForOpenAiLimit: true,
            originalPromptChars: combinedPrompt.length,
          }
        : {}),
    },
  };
}
