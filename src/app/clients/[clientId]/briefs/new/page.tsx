import { notFound } from "next/navigation";
import { getClientCached } from "@/server/domain/clients";
import { PageHeader } from "@/components/ui/section";
import { Card } from "@/components/ui/section";
import { BriefForm } from "@/components/forms/brief-form";

export default async function NewBriefPage({
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
        title="New brief"
        description={`For ${client.name}. After save you can open Studio to run the workflow.`}
      />
      <Card className="max-w-2xl">
        <BriefForm mode="create" clientId={clientId} />
      </Card>
    </>
  );
}
