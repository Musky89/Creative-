import Link from "next/link";
import { listClients } from "@/server/domain/clients";
import { PageHeader } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button-link";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <>
      <PageHeader
        title="Clients"
        description="Accounts you run through AgenticForce."
        action={<ButtonLink href="/clients/new">New client</ButtonLink>}
      />

      {clients.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No clients yet.{" "}
          <Link href="/clients/new" className="text-zinc-900 underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200/80 bg-white shadow-sm">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium text-zinc-900">{c.name}</p>
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
