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

  const bb = client.brandBible;

  return (
    <>
      <PageHeader
        title="Brand Bible & Brand OS"
        description="Canonical positioning plus Brand Operating System rules (language, emotion, creative patterns, visual language). Injected server-side into every agent prompt."
      />
      {bb?.aiOnboardingNeedsReview ? (
        <Card className="mb-6 max-w-3xl border-amber-600/35 bg-amber-950/30">
          <p className="text-sm font-medium text-amber-100">Needs review</p>
          <p className="mt-1 text-sm text-amber-100/80">
            This Brand Bible was filled from an{" "}
            <span className="font-medium">
              {bb.onboardingSource === "demo_seed"
                ? "internal demo seed"
                : "AI-generated draft"}
            </span>
            . Refine and save to confirm — saving clears this banner.
          </p>
        </Card>
      ) : null}
      <Card className="max-w-3xl">
        <BrandBibleForm clientId={clientId} initial={client.brandBible} />
      </Card>
    </>
  );
}
