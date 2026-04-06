import type { ReactNode } from "react";
import { DisclosureSection } from "@/components/ui/collapse";
import type { ParsedConceptPack } from "./studio-concept-summary";

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "selected" | "rejected" | "needs";
}) {
  const cls =
    tone === "selected"
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
      : tone === "rejected"
        ? "bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700"
        : "bg-amber-500/12 text-amber-200 ring-1 ring-amber-500/25";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

export function StudioCreativeRouteSections({
  parsed,
  conceptTaskStatus,
}: {
  parsed: ParsedConceptPack | null;
  conceptTaskStatus: string | null;
}) {
  const needsAttention =
    conceptTaskStatus === "AWAITING_REVIEW" ||
    conceptTaskStatus === "REVISE_REQUIRED";

  if (!parsed || parsed.routes.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">
          Creative routes will show here after concepting runs.
        </p>
      </div>
    );
  }

  const w = parsed.winner;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Selected direction
        </h2>
        {w ? (
          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-6 ring-1 ring-emerald-500/15">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="selected">Selected</Badge>
              {needsAttention ? (
                <Badge tone="needs">Needs improvement</Badge>
              ) : null}
              {w.frameworkId ? (
                <span className="text-xs text-zinc-500">{w.frameworkId}</span>
              ) : null}
            </div>
            <p className="mt-4 text-xl font-medium tracking-tight text-zinc-50">
              {w.conceptName}
            </p>
            {w.hook ? (
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{w.hook}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      {parsed.alternatives.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Alternative routes
          </h2>
          <ul className="space-y-3">
            {parsed.alternatives.map((r) => (
              <li
                key={r.conceptId}
                className="rounded-xl border border-zinc-800/90 bg-zinc-900/30 px-5 py-4"
              >
                <p className="text-sm font-medium text-zinc-200">{r.conceptName}</p>
                {r.hook ? (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">{r.hook}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {parsed.rejected.length > 0 ? (
        <DisclosureSection
          title="Rejected"
          subtitle={`${parsed.rejected.length} route${parsed.rejected.length === 1 ? "" : "s"} — hidden by default`}
          defaultOpen={false}
        >
          <ul className="space-y-3">
            {parsed.rejected.map((r) => (
              <li
                key={r.conceptId}
                className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 opacity-80"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="rejected">Rejected</Badge>
                  <span className="text-sm font-medium text-zinc-300">{r.conceptName}</span>
                </div>
                {r.hook ? (
                  <p className="mt-2 text-xs text-zinc-500">{r.hook}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </DisclosureSection>
      ) : null}
    </div>
  );
}
