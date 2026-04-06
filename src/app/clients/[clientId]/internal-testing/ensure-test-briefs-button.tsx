"use client";

import { useActionState } from "react";
import {
  ensureTestBriefsFormAction,
  type PrivateEvalFormState,
} from "@/app/actions/private-evaluation";

export function EnsureTestBriefsButton({ clientId }: { clientId: string }) {
  const [state, formAction, pending] = useActionState(
    ensureTestBriefsFormAction,
    null as PrivateEvalFormState | null,
  );
  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="clientId" value={clientId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-violet-900 px-3 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
      >
        {pending ? "…" : "Ensure test briefs"}
      </button>
      {state?.error ? (
        <p className="text-sm text-red-800">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-emerald-800">{state.ok}</p> : null}
    </form>
  );
}
