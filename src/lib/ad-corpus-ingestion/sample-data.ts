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
];
