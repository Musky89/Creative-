import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-zinc-100"
          >
            AgenticForce
          </Link>
          <nav className="flex items-center gap-8 text-sm text-zinc-400">
            <Link href="/" className="transition-colors hover:text-zinc-100">
              Home
            </Link>
            <Link href="/clients" className="transition-colors hover:text-zinc-100">
              Clients
            </Link>
            <Link
              href="/video-editor"
              className="transition-colors hover:text-zinc-100"
            >
              Video Editor
            </Link>
            <Link
              href="/production-engine"
              className="transition-colors hover:text-zinc-100"
            >
              Production Engine
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
