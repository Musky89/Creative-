/**
 * Ad corpus ingestion — isolated feature flag.
 * Enable only when operating with rights-cleared or licensed data sources.
 */

export function isAdCorpusIngestionEnabled(): boolean {
  const v = process.env.AD_CORPUS_INGESTION_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
