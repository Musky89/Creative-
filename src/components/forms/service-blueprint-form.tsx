"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/brand-bible";
import { saveServiceBlueprintFormAction } from "@/app/actions/service-blueprint";
import { FieldHint, Input, Label, Select, Textarea } from "@/components/ui/forms";
import { jsonArrayToLines } from "@/lib/json-form";
import type { ServiceBlueprint } from "@/generated/prisma/client";

const OPTIONS = [
  { value: "FULL_PIPELINE", label: "Full pipeline" },
  { value: "CAMPAIGN_SPRINT", label: "Campaign sprint" },
  { value: "RETAINER_MONTHLY", label: "Retainer (monthly)" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export function ServiceBlueprintForm({
  clientId,
  initial,
}: {
  clientId: string;
  initial: ServiceBlueprint | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveServiceBlueprintFormAction,
    null as FormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
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
        <Label htmlFor="templateType">Template type</Label>
        <Select
          id="templateType"
          name="templateType"
          required
          defaultValue={initial?.templateType ?? "FULL_PIPELINE"}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="qualityThreshold">Quality threshold (0–1)</Label>
        <Input
          id="qualityThreshold"
          name="qualityThreshold"
          type="number"
          step="0.01"
          min={0}
          max={1}
          required
          defaultValue={initial?.qualityThreshold ?? 0.85}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="approvalRequired"
          name="approvalRequired"
          type="checkbox"
          value="on"
          defaultChecked={initial?.approvalRequired ?? true}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <Label htmlFor="approvalRequired">Approval required</Label>
      </div>
      <div>
        <Label htmlFor="activeServices">Active services</Label>
        <Textarea
          id="activeServices"
          name="activeServices"
          rows={5}
          defaultValue={jsonArrayToLines(initial?.activeServices)}
        />
        <FieldHint>One service or line item per line.</FieldHint>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Service Blueprint"}
      </button>
    </form>
  );
}
