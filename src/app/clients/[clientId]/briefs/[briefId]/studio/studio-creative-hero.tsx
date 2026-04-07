type StudioCreativeHeroProps = {
  clientId: string;
  /** Final composed asset URL path, or preferred raw, or null */
  imageUrl: string | null;
  headline: string | null;
  conceptName: string | null;
  conceptHook: string | null;
};

export function StudioCreativeHero({
  clientId,
  imageUrl,
  headline,
  conceptName,
  conceptHook,
}: StudioCreativeHeroProps) {
  const hookShort =
    conceptHook && conceptHook.length > 160
      ? `${conceptHook.slice(0, 157)}…`
      : conceptHook;

  return (
    <section
      id="studio-campaign-hero"
      className="overflow-hidden rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/80 to-zinc-950"
    >
      <div className="grid gap-0 lg:grid-cols-12">
        <div className="relative aspect-[4/3] min-h-[280px] bg-zinc-950 lg:col-span-7 lg:aspect-auto lg:min-h-[420px]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${imageUrl}?clientId=${encodeURIComponent(clientId)}`}
              alt="Campaign visual"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center p-8 text-center lg:min-h-[420px]">
              <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
                Your campaign visual will appear here once you generate images and run a
                finishing pass — or select a preferred frame first.
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-8 p-8 lg:col-span-5 lg:p-12">
          {conceptName ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Concept
              </p>
              <p className="mt-2 text-lg font-medium leading-snug text-zinc-100">
                {conceptName}
              </p>
              {hookShort ? (
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{hookShort}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Concept routes appear after the creative stage runs.
            </p>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Campaign
            </p>
            {headline ? (
              <h2 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-tight text-zinc-50 sm:text-4xl">
                {headline}
              </h2>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                Headline will show here from copy — finish your campaign line in Creative
                stage, or enter one when composing.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
