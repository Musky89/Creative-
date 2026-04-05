"use client";

import { useActionState } from "react";
import {
  saveBrandBibleFormAction,
  type FormState,
} from "@/app/actions/brand-bible";
import { FieldHint, Label, Textarea } from "@/components/ui/forms";
import { jsonArrayToLines } from "@/lib/json-form";
import type { BrandBible } from "@/generated/prisma/client";

export function BrandBibleForm({
  clientId,
  initial,
}: {
  clientId: string;
  initial: BrandBible | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveBrandBibleFormAction,
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
        <Label htmlFor="positioning">Positioning</Label>
        <Textarea
          id="positioning"
          name="positioning"
          required
          rows={4}
          defaultValue={initial?.positioning ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="targetAudience">Target audience</Label>
        <Textarea
          id="targetAudience"
          name="targetAudience"
          required
          rows={3}
          defaultValue={initial?.targetAudience ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="toneOfVoice">Tone of voice</Label>
        <Textarea
          id="toneOfVoice"
          name="toneOfVoice"
          required
          rows={3}
          defaultValue={initial?.toneOfVoice ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="messagingPillars">Messaging pillars</Label>
        <Textarea
          id="messagingPillars"
          name="messagingPillars"
          rows={4}
          defaultValue={jsonArrayToLines(initial?.messagingPillars)}
        />
        <FieldHint>One pillar per line.</FieldHint>
      </div>
      <div>
        <Label htmlFor="visualIdentity">Visual identity notes</Label>
        <Textarea
          id="visualIdentity"
          name="visualIdentity"
          rows={3}
          defaultValue={jsonArrayToLines(initial?.visualIdentity)}
        />
        <FieldHint>One bullet per line.</FieldHint>
      </div>
      <div>
        <Label htmlFor="channelGuidelines">Channel guidelines</Label>
        <Textarea
          id="channelGuidelines"
          name="channelGuidelines"
          rows={3}
          defaultValue={jsonArrayToLines(initial?.channelGuidelines)}
        />
        <FieldHint>One line per channel or rule.</FieldHint>
      </div>
      <div>
        <Label htmlFor="mandatoryInclusions">Mandatory inclusions</Label>
        <Textarea
          id="mandatoryInclusions"
          name="mandatoryInclusions"
          rows={3}
          defaultValue={jsonArrayToLines(initial?.mandatoryInclusions)}
        />
      </div>
      <div>
        <Label htmlFor="thingsToAvoid">Things to avoid</Label>
        <Textarea
          id="thingsToAvoid"
          name="thingsToAvoid"
          rows={3}
          defaultValue={jsonArrayToLines(initial?.thingsToAvoid)}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Brand Bible"}
      </button>
    </form>
  );
}
