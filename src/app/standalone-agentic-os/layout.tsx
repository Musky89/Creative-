import { notFound } from "next/navigation";
import { isStandaloneAgenticOsEnabled } from "@/lib/standalone-agentic-os/flags";

export default function StandaloneAgenticOsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isStandaloneAgenticOsEnabled()) {
    notFound();
  }
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-950 text-zinc-100">
      <div className="border-b border-emerald-900/50 bg-emerald-950/25 px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
          Standalone branch build
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
          Agentic Creative OS
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Greenfield module: brand graph → campaign → verification + critic → case file. No imports from
          production-engine, creative-testing-lab, or orchestrator. In-memory store (dev); enable with{" "}
          <code className="rounded bg-black/40 px-1 text-emerald-200/90">STANDALONE_AGENTIC_OS_ENABLED=1</code>
          .
        </p>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
