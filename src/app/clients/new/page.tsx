import { PageHeader } from "@/components/ui/section";
import { Card } from "@/components/ui/section";
import { NewClientForm } from "@/components/forms/new-client-form";
import { QuickOnboardAiPanel } from "@/components/onboarding/quick-onboard-ai";

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        title="New client"
        description="Start fast with AI draft or demo seeds — or create manually below."
        tone="muted"
      />
      <div className="mb-10 max-w-2xl">
        <QuickOnboardAiPanel />
      </div>
      <PageHeader
        title="Manual create"
        description="Name and industry only — then complete Brand Bible in the workspace."
      />
      <Card className="max-w-lg">
        <NewClientForm />
      </Card>
    </>
  );
}
