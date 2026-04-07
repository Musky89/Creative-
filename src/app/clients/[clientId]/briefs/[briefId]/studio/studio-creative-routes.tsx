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

  const whyText = (r: (typeof parsed.routes)[0]) =>
    r.whyItWorksForBrand?.trim() || r.rationale?.trim() || "";

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Creative direction
        </h2>
        {w ? (
          <div className="rounded-3xl bg-gradient-to-br from-emerald-950/20 via-zinc-950/40 to-zinc-950 p-8 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="selected">Primary route</Badge>
              {needsAttention ? (
                <Badge tone="needs">Needs improvement</Badge>
              ) : null}
              {w.frameworkId ? (
                <span className="text-xs text-zinc-600">{w.frameworkId}</span>
              ) : null}
            </div>
            <p className="mt-6 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              {w.conceptName}
            </p>
            {w.hook ? (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-400">{w.hook}</p>
            ) : null}
            {whyText(w) ? (
              <div className="mt-8 border-t border-white/5 pt-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
                  Why it works
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
                  {whyText(w)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {parsed.alternatives.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Alternate routes
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {parsed.alternatives.map((r) => (
              <li key={r.conceptId} className="rounded-2xl bg-zinc-900/25 p-6 sm:p-7">
                <p className="text-lg font-medium text-zinc-100">{r.conceptName}</p>
                {r.hook ? (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-500">{r.hook}</p>
                ) : null}
                {whyText(r) ? (
                  <div className="mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                      Why it works
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400 line-clamp-6">
                      {whyText(r)}
                    </p>
                  </div>
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
