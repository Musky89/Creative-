type Row = {
  id: string;
  resultUrl: string | null;
  status: string;
};

export function StudioCampaignVisualAlternates({
  clientId,
  heroKey,
  assets,
}: {
  clientId: string;
  /** Exclude hero (same id or url) */
  heroKey: string | null;
  assets: Row[];
}) {
  const completed = assets.filter(
    (a) => a.status === "COMPLETED" && a.resultUrl && a.id !== heroKey,
  );
  const picks = completed.slice(0, 3);
  if (picks.length === 0) return null;

  return (
    <section className="space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Alternate frames
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {picks.map((a) => (
          <div key={a.id} className="overflow-hidden rounded-2xl bg-zinc-950/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${a.resultUrl}?clientId=${encodeURIComponent(clientId)}`}
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
