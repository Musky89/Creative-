import Link from "next/link";
import { listRecentBriefs } from "@/server/domain/briefs";
import { listClients } from "@/server/domain/clients";
import { PageHeader } from "@/components/ui/section";
import { Card } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button-link";

export default async function DashboardPage() {
  const [clients, briefs] = await Promise.all([
    listClients(),
    listRecentBriefs(8),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Internal operating view — clients, briefs, and workflow. No analytics theater."
        action={<ButtonLink href="/clients/new">New client</ButtonLink>}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Clients
          </h2>
          <ul className="mt-3 space-y-2">
            {clients.length === 0 ? (
              <Card>
                <p className="text-sm text-zinc-600">No clients yet.</p>
                <ButtonLink href="/clients/new" className="mt-3 inline-flex">
                  Create client
                </ButtonLink>
              </Card>
            ) : (
              clients.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clients/${c.id}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-300"
                  >
                    <span className="font-medium text-zinc-900">{c.name}</span>
                    <span className="text-zinc-500">{c.industry}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {clients.length > 0 ? (
            <Link
              href="/clients"
              className="mt-3 inline-block text-sm text-zinc-600 hover:text-zinc-900"
            >
              View all clients →
            </Link>
          ) : null}
        </section>

        <section>
          <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Recent briefs
          </h2>
          <ul className="mt-3 space-y-2">
            {briefs.length === 0 ? (
              <Card>
                <p className="text-sm text-zinc-600">
                  Create a client, then add a brief from the client workspace.
                </p>
              </Card>
            ) : (
              briefs.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/clients/${b.clientId}/briefs/${b.id}/studio`}
                    className="block rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-300"
                  >
                    <span className="font-medium text-zinc-900">{b.title}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {b.client.name}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
