"use client";

/**
 * Progressive disclosure for dense artifact / studio sections.
 */
export function DisclosureSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-zinc-800/90 bg-zinc-900/40 shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        <span
          className="mt-0.5 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
          aria-hidden
        >
          ▼
        </span>
      </summary>
      <div className="border-t border-zinc-800/80 px-4 py-4">{children}</div>
    </details>
  );
}
