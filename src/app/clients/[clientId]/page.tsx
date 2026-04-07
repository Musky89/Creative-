import Link from "next/link";
import { getClientCached } from "@/server/domain/clients";
import { Card } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button-link";
import { StudioTrainingStatusCard } from "./studio-training-status";

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
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Workspace
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Brand OS and blueprint ground every brief. Open each when you need to
          edit; briefs live under Briefs.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/clients/${clientId}/brand-bible`}
            className="rounded-xl border border-zinc-700/80 bg-zinc-950/40 px-4 py-4 transition-colors hover:border-zinc-500"
          >
            <p className="text-sm font-medium text-zinc-100">Brand Bible</p>
            <p className="mt-1 text-xs text-zinc-500">
              {hasBrand ? "Configured" : "Not set — needed before AI stages"}
            </p>
          </Link>
          <Link
            href={`/clients/${clientId}/service-blueprint`}
            className="rounded-xl border border-zinc-700/80 bg-zinc-950/40 px-4 py-4 transition-colors hover:border-zinc-500"
          >
            <p className="text-sm font-medium text-zinc-100">Service Blueprint</p>
            <p className="mt-1 text-xs text-zinc-500">
              {hasBp ? "Configured" : "Not set"}
            </p>
          </Link>
          <Link
            href={`/clients/${clientId}/briefs`}
            className="rounded-xl border border-zinc-700/80 bg-zinc-950/40 px-4 py-4 transition-colors hover:border-zinc-500 sm:col-span-2"
          >
            <p className="text-sm font-medium text-zinc-100">Briefs</p>
            <p className="mt-1 text-xs text-zinc-500">
              {client.briefs.length} brief{client.briefs.length === 1 ? "" : "s"}{" "}
              — open Studio from a brief
            </p>
          </Link>
        </div>
      </Card>
      <div className="space-y-6">
        <StudioTrainingStatusCard clientId={clientId} />
        <Card>
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Next
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <ButtonLink href={`/clients/${clientId}/briefs/new`} className="w-full">
              New brief
            </ButtonLink>
            {client.briefs[0] ? (
              <ButtonLink
                href={`/clients/${clientId}/briefs/${client.briefs[0].id}/studio`}
                variant="secondary"
                className="w-full"
              >
                Latest studio
              </ButtonLink>
            ) : null}
            <Link
              href={`/clients/${clientId}/internal-testing`}
              className="rounded-lg px-1 py-2 text-center text-sm text-zinc-400 underline decoration-zinc-700 hover:text-zinc-200"
            >
              Internal testing
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
