"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProjectButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function create() {
    const name = window.prompt("Project name", "Untitled cut");
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/video-editor/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Failed");
      router.push(`/video-editor/${json.data.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-3.5 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white disabled:opacity-60"
      >
        {busy ? "Creating…" : "New project"}
      </button>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
