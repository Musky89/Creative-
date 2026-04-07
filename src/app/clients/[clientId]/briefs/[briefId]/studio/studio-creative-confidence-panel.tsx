export function StudioCreativeConfidencePanel({
  score10,
  bullets,
}: {
  score10: number | null;
  bullets: string[];
}) {
  return (
    <aside className="rounded-2xl bg-zinc-900/40 px-5 py-5 sm:px-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Creative confidence
      </p>
      {score10 != null ? (
        <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-zinc-50">
          {score10.toFixed(1)}
          <span className="ml-1 text-lg font-medium text-zinc-500">/10</span>
        </p>
      ) : (
        <p className="mt-3 text-2xl font-medium text-zinc-500">—</p>
      )}
      <ul className="mt-5 space-y-2.5 text-sm leading-snug text-zinc-400">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400/80" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
