import Link from "next/link";
import { listClients } from "@/server/domain/clients";
import { PageHeader } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button-link";
import { DatabaseUnavailableNotice } from "@/components/dev/deployment-blocked";
import { isDatabaseLikelyUnavailableError } from "@/lib/dev/db-unavailable";

export default async function ClientsPage() {
  let clients: Awaited<ReturnType<typeof listClients>>;
  try {
    clients = await listClients();
  } catch (e) {
    if (!isDatabaseLikelyUnavailableError(e)) throw e;
    return (
      <>
        <PageHeader
          title="Clients"
          description="Accounts in AgenticForce."
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
        title="Clients"
        description="Pick a client to open Brand Bible, Blueprint, and briefs."
        tone="muted"
        action={<ButtonLink href="/clients/new">New client</ButtonLink>}
      />

      {clients.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No clients yet.{" "}
          <Link href="/clients/new" className="text-zinc-100 underline decoration-zinc-600">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800/90 bg-zinc-900/40 shadow-sm">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-zinc-800/40"
              >
                <div>
                  <p className="font-medium text-zinc-100">{c.name}</p>
                  <p className="text-sm text-zinc-500">{c.industry}</p>
                </div>
                <span className="text-sm text-zinc-500">
                  {c._count.briefs} brief{c._count.briefs === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
