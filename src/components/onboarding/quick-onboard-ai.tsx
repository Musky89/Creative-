"use client";

import { useActionState, useState } from "react";
import {
  applyOnboardingDraftCreateClientAction,
  generateOnboardingDraftAction,
  type OnboardingDraftState,
} from "@/app/actions/onboarding";
import type { FormState } from "@/app/actions/brand-bible";
import { seedDemoBrandsAction, type DemoSeedState } from "@/app/actions/demo-seed";
import { Card } from "@/components/ui/section";
import { FieldHint, Input, Label, Textarea } from "@/components/ui/forms";

export function QuickOnboardAiPanel() {
  const [genState, genAction, genPending] = useActionState(
    generateOnboardingDraftAction,
    null as OnboardingDraftState,
  );
  const [applyState, applyAction, applyPending] = useActionState(
    applyOnboardingDraftCreateClientAction,
    null as FormState,
  );
  const [seedState, seedAction, seedPending] = useActionState(
    seedDemoBrandsAction,
    null as DemoSeedState,
  );

  const draftJson =
    genState && "draftJson" in genState && typeof genState.draftJson === "string"
      ? genState.draftJson
      : "";
  const [brandName, setBrandName] = useState("");

  return (
    <div className="space-y-6">
      <Card className="border-violet-800/40 bg-violet-950/25">
        <p className="text-xs font-medium tracking-wide text-violet-300/90 uppercase">
          Quick onboard with AI
        </p>
        <p className="mt-2 text-sm text-violet-100/85">
          Rough inputs → structured first draft for Brand Bible, Brand OS, Service Blueprint,
          and optionally one brief. Requires{" "}
          <code className="rounded bg-violet-950/60 px-1 font-mono text-xs">
            OPENAI_API_KEY
          </code>{" "}
          or Anthropic in{" "}
          <code className="font-mono text-xs">.env</code>. Drafts are labeled{" "}
          <strong className="font-medium text-violet-200">AI-generated — needs review</strong>.
        </p>

        <form action={genAction} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="qo-brand">Brand name</Label>
            <Input
              id="qo-brand"
              name="brandName"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Your brand"
            />
          </div>
          <div>
            <Label htmlFor="qo-url">Website URL (optional)</Label>
            <Input id="qo-url" name="websiteUrl" placeholder="https://…" />
          </div>
          <div>
            <Label htmlFor="qo-desc">One-line description</Label>
            <Input id="qo-desc" name="description" required placeholder="What you sell / who you are" />
          </div>
          <div>
            <Label htmlFor="qo-market">Market / geography</Label>
            <Input id="qo-market" name="market" required placeholder="e.g. South Africa, retail" />
          </div>
          <div>
            <Label htmlFor="qo-goal">Campaign or project goal</Label>
            <Textarea id="qo-goal" name="goal" required rows={2} placeholder="What success looks like" />
          </div>
          <div>
            <Label htmlFor="qo-notes">Optional notes</Label>
            <Textarea id="qo-notes" name="notes" rows={2} />
          </div>
          <div className="flex items-start gap-3">
            <input
              id="qo-brief"
              name="includeBriefDraft"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-zinc-600"
            />
            <Label htmlFor="qo-brief">Also draft a first campaign brief</Label>
          </div>
          <button
            type="submit"
            disabled={genPending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {genPending ? "Generating…" : "Generate AI draft"}
          </button>
        </form>

        {genState && "error" in genState && genState.error ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
            {genState.error}
          </p>
        ) : null}

        {draftJson ? (
          <div className="mt-4 space-y-3 rounded-lg border border-violet-800/50 bg-zinc-950/40 p-3">
            <p className="text-xs font-medium text-violet-200">Draft ready — preview (JSON)</p>
            <pre className="max-h-48 overflow-auto text-[10px] leading-relaxed text-zinc-400">
              {draftJson.slice(0, 4000)}
              {draftJson.length > 4000 ? "\n…" : ""}
            </pre>
            <form action={applyAction} className="space-y-2">
              <input type="hidden" name="draftJson" value={draftJson} />
              <input type="hidden" name="brandName" value={brandName} />
              <FieldHint>
                Creates the client, saves Brand Bible + Blueprint (+ brief if generated). You can
                edit everything after.
              </FieldHint>
              <button
                type="submit"
                disabled={applyPending || !brandName.trim()}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
              >
                {applyPending ? "Creating…" : "Create client & apply draft"}
              </button>
            </form>
            {applyState && "error" in applyState && applyState.error ? (
              <p className="text-sm text-red-300">{applyState.error}</p>
            ) : null}
            {applyState && "ok" in applyState && applyState.ok ? (
              <p className="text-sm text-emerald-300">Redirecting…</p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="border-amber-800/40 bg-amber-950/20">
        <p className="text-xs font-medium tracking-wide text-amber-300/90 uppercase">
          Load seeded demo clients
        </p>
        <p className="mt-2 text-sm text-amber-100/85">
          <strong className="text-amber-100">Coca-Cola (Demo — SA)</strong> and{" "}
          <strong className="text-amber-100">McDonald&apos;s (Demo — SA)</strong> with public-style
          brand data, full Brand OS, campaign briefs, and workflows initialized. Internal testing
          only — not affiliated with the brands.
        </p>
        <form action={seedAction} className="mt-4">
          <button
            type="submit"
            disabled={seedPending}
            className="rounded-lg border border-amber-600/60 bg-amber-900/40 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-amber-900/60 disabled:opacity-50"
          >
            {seedPending ? "Seeding…" : "Seed demo brands (idempotent)"}
          </button>
        </form>
        {seedState?.error ? (
          <p className="mt-2 text-sm text-red-300">{seedState.error}</p>
        ) : null}
        {seedState?.ok ? (
          <p className="mt-2 text-sm text-emerald-200">{seedState.ok}</p>
        ) : null}
      </Card>
    </div>
  );
}
