"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/brand-bible";
import { createBriefFormAction, updateBriefFormAction } from "@/app/actions/briefs";
import { FieldHint, Input, Label, Textarea } from "@/components/ui/forms";
import { jsonArrayToLines } from "@/lib/json-form";
import type { Brief, BriefEngagementType } from "@/generated/prisma/client";
import {
  AGENCY_DELIVERABLE_KEYS,
  CREATIVE_WORKSTREAMS,
} from "@/lib/workflow/brief-work-plan";

const ENGAGEMENT_OPTIONS: { value: BriefEngagementType; label: string }[] = [
  { value: "CAMPAIGN", label: "Campaign" },
  { value: "BRAND_IDENTITY", label: "Brand identity" },
  { value: "CONTENT_SYSTEM", label: "Content system" },
  { value: "PRODUCT_LAUNCH", label: "Product launch" },
  { value: "ALWAYS_ON_SOCIAL", label: "Always-on social" },
  { value: "RETAIL_PROMOTION", label: "Retail / promotion" },
  { value: "EDITORIAL_PRINT", label: "Editorial / print" },
  { value: "OOH", label: "Out-of-home" },
  { value: "TVC_FILM", label: "TVC / film" },
  { value: "CREATIVE_STRATEGY_ONLY", label: "Creative strategy only" },
  { value: "CUSTOM", label: "Custom" },
];

function deadlineInputValue(d: Date): string {
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

const PRESET_SET = new Set<string>(AGENCY_DELIVERABLE_KEYS);

function extraDeliverableLines(deliverables: unknown): string {
  if (!Array.isArray(deliverables)) return "";
  const extra = deliverables
    .map((x) => String(x).trim())
    .filter((s) => s && !PRESET_SET.has(s.toUpperCase()));
  return extra.join("\n");
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
        <Label htmlFor="engagementType">Engagement type</Label>
        <select
          id="engagementType"
          name="engagementType"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          defaultValue={brief?.engagementType ?? "CAMPAIGN"}
        >
          {ENGAGEMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <FieldHint>What kind of assignment this is — shapes the default pipeline and Studio modules.</FieldHint>
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-900">Workstreams</p>
        <p className="mb-2 text-xs text-zinc-500">
          Select the lanes of work (strategy, copy, visuals, identity, etc.). Leave empty for full campaign pipeline.
        </p>
        <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 sm:grid-cols-2">
          {CREATIVE_WORKSTREAMS.map((w) => {
            const rawWs = Array.isArray(brief?.workstreams)
              ? (brief!.workstreams as unknown[]).map((x) => String(x).toUpperCase())
              : [];
            const checked = rawWs.includes(w);
            return (
              <label key={w} className="flex cursor-pointer items-center gap-2 text-xs text-zinc-700">
                <input type="checkbox" name="workstreams" value={w} defaultChecked={checked} className="rounded border-zinc-400" />
                <span>{w.replace(/_/g, " ")}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-900">Deliverable presets</p>
        <p className="mb-2 text-xs text-zinc-500">
          Tick standard outputs; you can still add free-text lines below. Unknown keys in the database stay supported for extension.
        </p>
        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 sm:grid-cols-2">
          {AGENCY_DELIVERABLE_KEYS.map((d) => {
            const raw = Array.isArray(brief?.deliverablesRequested)
              ? (brief!.deliverablesRequested as unknown[]).map((x) => String(x).toUpperCase())
              : [];
            const checked = raw.includes(d);
            return (
              <label key={d} className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-700">
                <input
                  type="checkbox"
                  name="deliverablePresets"
                  value={d}
                  defaultChecked={checked}
                  className="rounded border-zinc-400"
                />
                <span>{d.replace(/_/g, " ")}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <Label htmlFor="deliverablesRequested">Additional deliverables (free text)</Label>
        <Textarea
          id="deliverablesRequested"
          name="deliverablesRequested"
          rows={3}
          defaultValue={brief ? extraDeliverableLines(brief.deliverablesRequested) : ""}
        />
        <FieldHint>One per line — merged with presets above.</FieldHint>
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
      <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-3">
        <input
          id="identityWorkflowEnabled"
          name="identityWorkflowEnabled"
          type="checkbox"
          value="on"
          defaultChecked={brief?.identityWorkflowEnabled === true}
          className="mt-1 h-4 w-4 rounded border-zinc-300"
        />
        <div>
          <Label htmlFor="identityWorkflowEnabled">
            Identity workflow (new brand / identity build)
          </Label>
          <FieldHint>
            Inserts Identity strategy and Identity routes after Strategy — symbolic reasoning
            before campaign creative. Leave off for standard campaign work.
          </FieldHint>
        </div>
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
