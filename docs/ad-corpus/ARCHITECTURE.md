# Ad corpus ingestion — architecture & lawful acquisition

## Purpose

Provide a **framework** for building a large-scale, ML-ready corpus of advertising-related creative works: structured records, provenance, deduplication hooks, and feature-vector slots. This repo **does not** implement mass scraping of third-party commercial ad archives.

For **personal learning** without building a rights-cleared image library, see **`PERSONAL_LEARNING.md`** (metadata-only rows, open-license media, APIs).

## Why not “scrape billions of ads”

- **Copyright:** Advertisements are creative works; copying and redistributing them at scale typically requires rights.
- **Terms of service:** Most sites prohibit automated bulk collection; ignoring that creates legal and platform-ban risk.
- **“Leading campaigns” archives** are often licensed or proprietary (awards bodies, agencies, publishers).

**Viable paths at scale:**

1. **Licensed datasets** — Purchase or partner for research/commercial ML use.
2. **Partner feeds** — Agencies or brands provide assets under contract.
3. **Public domain / expired rights** — Curated collections with clear legal basis (often smaller than “billions”).
4. **First-party** — Your own produced or approved creatives.
5. **Research programs** — Institutional review, documented exceptions (not a generic scraper).

The **connector** abstraction in `src/lib/ad-corpus-ingestion/connectors.ts` is meant for **rights-cleared sources** (e.g. S3 prefix, API with auth, uploaded CSV). Each record carries `provenance` and `rightsClass`.

## Scale (technical)

“Billions” of **rows** is feasible in industry with **object storage + data lake** (S3/GCS), **columnar formats** (Parquet), **distributed processing** (Spark, Beam), and **embeddings stored by reference** (not inline in Postgres for every row).

Rough phases:

| Phase | Throughput | Storage pattern |
| ----- | ---------- | ---------------- |
| Prototype | 1e3–1e6 | SQLite/Postgres + local files |
| Production | 1e6–1e9+ | Object store + metastore (Hive/Iceberg/Delta) + job queue |
| Training export | N/A | Parquet shards, WebDataset for multimodal |

**Deduplication:** `contentFingerprint` (perceptual hash + text hash) before insert. **Skew:** shard by `sourceId` + time bucket.

## Data model (this repo)

- `CreativeWorkRecord` — canonical creative + assets + copy + provenance (`schemas.ts`).
- `MlFeatureVector` — optional derived features, versioned (`featureSchemaVersion`).
- `IngestionJob` — batch/cursor pattern for resumable connectors.

## UI

`/ad-corpus-ingestion` is **gated** by `AD_CORPUS_INGESTION_ENABLED=1` and demonstrates validation of sample rows only.

## Environment

See `.env.example` for `AD_CORPUS_INGESTION_ENABLED`.
