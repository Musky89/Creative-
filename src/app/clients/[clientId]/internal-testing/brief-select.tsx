"use client";

import { useRouter } from "next/navigation";

export function BriefSelectForm({
  clientId,
  briefs,
  currentBriefId,
  sessionId,
}: {
  clientId: string;
  briefs: { id: string; title: string; isTestBrief: boolean }[];
  currentBriefId: string;
  sessionId: string | null;
}) {
  const router = useRouter();
  return (
    <div>
      <label className="text-xs font-medium text-zinc-500" htmlFor="briefPick">
        Brief
      </label>
      <select
        id="briefPick"
        value={currentBriefId}
        onChange={(e) => {
          const q = new URLSearchParams();
          q.set("briefId", e.target.value);
          if (sessionId) q.set("sessionId", sessionId);
          router.push(`/clients/${clientId}/internal-testing?${q.toString()}`);
        }}
        className="mt-1 block w-full min-w-[240px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
      >
        {briefs.map((b) => (
          <option key={b.id} value={b.id}>
            {b.isTestBrief ? "🧪 " : ""}
            {b.title}
          </option>
        ))}
      </select>
    </div>
  );
}
