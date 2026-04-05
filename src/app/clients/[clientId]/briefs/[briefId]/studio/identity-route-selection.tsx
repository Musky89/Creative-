"use client";

import { useActionState } from "react";
import { saveIdentityRouteSelectionAction } from "@/app/actions/identity-routes";
import { Card } from "@/components/ui/section";
import { FieldHint, Label, Textarea } from "@/components/ui/forms";

type RouteRow = {
  routeName?: string;
  routeType?: string;
};

type FormState = { error?: string; ok?: string } | null;

export function IdentityRouteSelectionForm({
  clientId,
  briefId,
  taskId,
  routes,
  currentPreferredIndex,
  currentFeedback,
}: {
  clientId: string;
  briefId: string;
  taskId: string;
  routes: RouteRow[];
  currentPreferredIndex: number | null;
  currentFeedback: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const idx = Number(formData.get("preferredIndex"));
      const feedback = String(formData.get("feedback") ?? "");
      if (!Number.isInteger(idx) || idx < 0 || idx >= routes.length) {
        return { error: "Choose a valid route." };
      }
      const r = await saveIdentityRouteSelectionAction(
        clientId,
        briefId,
        taskId,
        idx,
        feedback,
      );
      if (r.error) return { error: r.error };
      return { ok: r.ok ?? "Saved." };
    },
    null as FormState,
  );

  if (routes.length === 0) return null;

  return (
    <Card className="mt-4 border-violet-500/25 bg-violet-950/25">
      <p className="text-xs font-medium uppercase tracking-wide text-violet-300/90">
        Choose a route
      </p>
      <p className="mt-1 text-sm text-violet-100/80">
        Primary direction for later mark exploration. Saved on the artifact.
      </p>
      {state?.error ? (
        <p className="mt-2 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {state.ok}
        </p>
      ) : null}
      <form action={formAction} className="mt-4 space-y-3">
        <div>
          <Label htmlFor={`preferred-${taskId}`}>Preferred route</Label>
          <select
            id={`preferred-${taskId}`}
            name="preferredIndex"
            required
            defaultValue={
              currentPreferredIndex != null ? String(currentPreferredIndex) : ""
            }
            className="mt-1 block w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">— Select —</option>
            {routes.map((r, i) => (
              <option key={i} value={String(i)}>
                {i + 1}. {r.routeName ?? `Route ${i + 1}`}
                {r.routeType ? ` (${r.routeType})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`feedback-${taskId}`}>Feedback / notes</Label>
          <Textarea
            id={`feedback-${taskId}`}
            name="feedback"
            rows={3}
            defaultValue={currentFeedback}
            placeholder="What to push in the next identity exploration pass…"
          />
          <FieldHint>Optional — stored on the artifact as founderRouteFeedback.</FieldHint>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-violet-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save preference"}
        </button>
      </form>
    </Card>
  );
}
