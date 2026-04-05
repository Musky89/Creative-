import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/section";
import { Card } from "@/components/ui/section";
import { getClientCached } from "@/server/domain/clients";
import {
  getEvaluationTargetsForBrief,
  getPrivateEvaluationSummary,
} from "@/server/domain/private-evaluation";
import { BriefSelectForm } from "./brief-select";
import { EnsureTestBriefsButton } from "./ensure-test-briefs-button";
import { StageEvalForm } from "./stage-eval-form";
import { StartSessionForm } from "./start-session-form";

export default async function InternalTestingPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ briefId?: string; sessionId?: string }>;
}) {
  const { clientId } = await params;
  const sp = await searchParams;
  const client = await getClientCached(clientId);
  if (!client) notFound();

  const testBriefs = client.briefs.filter((b) => b.isTestBrief);
  const briefId =
    sp.briefId && client.briefs.some((b) => b.id === sp.briefId)
      ? sp.briefId
      : testBriefs[0]?.id ?? client.briefs[0]?.id;

  const sessionId = sp.sessionId?.trim() || null;

  const summary = await getPrivateEvaluationSummary(clientId);

  const targets = briefId
    ? await getEvaluationTargetsForBrief(briefId)
    : null;

  const stageLabels: Record<string, string> = {
    STRATEGY: "Strategy",
    CONCEPT: "Concept",
    VISUAL_SPEC: "Visual spec",
    COPY: "Copy",
    VISUAL_ASSET: "Visual asset",
  };

  const studioHref = briefId
    ? `/clients/${clientId}/briefs/${briefId}/studio`
    : `#`;

  return (
    <>
      <PageHeader
        title="Internal testing & evaluation"
        description="Private QA layer — log pass/fail per stage, spot weak spots, compare test briefs. Not product analytics."
        action={
          <Link
            href={`/clients/${clientId}`}
            className="text-sm text-zinc-600 underline decoration-zinc-300 hover:decoration-zinc-600"
          >
            ← Client
          </Link>
        }
      />

      {sessionId ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Active session: <span className="font-mono text-xs">{sessionId}</span> — evaluations
          you save are linked until you start another session.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="text-sm font-medium text-zinc-900">Test harness</h2>
            <EnsureTestBriefsButton clientId={clientId} />
            {briefId ? (
              <StartSessionForm clientId={clientId} briefId={briefId} />
            ) : null}
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-zinc-900">Brief to evaluate</h2>
            {client.briefs.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">Create a brief first.</p>
            ) : (
              <div className="mt-3">
                <BriefSelectForm
                  clientId={clientId}
                  sessionId={sessionId}
                  briefs={client.briefs.map((b) => ({
                    id: b.id,
                    title: b.title,
                    isTestBrief: b.isTestBrief,
                  }))}
                  currentBriefId={briefId ?? client.briefs[0]!.id}
                />
              </div>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              Use <strong>Ensure test briefs</strong> to add five canonical scenarios. Run the
              workflow in Studio, then log judgments here.
            </p>
          </Card>

          {briefId && targets ? (
            <Card>
              <h2 className="text-sm font-medium text-zinc-900">
                Stage evaluation (latest artifact per stage)
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Saves a PrivateEvaluationRecord with framework ids and stillWeak signals for
                tuning prompts, Brand OS, and Canon selection.
              </p>
              <div className="mt-4 space-y-6">
                {(
                  [
                    "STRATEGY",
                    "CONCEPT",
                    "VISUAL_SPEC",
                    "COPY",
                    "VISUAL_ASSET",
                  ] as const
                ).map((stage) => {
                  const t = targets[stage];
                  const hasTarget = !!(t.artifactId || t.visualAssetId);
                  return (
                    <div
                      key={stage}
                      className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {stageLabels[stage] ?? stage}
                      </p>
                      {!hasTarget ? (
                        <p className="mt-1 text-sm text-amber-800">
                          No completed output found for this stage yet.
                        </p>
                      ) : (
                        <p className="mt-1 font-mono text-[11px] text-zinc-500">
                          {t.artifactId
                            ? `artifact ${t.artifactId.slice(0, 10)}…`
                            : `visual ${t.visualAssetId!.slice(0, 10)}…`}
                        </p>
                      )}
                      <StageEvalForm
                        clientId={clientId}
                        briefId={briefId}
                        sessionId={sessionId}
                        stage={stage}
                        artifactId={t.artifactId}
                        visualAssetId={t.visualAssetId}
                        hasTarget={hasTarget}
                        studioHref={studioHref}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-medium text-zinc-900">Summary (this client)</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              <li>
                <span className="text-zinc-500">stillWeakAfterRegen flags:</span>{" "}
                <span className="font-medium">{summary.weakCount}</span>
              </li>
              <li>
                <span className="text-zinc-500">Marked generic:</span>{" "}
                <span className="font-medium">{summary.genericCount}</span>
              </li>
            </ul>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                By stage × verdict
              </p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                {summary.byStage.map((r) => (
                  <li key={`${r.stage}-${r.verdict}`}>
                    {stageLabels[r.stage] ?? r.stage}: {r.verdict} ({r._count.id})
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Top issue tags
              </p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                {summary.topTags.length === 0 ? (
                  <li>—</li>
                ) : (
                  summary.topTags.map(([tag, n]) => (
                    <li key={tag}>
                      {tag}: {n}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-zinc-900">Recent records</h2>
            <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto text-xs text-zinc-700">
              {summary.rows.length === 0 ? (
                <li className="text-zinc-500">No evaluations yet.</li>
              ) : (
                summary.rows.map((r) => (
                  <li key={r.id} className="border-b border-zinc-100 pb-2">
                    <span className="font-medium">{r.verdict}</span> ·{" "}
                    {stageLabels[r.stage] ?? r.stage}
                    <br />
                    <span className="text-zinc-500">
                      {r.brief.title.slice(0, 48)}
                      {r.brief.title.length > 48 ? "…" : ""}
                    </span>
                    <br />
                    {r.notes.slice(0, 120)}
                    {r.notes.length > 120 ? "…" : ""}
                    {r.detectedStillWeakAfterRegen ? (
                      <span className="ml-1 text-amber-800">· weak regen</span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
