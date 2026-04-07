import type { CampaignCore } from "@/lib/campaign/campaign-core";

function clip(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function StudioCampaignCoreBoard({ core }: { core: CampaignCore | null }) {
  if (!core) {
    return (
      <section
        id="studio-campaign-core"
        className="rounded-3xl bg-zinc-900/30 px-6 py-14 text-center sm:px-10 sm:py-16"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Campaign idea
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
          Your idea, tension, and visual story will sit here once the campaign idea is
          generated.
        </p>
      </section>
    );
  }

  return (
    <section
      id="studio-campaign-core"
      className="overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 px-6 py-12 sm:px-12 sm:py-16"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Campaign idea
      </p>
      <h2 className="mt-6 max-w-4xl text-3xl font-semibold leading-[1.12] tracking-tight text-zinc-50 sm:text-4xl md:text-[2.75rem]">
        {clip(core.singleLineIdea, 220)}
      </h2>
      <div className="mt-10 grid gap-10 border-t border-white/5 pt-10 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
            Emotional tension
          </p>
          <p className="mt-3 text-base leading-relaxed text-zinc-300 sm:text-lg">
            {clip(core.emotionalTension, 480)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200/70">
            Visual narrative
          </p>
          <p className="mt-3 text-base leading-relaxed text-zinc-300 sm:text-lg">
            {clip(core.visualNarrative, 480)}
          </p>
        </div>
      </div>
    </section>
  );
}
