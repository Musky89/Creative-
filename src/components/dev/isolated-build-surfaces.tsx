import Link from "next/link";
import { Card } from "@/components/ui/section";

export type IsolatedSurface = {
  href: string;
  title: string;
  description: string;
  envNote?: string;
};

export function IsolatedBuildSurfaces({ surfaces }: { surfaces: IsolatedSurface[] }) {
  if (surfaces.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Isolated build surfaces
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Test modules kept separate from the main Studio / orchestrator flow. Open each in its own path.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {surfaces.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="block h-full">
              <Card className="h-full border-violet-900/35 bg-violet-950/15 transition-colors hover:border-violet-600/40">
                <p className="text-xs font-medium uppercase tracking-wide text-violet-300/90">
                  Isolated
                </p>
                <p className="mt-2 font-semibold text-zinc-100">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.description}</p>
                {s.envNote ? (
                  <p className="mt-3 font-mono text-[11px] leading-snug text-amber-200/80">{s.envNote}</p>
                ) : null}
                <p className="mt-3 text-xs font-medium text-violet-400">Open →</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
