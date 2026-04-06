import { PageHeader } from "@/components/ui/section";
import { Card } from "@/components/ui/section";
import { NewClientForm } from "@/components/forms/new-client-form";

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        title="New client"
        description="Creates a client record. Brand Bible and blueprint are configured next."
      />
      <Card className="max-w-lg">
        <NewClientForm />
      </Card>
    </>
  );
}
