"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/brand-bible";
import { createBriefFormAction, updateBriefFormAction } from "@/app/actions/briefs";
import { FieldHint, Input, Label, Textarea } from "@/components/ui/forms";
import { jsonArrayToLines } from "@/lib/json-form";
import type { Brief } from "@/generated/prisma/client";

function deadlineInputValue(d: Date): string {
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

export function BriefForm({
  mode,
  clientId,
  brief,
}: {
  mode: "create" | "edit";
  clientId: string;
  brief?: Brief;
}) {
  const action =
    mode === "create" ? createBriefFormAction : updateBriefFormAction;
  const [state, formAction, pending] = useActionState(action, null as FormState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      {mode === "edit" && brief ? (
        <input type="hidden" name="briefId" value={brief.id} />
      ) : null}
      {state && "error" in state && state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state && "ok" in state ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Saved.
        </p>
      ) : null}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={brief?.title ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="businessObjective">Business objective</Label>
        <Textarea
          id="businessObjective"
          name="businessObjective"
          required
          rows={3}
          defaultValue={brief?.businessObjective ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="communicationObjective">Communication objective</Label>
        <Textarea
          id="communicationObjective"
          name="communicationObjective"
          required
          rows={3}
          defaultValue={brief?.communicationObjective ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="targetAudience">Target audience</Label>
        <Textarea
          id="targetAudience"
          name="targetAudience"
          required
          rows={2}
          defaultValue={brief?.targetAudience ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="keyMessage">Key message</Label>
        <Textarea
          id="keyMessage"
          name="keyMessage"
          required
          rows={2}
          defaultValue={brief?.keyMessage ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="deliverablesRequested">Deliverables requested</Label>
        <Textarea
          id="deliverablesRequested"
          name="deliverablesRequested"
          rows={4}
          defaultValue={jsonArrayToLines(brief?.deliverablesRequested)}
        />
        <FieldHint>One per line.</FieldHint>
      </div>
      <div>
        <Label htmlFor="tone">Tone</Label>
        <Input id="tone" name="tone" required defaultValue={brief?.tone ?? ""} />
      </div>
      <div>
        <Label htmlFor="constraints">Constraints</Label>
        <Textarea
          id="constraints"
          name="constraints"
          rows={3}
          defaultValue={jsonArrayToLines(brief?.constraints)}
        />
        <FieldHint>One per line.</FieldHint>
      </div>
      <div>
        <Label htmlFor="deadline">Deadline</Label>
        <Input
          id="deadline"
          name="deadline"
          type="datetime-local"
          required
          defaultValue={
            brief?.deadline ? deadlineInputValue(brief.deadline) : ""
          }
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : mode === "create" ? "Create brief" : "Save brief"}
      </button>
    </form>
  );
}
