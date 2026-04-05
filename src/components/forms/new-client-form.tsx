"use client";

import { useActionState } from "react";
import { createClientFormAction } from "@/app/actions/clients";
import type { FormState } from "@/app/actions/brand-bible";
import { FieldHint, Input, Label } from "@/components/ui/forms";
import Link from "next/link";

export function NewClientForm() {
  const [state, formAction, pending] = useActionState(
    createClientFormAction,
    null as FormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state && "error" in state && state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="Acme Co." />
      </div>
      <div>
        <Label htmlFor="industry">Industry</Label>
        <Input
          id="industry"
          name="industry"
          required
          placeholder="e.g. Fintech, CPG"
        />
      </div>
      <FieldHint>
        You will be redirected to the client workspace after save.
      </FieldHint>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create client"}
        </button>
        <Link
          href="/clients"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
