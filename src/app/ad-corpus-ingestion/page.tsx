import { createSampleConnector } from "@/lib/ad-corpus-ingestion/connectors";
import { creativeWorkRecordSchema } from "@/lib/ad-corpus-ingestion/schemas";

export default async function AdCorpusIngestionPage() {
  const connector = createSampleConnector();
  const result = await connector.ingest({ limit: 5 });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-zinc-200">Connector (demo)</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {connector.label} — {connector.description}
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Records returned: {result.records.length} · done: {String(result.done ?? false)}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-200">Validated records</h2>
        <ul className="mt-3 space-y-4">
          {result.records.map((r) => {
            const parsed = creativeWorkRecordSchema.safeParse(r);
            return (
              <li
                key={r.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-xs text-amber-200/90">{r.id}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                      parsed.success
                        ? "bg-emerald-950 text-emerald-300"
                        : "bg-red-950 text-red-300"
                    }`}
                  >
                    {parsed.success ? "schema ok" : "schema error"}
                  </span>
                </div>
                <pre className="mt-3 max-h-64 overflow-auto text-[11px] leading-relaxed text-zinc-400">
                  {JSON.stringify(r, null, 2)}
                </pre>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">
        <p className="font-medium text-zinc-400">Next implementation steps (engineering)</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-xs">
          <li>Wire a real connector to your licensed bucket or API (not unlicensed scraping).</li>
          <li>Persist to object storage + metadata DB; run dedup via contentFingerprint.</li>
          <li>Batch feature extraction (embeddings, layout heuristics) → mlFeatureVectorSchema.</li>
          <li>Export Parquet / webdataset for training pipelines.</li>
        </ol>
      </section>
    </div>
  );
}
