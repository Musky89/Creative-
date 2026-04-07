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
      {brief.aiOnboardingNeedsReview ? (
        <div className="mb-6 max-w-2xl rounded-xl border border-amber-600/35 bg-amber-950/30 px-4 py-3">
          <p className="text-sm font-medium text-amber-100">Needs review</p>
          <p className="mt-1 text-sm text-amber-100/80">
            Draft from{" "}
            {brief.onboardingSource === "demo_seed"
              ? "demo seed"
              : "AI onboarding"}
            . Edit fields and save to confirm.
          </p>
        </div>
      ) : null}
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
