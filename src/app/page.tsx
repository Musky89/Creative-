import Link from "next/link";
import { listClients } from "@/server/domain/clients";
import {
  countActiveWorkflowBriefs,
  countPendingReviewsGlobally,
  listDashboardBriefRows,
} from "@/server/domain/dashboard";
import { PageHeader } from "@/components/ui/section";
import { Card } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button-link";
import { DatabaseUnavailableNotice } from "@/components/dev/deployment-blocked";
import { isDatabaseLikelyUnavailableError } from "@/lib/dev/db-unavailable";
import {
  briefWorkflowHeadline,
  headlineLabel,
} from "@/lib/brief-workflow-summary";
import { briefRecordToWorkPlan } from "@/lib/workflow/brief-work-plan";

export default async function DashboardPage() {
  let clients: Awaited<ReturnType<typeof listClients>>;
  let briefRows: Awaited<ReturnType<typeof listDashboardBriefRows>>;
  let pendingReviews: number;
  let activeWorkflows: number;
  try {
    [clients, briefRows, pendingReviews, activeWorkflows] = await Promise.all([
      listClients(),
      listDashboardBriefRows(10),
      countPendingReviewsGlobally(),
      countActiveWorkflowBriefs(),
    ]);
  } catch (e) {
    if (!isDatabaseLikelyUnavailableError(e)) throw e;
    return (
      <>
        <PageHeader
          title="Home"
          description="Your workspace — clients and open work."
        />
        <div className="max-w-xl">
          <DatabaseUnavailableNotice />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Home"
        description="What needs you today."
        tone="muted"
        action={<ButtonLink href="/clients/new">New client</ButtonLink>}
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/40 px-5 py-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Awaiting review
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">
            {pendingReviews}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Across all briefs</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/40 px-5 py-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Active workflows
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">
            {activeWorkflows}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Briefs not fully complete</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/40 px-5 py-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Clients
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">
            {clients.length}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            <Link href="/clients" className="text-zinc-400 hover:text-zinc-200">
              Open directory →
            </Link>
          </p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Clients
          </h2>
          <ul className="mt-3 space-y-2">
            {clients.length === 0 ? (
              <Card>
                <p className="text-sm text-zinc-400">No clients yet.</p>
                <ButtonLink href="/clients/new" className="mt-3 inline-flex">
                  Create client
                </ButtonLink>
              </Card>
            ) : (
              clients.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clients/${c.id}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/90 bg-zinc-900/40 px-4 py-3 text-sm transition-colors hover:border-zinc-600"
                  >
                    <span className="font-medium text-zinc-100">{c.name}</span>
                    <span className="text-zinc-500">{c.industry}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Recent briefs
          </h2>
          <ul className="mt-3 space-y-2">
            {briefRows.length === 0 ? (
              <Card>
                <p className="text-sm text-zinc-400">
                  Add a brief from a client workspace to see it here.
                </p>
              </Card>
            ) : (
              briefRows.map((b) => {
                const h = briefWorkflowHeadline(briefRecordToWorkPlan(b), b.tasks);
                const statusLine = headlineLabel(h);
                const needsYou = h.kind === "review";
                return (
                  <li key={b.id}>
                    <Link
                      href={`/clients/${b.clientId}/briefs/${b.id}/studio`}
                      className={`block rounded-xl border px-4 py-3 text-sm transition-colors ${
                        needsYou
                          ? "border-amber-500/35 bg-amber-950/25 hover:border-amber-500/50"
                          : "border-zinc-800/90 bg-zinc-900/40 hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-zinc-100">
                          {b.title}
                        </span>
                        {needsYou ? (
                          <span className="shrink-0 text-xs font-medium text-amber-200/90">
                            Review
                          </span>
                        ) : null}
                      </div>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {b.client.name}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-400">
                        {statusLine}
                      </span>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
