"use client";

import { useActionState } from "react";
import { saveBriefVisualReferenceUrlsAction } from "@/app/actions/brief-visual-references";

export type PromptPackageRef = {
  id: string;
  label: string;
  imageUrl?: string;
};

type FormState = { error?: string } | { ok: true } | null;

export function StudioVisualReferencesPanel({
  clientId,
  briefId,
  packageRefs,
  savedUrls,
}: {
  clientId: string;
  briefId: string;
  packageRefs: PromptPackageRef[];
  savedUrls: string[];
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, fd: FormData) => {
      return saveBriefVisualReferenceUrlsAction(clientId, briefId, fd);
    },
    null as FormState,
  );

  return (
    <div className="rounded-xl border border-teal-900/40 bg-teal-950/20 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-200/90">
        Creative references
      </p>
      <p className="mt-1 text-xs text-teal-100/75">
        Library picks for this brand + brief inform the prompt package (lighting, composition, mood). Shown
        below with labels — re-approve <strong className="text-teal-50">Visual direction</strong> to rebuild
        after changing custom URLs.
      </p>

      {packageRefs.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-3">
          {packageRefs.map((r) => (
            <li
              key={r.id}
              className="flex max-w-[140px] flex-col gap-1 rounded-lg border border-teal-800/50 bg-zinc-950/50 p-2"
            >
              {r.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.imageUrl}
                  alt=""
                  className="aspect-[4/3] w-full rounded object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded bg-zinc-900 text-[10px] text-zinc-500">
                  No preview
                </div>
              )}
              <span className="text-[10px] leading-tight text-zinc-300">{r.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          No library references on this package yet — seed global references or approve visual direction
          after seeding.
        </p>
      )}

      <form action={formAction} className="mt-4 space-y-2 border-t border-teal-900/30 pt-4">
        <label className="text-[11px] font-medium text-teal-200/90" htmlFor="referenceUrls">
          Custom reference image URLs (one per line, max 5)
        </label>
        <textarea
          id="referenceUrls"
          name="referenceUrls"
          rows={3}
          defaultValue={savedUrls.join("\n")}
          placeholder="https://…"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600"
        />
        {state && "error" in state && state.error ? (
          <p className="text-xs text-red-300">{state.error}</p>
        ) : null}
        {state && "ok" in state ? (
          <p className="text-xs text-emerald-300">Saved. Re-approve Visual direction to apply.</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-800/80 px-3 py-1.5 text-xs font-medium text-teal-50 hover:bg-teal-700/90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save reference URLs"}
        </button>
      </form>
    </div>
  );
}
