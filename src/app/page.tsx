export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Foundation
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          AgenticForce
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-600">
          An AI-native creative agency operating system. Strategy before
          creative, founder review gates, and a single server orchestrator —
          not a generic SaaS shell.
        </p>
        <p className="mt-8 text-xs text-zinc-400">
          Product UI and workflows are not wired yet; this page confirms the
          app scaffold is live.
        </p>
      </div>
    </main>
  );
}
