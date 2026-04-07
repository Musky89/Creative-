import type { ParsedCopyCampaign } from "./studio-copy-campaign";

export function StudioCopyHeadlines({ parsed }: { parsed: ParsedCopyCampaign | null }) {
  if (!parsed?.primaryHeadline) {
    return (
      <section id="studio-copy" className="py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Copy
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          Headlines land here after copy development — they will lead your layouts and pitch.
        </p>
      </section>
    );
  }

  return (
    <section id="studio-copy" className="space-y-8 py-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Copy
        </p>
        <p className="mt-2 text-xs text-zinc-500">Primary line</p>
        <p className="mt-3 max-w-4xl text-2xl font-semibold leading-snug tracking-tight text-zinc-50 sm:text-3xl">
          {parsed.primaryHeadline}
        </p>
      </div>
      {parsed.alternateHeadlines.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-zinc-500">Alternates</p>
          <ul className="mt-3 space-y-3">
            {parsed.alternateHeadlines.map((h, i) => (
              <li
                key={i}
                className="border-l-2 border-zinc-700 pl-4 text-base leading-snug text-zinc-300"
              >
                {h}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
