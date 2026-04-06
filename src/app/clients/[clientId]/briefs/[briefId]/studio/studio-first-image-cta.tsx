"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateVisualAssetAction } from "@/app/actions/visual-assets";

/**
 * Optional one-click first image when package exists and no assets yet (demo / QA speed).
 */
export function StudioFirstImageCta({
  clientId,
  briefId,
  promptPackageArtifactId,
  existingAssetCount,
}: {
  clientId: string;
  briefId: string;
  promptPackageArtifactId: string;
  existingAssetCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (existingAssetCount > 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-emerald-800/40 bg-emerald-950/25 px-4 py-3">
      <p className="text-sm font-medium text-emerald-100">Quick start</p>
      <p className="mt-1 text-xs text-emerald-100/75">
        Generate a <strong>batch</strong> of variants with the <strong>Auto</strong> provider
        (prefers Gemini when configured, otherwise OpenAI).
      </p>
      {msg ? (
        <p className="mt-2 text-xs text-red-300">{msg}</p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const r = await generateVisualAssetAction(
              clientId,
              briefId,
              promptPackageArtifactId,
              "GENERIC",
              null,
            );
            if ("error" in r && r.error) {
              setMsg(r.error);
              return;
            }
            router.refresh();
          });
        }}
        className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate first batch (one click)"}
      </button>
    </div>
  );
}
