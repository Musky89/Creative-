import { getPrisma } from "@/server/db/prisma";

function statusLabel(s: string) {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    PREPARING: "Preparing",
    QUEUED: "Queued",
    TRAINING: "Teaching in progress",
    FINALIZING: "Finalizing",
    COMPLETE: "Complete",
    FAILED: "Needs attention",
  };
  return map[s] ?? s;
}

export async function StudioTrainingStatusCard({ clientId }: { clientId: string }) {
  const prisma = getPrisma();
  const [latest, client] = await Promise.all([
    prisma.brandVisualTrainingJob.findFirst({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findUnique({
      where: { id: clientId },
      select: { visualModelRef: true, lastBrandStyleTrainedAt: true },
    }),
  ]);

  const active =
    latest &&
    (latest.status === "PREPARING" ||
      latest.status === "QUEUED" ||
      latest.status === "TRAINING" ||
      latest.status === "FINALIZING");

  return (
    <div className="rounded-xl border border-indigo-900/45 bg-indigo-950/15 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-200/90">
        Brand visual style
      </p>
      {client?.visualModelRef ? (
        <p className="mt-2 text-sm text-emerald-100/90">Using brand visual style ✓</p>
      ) : (
        <p className="mt-2 text-sm text-zinc-400">
          Not active yet — teach the system from any brief’s Studio when you have enough strong frames.
        </p>
      )}
      {client?.lastBrandStyleTrainedAt ? (
        <p className="mt-1 text-[11px] text-zinc-500">
          Last updated {new Date(client.lastBrandStyleTrainedAt).toLocaleString()}
        </p>
      ) : null}

      {latest ? (
        <div className="mt-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
          <p className="font-medium text-zinc-200">{statusLabel(latest.status)}</p>
          {active ? (
            <p className="mt-1 text-[11px] text-zinc-500">
              This can take several minutes — refresh the page to update.
            </p>
          ) : null}
          {latest.status === "COMPLETE" && latest.comparisonNote ? (
            <p className="mt-1 text-[11px] text-indigo-100/80">{latest.comparisonNote}</p>
          ) : null}
          {latest.status === "FAILED" && latest.errorMessage ? (
            <p className="mt-1 text-[11px] text-red-200/90">{latest.errorMessage}</p>
          ) : null}
          {latest.status === "COMPLETE" &&
          latest.comparisonBaseAssetId &&
          latest.comparisonStyledAssetId ? (
            <div className="mt-2 flex flex-wrap gap-3">
              <div>
                <p className="text-[10px] uppercase text-zinc-500">Before</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/visual-assets/${latest.comparisonBaseAssetId}/file?clientId=${encodeURIComponent(clientId)}`}
                  alt=""
                  className="mt-1 h-24 w-36 rounded border border-zinc-700 object-cover"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-500">After</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/visual-assets/${latest.comparisonStyledAssetId}/file?clientId=${encodeURIComponent(clientId)}`}
                  alt=""
                  className="mt-1 h-24 w-36 rounded border border-indigo-700/50 object-cover"
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">No teaching sessions yet.</p>
      )}
    </div>
  );
}
