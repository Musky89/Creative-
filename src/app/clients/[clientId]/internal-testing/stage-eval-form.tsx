"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  savePrivateEvaluationFormState,
  type PrivateEvalFormState,
} from "@/app/actions/private-evaluation";

export function StageEvalForm({
  clientId,
  briefId,
  sessionId,
  stage,
  artifactId,
  visualAssetId,
  hasTarget,
  studioHref,
}: {
  clientId: string;
  briefId: string;
  sessionId: string | null;
  stage: string;
  artifactId: string | null;
  visualAssetId: string | null;
  hasTarget: boolean;
  studioHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    savePrivateEvaluationFormState,
    null as PrivateEvalFormState | null,
  );

  return (
    <form action={formAction} className="mt-3 space-y-3">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="briefId" value={briefId} />
      {sessionId ? <input type="hidden" name="sessionId" value={sessionId} /> : null}
      <input type="hidden" name="stage" value={stage} />
      {artifactId ? <input type="hidden" name="artifactId" value={artifactId} /> : null}
      {visualAssetId ? (
        <input type="hidden" name="visualAssetId" value={visualAssetId} />
      ) : null}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-zinc-500">Verdict</label>
          <select
            name="verdict"
            required={hasTarget}
            disabled={!hasTarget}
            className="mt-1 block rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            <option value="PASS">Pass</option>
            <option value="NEEDS_WORK">Needs work</option>
            <option value="FAIL">Fail</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500">Brand alignment</label>
          <select
            name="brandAlignmentStrong"
            disabled={!hasTarget}
            className="mt-1 block rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            <option value="yes">Strong</option>
            <option value="no">Weak</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500">Would use?</label>
          <select
            name="wouldUse"
            disabled={!hasTarget}
            className="mt-1 block rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="feltGeneric" disabled={!hasTarget} />
        Felt generic / AI slop
      </label>
      <div>
        <label className="text-xs text-zinc-500" htmlFor={`notes-${stage}`}>
          Notes (required when saving)
        </label>
        <textarea
          id={`notes-${stage}`}
          name="notes"
          required={hasTarget}
          disabled={!hasTarget}
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          placeholder="What worked, what broke, what to fix…"
        />
      </div>
      {state?.error ? <p className="text-sm text-red-800">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-emerald-800">{state.ok}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!hasTarget || pending}
          className="rounded-lg bg-violet-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-900 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save evaluation"}
        </button>
        <Link
          href={studioHref}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
        >
          Open Studio
        </Link>
      </div>
    </form>
  );
}
