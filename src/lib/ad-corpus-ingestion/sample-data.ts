/**
 * Tiny rights-safe sample rows for framework demos (fictional / illustrative).
 */

import type { CreativeWorkRecord } from "./schemas";

export const SAMPLE_CREATIVE_WORKS: CreativeWorkRecord[] = [
  {
    id: "sample-fictional-001",
    era: { decade: 1970 },
    brand: { name: "Illustrative Co.", category: "Beverage" },
    medium: "print",
    assets: [
      {
        role: "full_layout",
        mimeType: "image/png",
        storageUri: "inline://demo-placeholder-001",
        width: 1200,
        height: 1600,
      },
    ],
    copy: {
      headline: "Refresh the day",
      cta: "Try it today",
      language: "en",
    },
    tags: ["demo", "framework-sample"],
    provenance: {
      sourceId: "internal-sample",
      sourceName: "Ad Corpus Framework — demo seed",
      rightsClass: "first_party_upload",
      licenseNotes: "Synthetic record for pipeline testing only.",
    },
    contentFingerprint: "sha256:demo-001",
  },
  {
    id: "sample-metadata-learning-002",
    era: { yearFrom: 2020, yearTo: 2021 },
    brand: { name: "Example brand (illustrative)", category: "Retail" },
    medium: "social",
    assets: [],
    copy: {
      headline: "Example headline — replace with text you transcribed yourself",
      body: "Use rows like this for personal learning: store patterns and copy you noted, not scraped image binaries.",
      language: "en",
    },
    tags: ["learning", "metadata-only"],
    provenance: {
      sourceId: "manual-notes",
      sourceName: "Manual research / fair-use notes",
      rightsClass: "metadata_only_learning",
      licenseNotes:
        "No ad image stored. Link out for reference; ML on text/tags only unless you add open-license media.",
      canonicalUrl: "https://example.com/replace-with-real-reference",
    },
    contentFingerprint: "sha256:demo-002",
  },
];
