import { notFound } from "next/navigation";
import { isAdCorpusIngestionEnabled } from "@/lib/ad-corpus-ingestion/flags";

export default function AdCorpusIngestionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAdCorpusIngestionEnabled()) {
    notFound();
  }
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-950 text-zinc-100">
      <div className="border-b border-amber-900/40 bg-amber-950/20 px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
          Isolated module
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
          Ad corpus ingestion (framework)
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Ingestion pipeline scaffolding for ML-oriented creative records. Use only with{" "}
          <strong className="text-zinc-300">licensed datasets, partner APIs, public-domain sources, or
          first-party uploads</strong>. Enable with{" "}
          <code className="rounded bg-black/40 px-1 text-amber-200/90">AD_CORPUS_INGESTION_ENABLED=1</code>
          .
        </p>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
