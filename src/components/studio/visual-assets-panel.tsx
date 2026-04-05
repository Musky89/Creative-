"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateVisualAssetAction } from "@/app/actions/visual-assets";

type AssetRow = {
  id: string;
  status: string;
  providerTarget: string;
  providerName: string;
  modelName: string;
  resultUrl: string | null;
  sourceArtifactId: string;
  generationNotes: string | null;
  createdAt: string;
};

export function VisualAssetsPanel({
  clientId,
  briefId,
  promptPackageArtifactId,
  assets,
}: {
  clientId: string;
  briefId: string;
  promptPackageArtifactId: string;
  assets: AssetRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string>("GENERIC");
  const [error, setError] = useState<string | null>(null);

  const taskAssets = assets.filter((a) => a.sourceArtifactId === promptPackageArtifactId);

  return (
    <div className="mt-6 rounded-xl border border-sky-200/80 bg-sky-50/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">
        Generated visual assets
      </p>
      <p className="mt-1 text-xs text-sky-900/80">
        From prompt package <span className="font-mono">{promptPackageArtifactId.slice(0, 12)}…</span>
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-medium text-sky-950">Provider target</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-1 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            <option value="GENERIC">GENERIC (first available key)</option>
            <option value="GPT_IMAGE">GPT_IMAGE (OpenAI)</option>
            <option value="GEMINI_IMAGE">GEMINI_IMAGE (Google Imagen)</option>
          </select>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await generateVisualAssetAction(
                clientId,
                briefId,
                promptPackageArtifactId,
                target,
              );
              if ("error" in r && r.error) {
                setError(r.error);
                return;
              }
              router.refresh();
            });
          }}
          className="rounded-lg bg-sky-900 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate visual asset"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {taskAssets.length === 0 ? (
          <li className="text-sm text-sky-900/70">No generations for this package yet.</li>
        ) : (
          taskAssets.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-sky-200/90 bg-white/90 p-3"
            >
              <div className="flex flex-wrap gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-500">
                    {a.providerTarget} · {a.providerName} / {a.modelName}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Status:{" "}
                    <span className="font-semibold text-zinc-900">{a.status}</span>
                    {" · "}
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                  {a.status === "FAILED" && a.generationNotes ? (
                    <p className="mt-2 text-xs text-red-800">{a.generationNotes}</p>
                  ) : null}
                </div>
                {a.status === "COMPLETED" && a.resultUrl ? (
                  <div className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${a.resultUrl}?clientId=${encodeURIComponent(clientId)}`}
                      alt="Generated visual"
                      className="h-28 w-28 rounded-md border border-zinc-200 object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
