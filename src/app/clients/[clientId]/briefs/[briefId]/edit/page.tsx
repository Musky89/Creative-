import Link from "next/link";
import { notFound } from "next/navigation";
import { getBriefForClient } from "@/server/domain/briefs";
import { PageHeader } from "@/components/ui/section";
import { Card } from "@/components/ui/section";
import { BriefForm } from "@/components/forms/brief-form";

export default async function EditBriefPage({
  params,
}: {
  params: Promise<{ clientId: string; briefId: string }>;
}) {
  const { clientId, briefId } = await params;
  const brief = await getBriefForClient(briefId, clientId);
  if (!brief) notFound();

  return (
    <>
      <PageHeader
        title="Edit brief"
        description={brief.title}
        action={
          <Link
            href={`/clients/${clientId}/briefs/${briefId}/studio`}
            className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Open studio
          </Link>
        }
      />
      <Card className="max-w-2xl">
        <BriefForm mode="edit" clientId={clientId} brief={brief} />
      </Card>
    </>
  );
}
