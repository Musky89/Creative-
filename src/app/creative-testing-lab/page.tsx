import type { Metadata } from "next";
import { CreativeTestingLabShell } from "@/components/creative-testing-lab/creative-testing-lab-shell";

export const metadata: Metadata = {
  title: "Creative Testing Lab",
  description:
    "Internal lab for brand-aligned creative quality testing — production engine, FAL, and compose. Not part of orchestrator workflow.",
};

export default function CreativeTestingLabPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-8">
        <header className="mb-10 border-b border-zinc-800/90 pb-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Internal · Quality testing
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Creative Testing Lab
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-400">
            Manually stress-test brand context, references, production modes, and FAL-backed
            generation before wider integration. Uses the standalone{" "}
            <span className="text-zinc-300">production-engine</span> module — no orchestrator.
          </p>
        </header>
        <CreativeTestingLabShell />
      </div>
    </div>
  );
}
