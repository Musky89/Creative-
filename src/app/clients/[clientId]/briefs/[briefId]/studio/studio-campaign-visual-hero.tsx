/** Full-width hero frame — headline lives in the Copy section. */

export function StudioCampaignVisualHero({
  clientId,
  imageUrl,
  /** Shorter hero when stacked with idea + headline above the fold */
  compact = false,
}: {
  clientId: string;
  imageUrl: string | null;
  compact?: boolean;
}) {
  return (
    <section
      id="studio-campaign-visual"
      className={`overflow-hidden bg-zinc-950/30 ${compact ? "rounded-2xl" : "rounded-3xl ring-1 ring-white/5"}`}
    >
      <div
        className={
          compact
            ? "relative aspect-[2.2/1] min-h-[140px] w-full bg-zinc-950 sm:min-h-[160px] lg:aspect-[2.5/1] lg:min-h-[180px]"
            : "relative aspect-[21/9] min-h-[220px] w-full bg-zinc-950 sm:min-h-[280px] lg:aspect-[2.4/1] lg:min-h-[320px]"
        }
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${imageUrl}?clientId=${encodeURIComponent(clientId)}`}
            alt="Campaign visual"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center p-8 text-center sm:min-h-[280px]">
            <p className="max-w-md text-sm leading-relaxed text-zinc-500">
              Your hero frame will appear here once you generate visuals and pick a lead image.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
