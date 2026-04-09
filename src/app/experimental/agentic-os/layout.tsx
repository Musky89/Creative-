import { notFound } from "next/navigation";
import { isAgenticCreativeOsEnabled } from "@/lib/agentic-creative-os/flags";

export default function AgenticOsLayout({ children }: { children: React.ReactNode }) {
  if (!isAgenticCreativeOsEnabled()) {
    notFound();
  }
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-amber-900/40 bg-amber-950/20 px-6 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-200/90">Experimental</p>
        <h1 className="text-lg font-semibold text-zinc-100">Agentic Creative Operating System</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Isolated build — does not change Production Engine or Creative Testing Lab until merged.
        </p>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
