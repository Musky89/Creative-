"use client";

export function StudioExportMenu({
  jsonHref,
  markdownHref,
}: {
  jsonHref: string;
  markdownHref: string;
}) {
  return (
    <details className="group relative inline-block text-left">
      <summary className="cursor-pointer list-none rounded-full border border-zinc-600/80 bg-zinc-900/40 px-6 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/50 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          Download
          <span className="text-zinc-500 transition group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 min-w-[11rem] rounded-xl border border-zinc-700/80 bg-zinc-950 py-1 shadow-xl">
        <a
          href={jsonHref}
          className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/80"
        >
          Working file
        </a>
        <a
          href={markdownHref}
          className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/80"
        >
          Readable summary
        </a>
      </div>
    </details>
  );
}
