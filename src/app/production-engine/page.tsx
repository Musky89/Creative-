import type { Metadata } from "next";
import { ProductionStudioShell } from "@/components/production-engine/production-studio-shell";

export const metadata: Metadata = {
  title: "Production Studio (standalone)",
  description:
    "Isolated Production Studio — plan, visual execution, composition, review, and handoff. Not part of the main app workflow.",
};

export default function ProductionStudioPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <header className="mb-8 border-b border-zinc-800/80 pb-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-violet-400/90">
          Standalone · Portable
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
          Production Studio
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
          Walk the pipeline from normalized inputs through production plan, FAL routing,
          composition, QA, and agency handoff. Same module as the Creative Production Engine —
          not wired to orchestrator or main Studio.
        </p>
      </header>
      <ProductionStudioShell />
    </div>
  );
}
