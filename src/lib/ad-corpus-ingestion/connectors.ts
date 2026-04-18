/**
 * Connector contract: implement per licensed source (S3 bucket, partner API, etc.).
 * Do not use this to automate scraping of third-party commercial archives without rights.
 */

import type { CreativeWorkRecord } from "./schemas";
import { SAMPLE_CREATIVE_WORKS } from "./sample-data";

export type ConnectorIngestResult = {
  records: CreativeWorkRecord[];
  nextCursor?: string;
  /** True when source has no more pages */
  done?: boolean;
};

export type SourceConnector = {
  id: string;
  label: string;
  description: string;
  /** Ingest one logical page/batch */
  ingest(args: { cursor?: string; limit?: number }): Promise<ConnectorIngestResult>;
};

/** Demo connector — returns static sample rows */
export function createSampleConnector(): SourceConnector {
  return {
    id: "sample",
    label: "Sample (demo)",
    description: "Returns a few synthetic records for pipeline wiring tests.",
    async ingest({ limit = 10 }) {
      return {
        records: SAMPLE_CREATIVE_WORKS.slice(0, limit),
        done: true,
      };
    },
  };
}
