import { notFound } from "next/navigation";
import { getClientCached } from "@/server/domain/clients";
import { PageHeader } from "@/components/ui/section";
import { Card } from "@/components/ui/section";
import { BrandBibleForm } from "@/components/forms/brand-bible-form";

export default async function BrandBiblePage({
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
        title="Brand Bible"
        description="Canonical voice, audience, and guardrails. Injected server-side into agent context when execution ships."
      />
      <Card className="max-w-2xl">
        <BrandBibleForm clientId={clientId} initial={client.brandBible} />
      </Card>
    </>
  );
}
