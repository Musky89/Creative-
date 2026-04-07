import type { ParsedCopyCampaign } from "./studio-copy-campaign";

/**
 * Headline alternates only — primary + body live in campaign ATF.
 */
export function StudioCopyHeadlines({ parsed }: { parsed: ParsedCopyCampaign | null }) {
  if (!parsed?.alternateHeadlines.length) {
    return (
      <section id="studio-copy-more" className="space-y-3 py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          More headline options
        </p>
        <p className="text-sm text-zinc-500">
          Alternate lines will list here after messaging runs.
        </p>
      </section>
    );
  }

  return (
    <section id="studio-copy-more" className="space-y-5 py-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        More headline options
      </p>
      <ul className="space-y-4">
        {parsed.alternateHeadlines.map((h, i) => (
          <li
            key={i}
            className="border-l-2 border-zinc-600/80 pl-5 text-lg leading-snug text-zinc-200 sm:text-xl"
          >
            {h}
          </li>
        ))}
      </ul>
    </section>
  );
}
