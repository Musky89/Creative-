import { notFound } from "next/navigation";
import { getClientCached } from "@/server/domain/clients";
import { PageHeader } from "@/components/ui/section";
import { Card } from "@/components/ui/section";
import { ServiceBlueprintForm } from "@/components/forms/service-blueprint-form";

export default async function ServiceBlueprintPage({
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
        title="Service Blueprint"
        description="Engagement template, active services, and quality bar for this client."
      />
      <Card className="max-w-xl">
        <ServiceBlueprintForm
          clientId={clientId}
          initial={client.serviceBlueprint}
        />
      </Card>
    </>
  );
}
