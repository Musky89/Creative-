type ProviderLogPayload = {
  kind: string;
  providerId: string;
  model?: string;
  durationMs: number;
  ok: boolean;
  error?: string;
  fallback?: string;
  extra?: Record<string, unknown>;
};

/**
 * Structured stderr logs for private deploy debugging (not analytics).
 */
export function logProviderCall(payload: ProviderLogPayload): void {
  const line = {
    ts: new Date().toISOString(),
    ...payload,
  };
  if (payload.ok) {
    console.info(`[agenticforce:provider] ${JSON.stringify(line)}`);
  } else {
    console.error(`[agenticforce:provider] ${JSON.stringify(line)}`);
  }
}
