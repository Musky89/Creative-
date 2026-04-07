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
  const hasAny =
    data.preferred.length > 0 ||
    data.rejected.length > 0 ||
    data.likesVisual.length > 0 ||
    data.avoidVisual.length > 0 ||
    data.likesTone.length > 0 ||
    data.winsLayout.length > 0;

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
      {(data.likesVisual.length > 0 || data.avoidVisual.length > 0) && (
        <div className="mt-4 grid gap-4 border-t border-violet-900/30 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
              Tends to like (visual)
            </p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-300">
              {data.likesVisual.map((s, i) => (
                <li key={i} className="leading-snug">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-300/80">
              Tends to avoid (visual)
            </p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-400">
              {data.avoidVisual.map((s, i) => (
                <li key={i} className="leading-snug">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {(data.likesTone.length > 0 || data.winsLayout.length > 0) && (
        <div className="mt-4 space-y-3 border-t border-violet-900/30 pt-4">
          {data.likesTone.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Copy / tone signals
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-zinc-300">
                {data.likesTone.map((s, i) => (
                  <li key={i} className="leading-snug">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.winsLayout.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Strong finished layouts
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-zinc-300">
                {data.winsLayout.map((s, i) => (
                  <li key={i} className="leading-snug">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
