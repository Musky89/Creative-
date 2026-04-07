import { Card } from "@/components/ui/section";
import { getPrisma } from "@/server/db/prisma";
import { getBrandLearningPanelData } from "@/server/memory/brand-memory-service";

export async function StudioBrandLearningPanel({
  clientId,
}: {
  clientId: string;
}) {
  const prisma = getPrisma();
  const data = await getBrandLearningPanelData(prisma, clientId);
  const hasAny = data.preferred.length > 0 || data.rejected.length > 0;

  if (!hasAny) {
    return (
      <Card className="border-zinc-800/80 bg-zinc-950/30">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Brand learning
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Approvals and rejections will surface here as patterns the system can bias toward on
          future runs.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-violet-900/40 bg-violet-950/15">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-200/90">
        Brand learning
      </p>
      <p className="mt-1 text-xs text-violet-200/70">
        Soft bias from past decisions — not hard rules. New ideas still allowed.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
            Preferred patterns
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-200">
            {data.preferred.map((s, i) => (
              <li key={i} className="leading-snug">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
            Rejected patterns
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
            {data.rejected.map((s, i) => (
              <li key={i} className="leading-snug">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
