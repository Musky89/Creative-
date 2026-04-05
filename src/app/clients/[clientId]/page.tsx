import Link from "next/link";
import { getClientCached } from "@/server/domain/clients";
import { Card } from "@/components/ui/section";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClientCached(clientId);
  if (!client) return null;

  const hasBrand = !!client.brandBible;
  const hasBp = !!client.serviceBlueprint;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="text-sm font-medium text-zinc-900">Workspace status</h2>
        <ul className="mt-4 space-y-3 text-sm text-zinc-600">
          <li className="flex justify-between">
            <span>Brand Bible</span>
            <span className={hasBrand ? "text-emerald-700" : "text-amber-700"}>
              {hasBrand ? "Configured" : "Not set"}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Service Blueprint</span>
            <span className={hasBp ? "text-emerald-700" : "text-amber-700"}>
              {hasBp ? "Configured" : "Not set"}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Briefs</span>
            <span>{client.briefs.length}</span>
          </li>
        </ul>
      </Card>
      <Card>
        <h2 className="text-sm font-medium text-zinc-900">Quick actions</h2>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <Link
            href={`/clients/${clientId}/brand-bible`}
            className="text-zinc-700 underline decoration-zinc-300 hover:decoration-zinc-600"
          >
            Edit Brand Bible
          </Link>
          <Link
            href={`/clients/${clientId}/service-blueprint`}
            className="text-zinc-700 underline decoration-zinc-300 hover:decoration-zinc-600"
          >
            Edit Service Blueprint
          </Link>
          <Link
            href={`/clients/${clientId}/briefs/new`}
            className="text-zinc-700 underline decoration-zinc-300 hover:decoration-zinc-600"
          >
            New brief
          </Link>
          <Link
            href={`/clients/${clientId}/internal-testing`}
            className="text-zinc-700 underline decoration-zinc-300 hover:decoration-zinc-600"
          >
            Internal testing & evaluation
          </Link>
          {client.briefs[0] ? (
            <Link
              href={`/clients/${clientId}/briefs/${client.briefs[0].id}/studio`}
              className="text-zinc-700 underline decoration-zinc-300 hover:decoration-zinc-600"
            >
              Open latest brief studio
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
