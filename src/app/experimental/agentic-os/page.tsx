import Link from "next/link";

export default function AgenticOsHomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-base font-semibold text-zinc-200">Status</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Scaffold only. Full plan:{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-amber-200/90">
            docs/plans/agentic-creative-operating-system.md
          </code>
        </p>
        <ul className="mt-4 list-inside list-disc text-sm text-zinc-500">
          <li>Brand graph + campaign graph (versioned)</li>
          <li>Case files + multi-agent critique loop</li>
          <li>Verification engine + golden regression</li>
          <li>Optional adapter → Production Engine (experimental API only)</li>
        </ul>
      </section>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-base font-semibold text-zinc-200">API</h2>
        <p className="mt-2 text-sm text-zinc-400">
          <Link href="/api/experimental/agentic-os/health" className="text-violet-400 hover:underline">
            GET /api/experimental/agentic-os/health
          </Link>{" "}
          (returns 404 when feature flag is off)
        </p>
      </section>
    </div>
  );
}
