import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientCached } from "@/server/domain/clients";
import { PageHeader } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button-link";

export default async function BriefsListPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClientCached(clientId);
  if (!client) notFound();

  return (
    <>
      <PageHeader
        title="Briefs"
        description="Each brief can run the v1 workflow independently."
        action={
          <ButtonLink href={`/clients/${clientId}/briefs/new`}>
            New brief
          </ButtonLink>
        }
      />
      {client.briefs.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No briefs yet.{" "}
          <Link
            href={`/clients/${clientId}/briefs/new`}
            className="text-zinc-900 underline"
          >
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200/80 bg-white shadow-sm">
          {client.briefs.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <p className="font-medium text-zinc-900">{b.title}</p>
                <p className="text-xs text-zinc-500">
                  Deadline {new Date(b.deadline).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/clients/${clientId}/briefs/${b.id}/studio`}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Studio
                </Link>
                <Link
                  href={`/clients/${clientId}/briefs/${b.id}/edit`}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
