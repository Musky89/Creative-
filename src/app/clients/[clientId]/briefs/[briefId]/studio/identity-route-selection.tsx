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
    <Card className="mt-4 border-violet-200/80 bg-violet-50/30">
      <p className="text-xs font-medium uppercase tracking-wide text-violet-900/80">
        Founder route selection
      </p>
      <p className="mt-1 text-sm text-violet-950/85">
        Pick the primary direction for future mark exploration. This updates the artifact JSON
        (extension point for logo prompt builders — no image generation here).
      </p>
      {state?.error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
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
            className="mt-1 block w-full max-w-md rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
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
          className="rounded-lg bg-violet-900 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save selection"}
        </button>
      </form>
    </Card>
  );
}
