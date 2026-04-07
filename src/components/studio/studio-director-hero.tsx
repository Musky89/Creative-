import type { ReactNode } from "react";

/**
 * Dominant signal: confidence + editorial verdict + primary action slot.
 */
export function StudioDirectorHero({
  score10,
  verdictLine,
  children,
}: {
  score10: number | null;
  verdictLine: string;
  children: ReactNode;
}) {
  return (
    <header className="mb-14 border-b border-white/[0.06] pb-14 sm:mb-16 sm:pb-16">
      <div className="mx-auto max-w-4xl text-center">
        {score10 != null ? (
          <p
            className="font-semibold tabular-nums tracking-tight text-zinc-50"
            style={{ fontSize: "clamp(3.5rem, 12vw, 6.5rem)", lineHeight: 1.02 }}
          >
            {score10.toFixed(1)}
            <span className="ml-2 text-[0.35em] font-medium text-zinc-500">/10</span>
          </p>
        ) : (
          <p
            className="font-medium text-zinc-500"
            style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)" }}
          >
            —
          </p>
        )}
        <p className="mx-auto mt-8 max-w-2xl text-lg font-normal leading-relaxed text-zinc-300 sm:text-xl sm:leading-relaxed">
          {verdictLine}
        </p>
        <div className="mt-10 flex justify-center">{children}</div>
      </div>
    </header>
  );
}
