"use client";

import { useActionState } from "react";
import {
  startEvalSessionFormState,
  type PrivateEvalFormState,
} from "@/app/actions/private-evaluation";

export function StartSessionForm({
  clientId,
  briefId,
}: {
  clientId: string;
  briefId: string;
}) {
  const [state, formAction, pending] = useActionState(
    startEvalSessionFormState,
    null as PrivateEvalFormState | null,
  );
  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="briefId" value={briefId} />
      <div>
        <label className="text-xs text-zinc-500" htmlFor="sessLabel">
          Session label (optional)
        </label>
        <input
          id="sessLabel"
          name="label"
          placeholder="e.g. Run 2026-04-06"
          className="mt-1 block rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
      >
        {pending ? "…" : "Start evaluation session"}
      </button>
      {state?.error ? (
        <p className="w-full text-sm text-red-800">{state.error}</p>
      ) : null}
    </form>
  );
}
