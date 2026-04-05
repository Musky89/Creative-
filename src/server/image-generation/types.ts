export type ImageGenerationInput = {
  prompt: string;
  negativePrompt?: string;
};

export type ImageGenerationResult = {
  imageBuffer: Buffer;
  mimeType: string;
  /** Provider-specific extras (usage, revised_prompt, raw snippet ids). */
  metadata?: Record<string, unknown>;
};
