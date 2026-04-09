import type { Metadata } from "next";
import { ProductionEngineTestShell } from "@/components/production-engine/production-engine-test-shell";

export const metadata: Metadata = {
  title: "Creative Production Engine (standalone)",
  description:
    "Isolated test surface for the Creative Production Engine — not part of Studio workflow.",
};

export default function ProductionEnginePage() {
  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-zinc-100">
        Creative Production Engine
      </h1>
      <p className="mb-8 text-sm text-zinc-500">
        Standalone module — upstream creative is assumed locked. No orchestrator integration.
      </p>
      <ProductionEngineTestShell />
    </div>
  );
}
