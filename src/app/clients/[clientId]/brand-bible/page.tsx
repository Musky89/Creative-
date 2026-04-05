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
        title="Brand Bible & Brand OS"
        description="Canonical positioning plus Brand Operating System rules (language, emotion, creative patterns, visual language). Injected server-side into every agent prompt."
      />
      <Card className="max-w-3xl">
        <BrandBibleForm clientId={clientId} initial={client.brandBible} />
      </Card>
    </>
  );
}
