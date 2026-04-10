"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type ChannelRow = { id: string; label: string };

type DatasetMeta = {
  seedPackLabel: string;
  seedPackVersion: number;
  channelCount: number;
  brandCount: number;
  campaignCount: number;
  caseCount: number;
  channels: ChannelRow[];
  brands: { id: string; name: string; version: number }[];
  campaigns: { id: string; name: string; brandId: string; channelSpecId: string }[];
};

type CaseFile = {
  id: string;
  createdAt: string;
  proposal: {
    headline: string;
    cta: string;
    visualBrief: string;
    rationale: string;
    subhead?: string;
  };
  critic: {
    overall: string;
    onBrandScore: number;
    issues: string[];
    regenerationRecommended: boolean;
    revisionHints?: string[];
  };
  verification: { passed: boolean; checks: { id: string; label: string; passed: boolean; detail?: string }[] };
  revisionCount: number;
  llmUsed: boolean;
};

export default function StandaloneAgenticOsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [dataset, setDataset] = useState<DatasetMeta | null>(null);
  const [cases, setCases] = useState<CaseFile[]>([]);
  const [brandId, setBrandId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCase, setLastCase] = useState<CaseFile | null>(null);

  const campaignsForBrand = useMemo(
    () => campaigns.filter((c) => c.brandId === brandId),
    [campaigns, brandId],
  );

  const selectedChannel = useMemo(() => {
    const camp = campaigns.find((c) => c.id === campaignId);
    if (!camp) return null;
    return channels.find((ch) => ch.id === camp.channelSpecId) ?? null;
  }, [campaigns, campaignId, channels]);

  const refresh = useCallback(async () => {
    const [b, c, k, d] = await Promise.all([
      fetch("/api/standalone-agentic-os/brands").then((r) => r.json()),
      fetch("/api/standalone-agentic-os/campaigns").then((r) => r.json()),
      fetch("/api/standalone-agentic-os/cases").then((r) => r.json()),
      fetch("/api/standalone-agentic-os/dataset").then((r) => r.json()),
    ]);
    setBrands(b.brands ?? []);
    setCampaigns(c.campaigns ?? []);
    setCases(k.cases ?? []);
    setDataset(d);
    setChannels(d.channels ?? []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!brandId && brands.length) setBrandId(brands[0]!.id);
  }, [brands, brandId]);

  useEffect(() => {
    const list = campaigns.filter((x) => x.brandId === brandId);
    if (!list.length) {
      setCampaignId("");
      return;
    }
    if (!list.some((x) => x.id === campaignId)) setCampaignId(list[0]!.id);
  }, [brandId, campaigns, campaignId]);

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

  async function downloadCaseJson() {
    if (!lastCase) return;
    const blob = new Blob([JSON.stringify(lastCase, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lastCase.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-10">
      {dataset ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-sm font-semibold text-zinc-200">Seeded dataset (testing)</h2>
          <p className="mt-1 font-mono text-xs text-emerald-400/80">{dataset.seedPackLabel}</p>
          <p className="mt-2 text-xs text-zinc-500">
            v{dataset.seedPackVersion} · {dataset.brandCount} brands · {dataset.campaignCount} campaigns ·{" "}
            {dataset.channelCount} channel specs · {dataset.caseCount} case(s) in session memory
          </p>
          <div className="mt-4 grid gap-4 text-xs sm:grid-cols-3">
            <div>
              <p className="font-medium text-zinc-400">Brands</p>
              <ul className="mt-2 space-y-1 text-zinc-500">
                {dataset.brands.map((b) => (
                  <li key={b.id}>
                    <span className="font-mono text-zinc-600">{b.id}</span> — {b.name}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-zinc-400">Channels</p>
              <ul className="mt-2 space-y-1 text-zinc-500">
                {dataset.channels.map((ch) => (
                  <li key={ch.id}>
                    <span className="font-mono text-zinc-600">{ch.id}</span> — {ch.label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-zinc-400">CLI smoke test</p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-800 bg-black/40 p-2 text-[10px] text-zinc-400">
                STANDALONE_AGENTIC_OS_ENABLED=1 npm run dev{"\n"}
                STANDALONE_AGENTIC_OS_ENABLED=1 pnpm test:standalone-agentic-os
              </pre>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-sm font-semibold text-zinc-200">Run pipeline (E2E)</h2>
          <p className="mt-2 text-xs text-zinc-500">
            Proposal → verification (length, banned phrases, palette contrast) → critic → revision loop → case file.
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
                {campaignsForBrand.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedChannel ? (
              <p className="text-[11px] text-zinc-500">
                Channel: <span className="text-zinc-400">{selectedChannel.label}</span>{" "}
                <span className="font-mono text-zinc-600">({selectedChannel.id})</span>
              </p>
            ) : null}
            <button
              type="button"
              disabled={loading || !brandId || !campaignId}
              onClick={() => void runCase()}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {loading ? "Running…" : "Run full case"}
            </button>
            <p className="text-[11px] text-zinc-600">
              Optional: <code className="text-zinc-400">OPENAI_API_KEY</code> for LLM proposal + critic; otherwise
              deterministic path only.
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-emerald-200/90">Latest case</h2>
                <button
                  type="button"
                  onClick={() => void downloadCaseJson()}
                  className="rounded-lg border border-emerald-800/50 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-950/40"
                >
                  Download JSON
                </button>
              </div>
              <p className="mt-1 font-mono text-[10px] text-zinc-500">{lastCase.id}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">Headline</dt>
                  <dd className="text-zinc-100">{lastCase.proposal.headline}</dd>
                </div>
                {lastCase.proposal.subhead ? (
                  <div>
                    <dt className="text-xs text-zinc-500">Subhead</dt>
                    <dd className="text-zinc-300">{lastCase.proposal.subhead}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-zinc-500">CTA</dt>
                  <dd className="text-zinc-100">{lastCase.proposal.cta}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Visual brief</dt>
                  <dd className="text-xs leading-relaxed text-zinc-400">{lastCase.proposal.visualBrief}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Rationale</dt>
                  <dd className="text-xs leading-relaxed text-zinc-500">{lastCase.proposal.rationale}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Critic</dt>
                  <dd className="text-zinc-300">
                    {lastCase.critic.overall} · score {lastCase.critic.onBrandScore}/10
                    {lastCase.critic.regenerationRecommended ? " · regen recommended" : ""}
                  </dd>
                </div>
                {lastCase.critic.issues.length > 0 ? (
                  <div>
                    <dt className="text-xs text-zinc-500">Issues</dt>
                    <dd>
                      <ul className="list-inside list-disc text-xs text-amber-200/80">
                        {lastCase.critic.issues.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}
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
            <h2 className="text-sm font-semibold text-zinc-200">Recent cases (session)</h2>
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">
              {cases.length === 0 ? (
                <li className="text-zinc-600">No runs yet — pick a brand + campaign and run.</li>
              ) : (
                cases.map((c) => (
                  <li key={c.id} className="rounded-lg border border-zinc-800/80 px-3 py-2 text-zinc-400">
                    <span className="font-mono text-zinc-500">{c.id.slice(0, 22)}…</span> —{" "}
                    {c.proposal.headline.slice(0, 52)}
                    {c.proposal.headline.length > 52 ? "…" : ""}
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
