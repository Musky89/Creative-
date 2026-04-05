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
      <div className="mb-6">
        <Link
          href="/clients"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          ← Clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          {client.name}
        </h1>
        <p className="text-sm text-zinc-500">{client.industry}</p>
      </div>
      <ClientTabsAuto clientId={clientId} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
