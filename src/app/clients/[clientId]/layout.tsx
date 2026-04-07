import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientCached } from "@/server/domain/clients";
import { ClientTabsAuto } from "@/components/clients/client-tabs-auto";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClientCached(clientId);
  if (!client) notFound();

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/clients"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-200"
        >
          ← Clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
          {client.name}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-sm text-zinc-500">{client.industry}</p>
          {client.isDemoClient ? (
            <span className="rounded border border-amber-600/50 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
              Demo client
            </span>
          ) : null}
        </div>
      </div>
      <ClientTabsAuto clientId={clientId} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
