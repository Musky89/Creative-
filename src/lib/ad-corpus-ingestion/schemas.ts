/**
 * ML-oriented corpus records for advertising creative works.
 * Supports licensed sources, first-party uploads, and **personal-learning** rows where you only store
 * metadata / open-licensed assets / text summaries — not bulk copies of copyrighted ads from third-party sites.
 */

import { z } from "zod";

export const creativeMediumSchema = z.enum([
  "print",
  "ooh",
  "tv",
  "radio",
  "digital_display",
  "social",
  "packaging",
  "other",
]);

export const rightsClassSchema = z.enum([
  "licensed_dataset",
  "partner_feed",
  "public_domain",
  "first_party_upload",
  /** Headline, category, dates, URLs, case-study text — no stored image/video from third parties */
  "metadata_only_learning",
  /** e.g. Wikimedia Commons, CC-licensed stock — attribution in provenance.licenseNotes */
  "open_license_media",
  "research_exception_documented",
  "unknown",
]);

/** Where this row came from and whether you may train / redistribute */
export const provenanceSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  rightsClass: rightsClassSchema,
  licenseId: z.string().optional(),
  licenseNotes: z.string().optional(),
  retrievedAt: z.string().datetime().optional(),
  canonicalUrl: z.string().url().optional(),
  ingestBatchId: z.string().optional(),
});

export const creativeWorkRecordSchema = z.object({
  id: z.string(),
  /** Approximate or known campaign period */
  era: z
    .object({
      yearFrom: z.number().int().optional(),
      yearTo: z.number().int().optional(),
      decade: z.number().int().optional(),
    })
    .optional(),
  brand: z
    .object({
      name: z.string(),
      category: z.string().optional(),
      market: z.string().optional(),
    })
    .optional(),
  campaign: z
    .object({
      name: z.string().optional(),
      objective: z.string().optional(),
    })
    .optional(),
  medium: creativeMediumSchema,
  channelHints: z.array(z.string()).optional(),
  /**
   * Raw assets — prefer URLs in **your** storage after lawful download.
   * For learning-only, leave empty and use copy + tags + canonicalUrl (metadata_only_learning).
   */
  assets: z
    .array(
      z.object({
        role: z.enum(["hero", "logo", "full_layout", "video", "audio", "thumbnail"]),
        mimeType: z.string(),
        storageUri: z.string(),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
        durationSec: z.number().optional(),
      }),
    )
    .default([]),
  copy: z
    .object({
      headline: z.string().optional(),
      body: z.string().optional(),
      cta: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
  /** Free-form tags for weak supervision */
  tags: z.array(z.string()).optional(),
  /** Human or model-assigned labels for training */
  labels: z
    .object({
      awards: z.array(z.string()).optional(),
      effectivenessTier: z.enum(["unknown", "low", "mid", "high", "iconic"]).optional(),
    })
    .optional(),
  provenance: provenanceSchema,
  /** Opaque hash for dedup across batches */
  contentFingerprint: z.string().optional(),
});

export type CreativeWorkRecord = z.infer<typeof creativeWorkRecordSchema>;

/** Derived features for ML — versioned separately from raw records */
export const mlFeatureVectorSchema = z.object({
  recordId: z.string(),
  featureSchemaVersion: z.string(),
  /** e.g. CLIP embedding id, not the vector inline in DB for huge corpora */
  visualEmbeddingRef: z.string().optional(),
  textEmbeddingRef: z.string().optional(),
  layoutHeuristics: z
    .object({
      aspectRatio: z.number().optional(),
      textAreaRatio: z.number().optional(),
      numDistinctColors: z.number().int().optional(),
    })
    .optional(),
  weakSupervision: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type MlFeatureVector = z.infer<typeof mlFeatureVectorSchema>;

export const ingestionJobStatusSchema = z.enum([
  "queued",
  "running",
  "paused",
  "completed",
  "failed",
]);

export const ingestionJobSchema = z.object({
  id: z.string(),
  connectorId: z.string(),
  status: ingestionJobStatusSchema,
  cursor: z.string().optional(),
  recordsIngested: z.number().int().nonnegative(),
  error: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type IngestionJob = z.infer<typeof ingestionJobSchema>;
