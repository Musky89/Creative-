"use client";

import { useCallback, useEffect, useState } from "react";

type Brand = {
  id: string;
  version: number;
  name: string;
  voiceSummary: string;
  bannedPhrases: string[];
  palette: { name: string; hex: string; role?: string }[];
};

type Campaign = {
  id: string;
  brandId: string;
  name: string;
  objective: string;
  singleMindedProposition: string;
  channelSpecId: string;
};

type CaseFile = {
  id: string;
  createdAt: string;
  proposal: { headline: string; cta: string; visualBrief: string; rationale: string };
  critic: {
    overall: string;
    onBrandScore: number;
    issues: string[];
    regenerationRecommended: boolean;
  };
  verification: { passed: boolean; checks: { id: string; label: string; passed: boolean; detail?: string }[] };
  revisionCount: number;
  llmUsed: boolean;
};

export default function StandaloneAgenticOsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [cases, setCases] = useState<CaseFile[]>([]);
  const [brandId, setBrandId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCase, setLastCase] = useState<CaseFile | null>(null);

  const refresh = useCallback(async () => {
    const [b, c, k] = await Promise.all([
      fetch("/api/standalone-agentic-os/brands").then((r) => r.json()),
      fetch("/api/standalone-agentic-os/campaigns").then((r) => r.json()),
      fetch("/api/standalone-agentic-os/cases").then((r) => r.json()),
    ]);
    setBrands(b.brands ?? []);
    setCampaigns(c.campaigns ?? []);
    setCases(k.cases ?? []);
    if (b.brands?.[0] && !brandId) setBrandId(b.brands[0].id);
    if (c.campaigns?.[0] && !campaignId) setCampaignId(c.campaigns[0].id);
  }, [brandId, campaignId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runCase() {
    setLoading(true);
    setError(null);
    setLastCase(null);
    try {
      const res = await fetch("/api/standalone-agentic-os/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, campaignId, maxRevisions: 2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? JSON.stringify(data));
      setLastCase(data.case);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-sm font-semibold text-zinc-200">Run pipeline (E2E)</h2>
        <p className="mt-2 text-xs text-zinc-500">
          Generate proposal → verify (length, banned phrases, palette contrast) → critic → optional revision loop →
          case file.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-zinc-400">
            Brand
            <select
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (v{b.version})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-400">
            Campaign
            <select
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={loading || !brandId || !campaignId}
            onClick={() => void runCase()}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            {loading ? "Running…" : "Run full case"}
          </button>
          <p className="text-[11px] text-zinc-600">
            Set <code className="text-zinc-400">OPENAI_API_KEY</code> for LLM proposal + critic; otherwise deterministic
            path only.
          </p>
        </div>
        {error ? (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-200">
            {error}
          </pre>
        ) : null}
      </section>

      <section className="space-y-6">
        {lastCase ? (
          <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/15 p-6">
            <h2 className="text-sm font-semibold text-emerald-200/90">Latest case</h2>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">{lastCase.id}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Headline</dt>
                <dd className="text-zinc-100">{lastCase.proposal.headline}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">CTA</dt>
                <dd className="text-zinc-100">{lastCase.proposal.cta}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Critic</dt>
                <dd className="text-zinc-300">
                  {lastCase.critic.overall} · score {lastCase.critic.onBrandScore}/10
                  {lastCase.critic.regenerationRecommended ? " · regen recommended" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Verification</dt>
                <dd className={lastCase.verification.passed ? "text-emerald-400" : "text-amber-400"}>
                  {lastCase.verification.passed ? "Passed" : "Failed"} · {lastCase.revisionCount} revisions ·{" "}
                  {lastCase.llmUsed ? "LLM used" : "Deterministic only"}
                </dd>
              </div>
            </dl>
            <ul className="mt-3 space-y-1 text-xs text-zinc-500">
              {lastCase.verification.checks.map((ch) => (
                <li key={ch.id}>
                  {ch.passed ? "✓" : "✗"} {ch.label}
                  {ch.detail ? ` — ${ch.detail}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-sm font-semibold text-zinc-200">Recent cases</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">
            {cases.map((c) => (
              <li key={c.id} className="rounded-lg border border-zinc-800/80 px-3 py-2 text-zinc-400">
                <span className="font-mono text-zinc-500">{c.id.slice(0, 18)}…</span> — {c.proposal.headline.slice(0, 48)}
                …
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
