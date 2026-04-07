import type { ArtifactType } from "@/generated/prisma/client";
import { Card, SectionTitle } from "@/components/ui/section";
import { DisclosureSection } from "@/components/ui/collapse";
import { getFrameworkById } from "@/lib/canon/frameworks";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function PairwiseTournamentDisclosure({
  comparisons,
  title = "Pairwise tournament",
}: {
  comparisons: unknown;
  title?: string;
}) {
  if (!Array.isArray(comparisons) || comparisons.length === 0) return null;
  return (
    <DisclosureSection
      title={title}
      subtitle={`${comparisons.length} head-to-head match(es)`}
      defaultOpen={false}
    >
      <ul className="mt-2 space-y-2 text-xs text-zinc-400">
        {comparisons.map((row, i) => {
          if (!isRecord(row)) return null;
          return (
            <li
              key={i}
              className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-2.5"
            >
              <p className="font-mono text-[10px] text-zinc-500">
                Round {String(row.round)} · {asString(row.leftId)} vs{" "}
                {asString(row.rightId)}
              </p>
              <p className="mt-1.5 text-zinc-300">
                Stronger:{" "}
                <span className="font-medium text-teal-200/95">
                  {asString(row.strongerId)}
                </span>
                <span className="text-zinc-600"> · </span>
                On-brand:{" "}
                <span className="font-medium text-teal-200/95">
                  {asString(row.moreOnBrandId)}
                </span>
                <span className="text-zinc-600"> · </span>
                Memorable:{" "}
                <span className="font-medium text-teal-200/95">
                  {asString(row.moreMemorableId)}
                </span>
              </p>
              <p className="mt-1.5 leading-relaxed text-zinc-500">
                {asString(row.rationale)}
              </p>
            </li>
          );
        })}
      </ul>
    </DisclosureSection>
  );
}

function BrandDnaComplianceStrip({ content }: { content: unknown }) {
  if (!isRecord(content)) return null;

  const td = content.toneDistinctiveness;
  const rc = content.rhythmCompliance;
  const sd = content.signatureDeviceUsage;
  const ca = content.culturalAlignment;
  if (
    typeof td === "string" &&
    typeof rc === "string" &&
    typeof sd === "string" &&
    typeof ca === "string"
  ) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-indigo-500/25 bg-indigo-950/30 px-3 py-2 text-[11px] text-indigo-100/90">
        <span className="font-semibold text-indigo-200/95">Brand DNA compliance</span>
        <span>· Tone {td}</span>
        <span>· Rhythm {rc}</span>
        <span>· Devices {sd}</span>
        <span>· Culture {ca}</span>
      </div>
    );
  }

  const q = content._agenticforceQuality;
  if (!isRecord(q)) return null;
  const issues = q.deterministicIssues;
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const joined = issues.map((x) => String(x).toLowerCase()).join(" ");
  const hints: string[] = [];
  if (joined.includes("flat rhythm")) hints.push("flat rhythm");
  if (joined.includes("generic tone")) hints.push("generic tone");
  if (joined.includes("no signature device")) hints.push("no device");
  if (joined.includes("repeated generic phrasing")) hints.push("repeated phrasing");
  if (hints.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg border border-indigo-500/20 bg-indigo-950/25 px-3 py-2 text-[11px] text-indigo-100/85">
      <span className="font-semibold text-indigo-200/90">Brand DNA signals</span>
      <span className="ml-2">{hints.join(" · ")}</span>
    </div>
  );
}

function QualityStrip({ content }: { content: unknown }) {
  if (!isRecord(content)) return null;
  const q = content._agenticforceQuality;
  if (!isRecord(q)) return null;
  const attempted = q.regenerationAttempted === true;
  const triggered = q.regenerationTriggered === true;
  const stillWeak = q.stillWeakAfterRegen === true;
  const preQ = q.prePersistQuality;
  const verdict =
    isRecord(q.postRegenQuality) && typeof q.postRegenQuality.qualityVerdict === "string"
      ? String(q.postRegenQuality.qualityVerdict)
      : isRecord(preQ) && typeof preQ.qualityVerdict === "string"
        ? String(preQ.qualityVerdict)
        : typeof q.qualityVerdictSummary === "string"
          ? q.qualityVerdictSummary
          : null;
  if (!attempted && !triggered) return null;

  return (
    <div className="mb-3 rounded-lg border border-sky-200/80 bg-sky-50/50 px-3 py-2 text-xs text-sky-950">
      <span className="font-medium">Quality pass</span>
      {triggered ? (
        <span className="ml-2 text-sky-800">· Regenerated once</span>
      ) : attempted ? (
        <span className="ml-2 text-sky-800">· No regen needed</span>
      ) : null}
      {verdict ? (
        <span className="ml-2">· Verdict: {verdict}</span>
      ) : null}
      {stillWeak ? (
        <span className="ml-2 font-medium text-amber-900">
          · Still flagged weak — best draft kept
        </span>
      ) : null}
      {typeof q.note === "string" && q.note ? (
        <p className="mt-1 text-[11px] leading-snug text-sky-900/85">
          {q.note}
        </p>
      ) : null}
    </div>
  );
}

function ArtifactProvenance({ content }: { content: unknown }) {
  if (!isRecord(content)) return null;
  const src = content._agenticforceSource;
  if (src !== "llm" && src !== "placeholder_fallback") return null;
  const path = content._agenticforceGenerationPath;
  const repaired = content._agenticforceRepaired === true;
  const model = isRecord(content._agenticforceModel)
    ? `${String(content._agenticforceModel.provider ?? "")} / ${String(content._agenticforceModel.model ?? "")}`.trim()
    : null;
  const err = content._agenticforceLlmError;

  return (
    <div className="mb-3 rounded-lg border border-zinc-700/80 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-400">
      <span className="font-medium text-zinc-200">
        {src === "llm" ? "Model output" : "Placeholder fallback"}
      </span>
      {src === "llm" && path ? (
        <span className="ml-2">
          · {path === "repair" ? "Repair pass" : "Primary pass"}
          {repaired ? " (repaired)" : ""}
        </span>
      ) : null}
      {model ? <span className="ml-2">· {model}</span> : null}
      {src === "placeholder_fallback" && typeof err === "string" && err ? (
        <p className="mt-1 font-mono text-[11px] text-red-800/90">
          {err.length > 220 ? `${err.slice(0, 220)}…` : err}
        </p>
      ) : null}
    </div>
  );
}

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function StringList({ items, empty }: { items: unknown; empty: string }) {
  const list = Array.isArray(items)
    ? items.map((x) => asString(x))
    : typeof items === "string"
      ? [items]
      : [];
  if (list.length === 0) {
    return <p className="text-sm text-zinc-500">{empty}</p>;
  }
  return (
    <ul className="list-inside list-disc space-y-1 text-sm text-zinc-200">
      {list.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}

function FrameworkStrip({
  frameworkId,
  title = "Creative Canon",
  isPreferredForClient,
}: {
  frameworkId: string;
  title?: string;
  isPreferredForClient?: boolean;
}) {
  const fw = getFrameworkById(frameworkId.trim());
  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-950/35 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium tracking-wide text-violet-300/90 uppercase">
          {title}
        </p>
        {isPreferredForClient ? (
          <span className="rounded border border-violet-400/30 bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-100">
            Strong for client
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-semibold text-violet-100">
        {fw ? fw.name : frameworkId}
        {fw ? (
          <span className="ml-2 font-normal text-violet-300/80">
            ({fw.category.replace(/_/g, " ")})
          </span>
        ) : null}
      </p>
      {fw ? (
        <p className="mt-1 text-xs leading-relaxed text-violet-200/85">
          {fw.description}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div className="mt-0.5 text-sm text-zinc-100">{value}</div>
    </div>
  );
}

function JsonFallback({ content }: { content: unknown }) {
  return (
    <Card className="border-amber-200/80 bg-amber-50/40">
      <SectionTitle>Raw payload</SectionTitle>
      <p className="mt-2 text-xs text-amber-900/80">
        Structured viewer did not match this shape — showing JSON fallback.
      </p>
      <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">
        {JSON.stringify(content, null, 2)}
      </pre>
    </Card>
  );
}

export function IntakeSummaryCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const objectives = content.objectives;
  const objRec = isRecord(objectives) ? objectives : null;
  return (
    <Card>
      <SectionTitle>Brief intake</SectionTitle>
      <div className="mt-4 space-y-4">
        <Field label="Summary" value={asString(content.summary) || "—"} />
        {objRec ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Business objective"
              value={asString(objRec.business) || "—"}
            />
            <Field
              label="Communication objective"
              value={asString(objRec.communication) || "—"}
            />
          </div>
        ) : null}
        <Field label="Audience" value={asString(content.audience) || "—"} />
        <Field label="Key message" value={asString(content.keyMessage) || "—"} />
      </div>
    </Card>
  );
}

export function IdentityStrategyArtifactCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  return (
    <Card>
      <SectionTitle>Identity strategy</SectionTitle>
      <p className="mt-2 text-xs text-zinc-500">
        Symbolic territory before mark exploration.
      </p>
      <div className="mt-4 space-y-4">
        <Field
          label="Brand core idea"
          value={asString(content.brandCoreIdea) || "—"}
        />
        <div>
          <p className="text-xs font-medium text-zinc-500">Symbolic territories</p>
          <StringList items={content.symbolicTerritories} empty="—" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Identity archetypes</p>
          <StringList items={content.identityArchetypes} empty="—" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Semantic directions</p>
          <StringList items={content.semanticDirections} empty="—" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Visual tensions</p>
          <StringList items={content.visualTensions} empty="—" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Must signal</p>
          <StringList items={content.whatTheIdentityMustSignal} empty="—" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Must avoid</p>
          <StringList items={content.whatTheIdentityMustAvoid} empty="—" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Exploration hooks</p>
          <StringList items={content.explorationHooks} empty="None." />
        </div>
      </div>
    </Card>
  );
}

export function IdentityRoutesPackArtifactCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const routes = content.routes;
  const summary = asString(content.frameworkUsed);
  const diff = asString(content.routeDifferentiationSummary);
  const lr = content.logoExplorationReadiness;
  return (
    <Card>
      <SectionTitle>Identity routes</SectionTitle>
      {summary ? <p className="mt-2 text-sm text-zinc-700">{summary}</p> : null}
      {diff ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-500">How routes diverge</p>
          <p className="mt-1 text-sm text-zinc-800">{diff}</p>
        </div>
      ) : null}
      {isRecord(content.pairwiseDifferentiation) ? (
        <div className="mt-4">
          <DisclosureSection
            title="Route comparison matrix"
            subtitle="Pairwise differentiation — expand to compare"
            defaultOpen
          >
            <p className="text-xs text-teal-200/90">
              Strongest index:{" "}
              <span className="font-mono">
                {String(
                  (content.pairwiseDifferentiation as Record<string, unknown>)
                    .strongestRouteIndex ?? "—",
                )}
              </span>
              {" · "}
              Weakest:{" "}
              <span className="font-mono">
                {String(
                  (content.pairwiseDifferentiation as Record<string, unknown>)
                    .weakestRouteIndex ?? "—",
                )}
              </span>
            </p>
            <p className="mt-2 text-sm text-zinc-200">
              {asString(
                (content.pairwiseDifferentiation as Record<string, unknown>)
                  .differentiationSummary,
              ) || "—"}
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              {asString(
                (content.pairwiseDifferentiation as Record<string, unknown>)
                  .aggregateOverlap,
              ) || "—"}
            </p>
            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              {Array.isArray(
                (content.pairwiseDifferentiation as Record<string, unknown>)
                  .pairComparisons,
              )
                ? (
                    (content.pairwiseDifferentiation as Record<string, unknown>)
                      .pairComparisons as unknown[]
                  ).map((row, j) =>
                    isRecord(row) ? (
                      <li
                        key={j}
                        className="rounded border border-teal-800/40 bg-teal-950/30 p-2"
                      >
                        <span className="font-mono text-teal-200/90">
                          {String(row.leftIndex)} vs {String(row.rightIndex)}
                        </span>{" "}
                        · stronger:{" "}
                        <span className="font-medium text-zinc-100">
                          {asString(row.strongerRouteThisPair)}
                        </span>
                        <p className="mt-1 text-zinc-400">
                          Overlap: {asString(row.overlapNotes)}
                        </p>
                        <p className="mt-0.5 text-zinc-300">
                          Diff: {asString(row.howTheyDiffer)}
                        </p>
                      </li>
                    ) : null,
                  )
                : null}
            </ul>
          </DisclosureSection>
        </div>
      ) : null}
      {typeof content.founderPreferredRouteIndex === "number" ? (
        <p className="mt-3 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-sm text-violet-950">
          Founder preferred route:{" "}
          <span className="font-semibold">
            #{Number(content.founderPreferredRouteIndex) + 1}
          </span>
          {typeof content.founderRouteFeedback === "string" &&
          content.founderRouteFeedback.trim() ? (
            <span className="mt-1 block text-xs text-violet-900/90">
              {content.founderRouteFeedback}
            </span>
          ) : null}
        </p>
      ) : null}
      {isRecord(lr) ? (
        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-700">
          <p className="font-medium text-zinc-800">Logo exploration readiness</p>
          <pre className="mt-1 overflow-auto font-mono text-[11px]">
            {JSON.stringify(lr, null, 2)}
          </pre>
        </div>
      ) : null}
      {Array.isArray(routes) && routes.length > 0 ? (
        <div className="mt-6 space-y-3">
          {routes.map((raw, i) => {
            if (!isRecord(raw)) return null;
            const routeTitle =
              asString(raw.routeName) || `Route ${i + 1}`;
            const routeSub = asString(raw.routeType) || undefined;
            return (
              <DisclosureSection
                key={i}
                title={routeTitle}
                subtitle={routeSub ? routeSub.replace(/_/g, " ") : `Option ${i + 1}`}
                defaultOpen={i === 0}
              >
                <div className="space-y-3">
                  <Field
                    label="Name"
                    value={asString(raw.routeName) || "—"}
                  />
                  <Field
                    label="Type"
                    value={asString(raw.routeType) || "—"}
                  />
                  <Field
                    label="Core concept"
                    value={asString(raw.coreConcept) || "—"}
                  />
                  <Field
                    label="Symbolic logic"
                    value={asString(raw.symbolicLogic) || "—"}
                  />
                  <Field
                    label="Typography logic"
                    value={asString(raw.typographyLogic) || "—"}
                  />
                  <Field
                    label="Geometry logic"
                    value={asString(raw.geometryLogic) || "—"}
                  />
                  <Field
                    label="Distinctiveness"
                    value={asString(raw.distinctivenessRationale) || "—"}
                  />
                  <Field
                    label="Why it works for brand"
                    value={asString(raw.whyItWorksForBrand) || "—"}
                  />
                  <div className="rounded-lg border border-zinc-700/70 bg-zinc-950/40 p-3">
                    <p className="text-[11px] font-semibold uppercase text-zinc-600">
                      Route differentiation
                    </p>
                    <div className="mt-2 space-y-2">
                      <Field
                        label="Core tension"
                        value={asString(raw.coreTension) || "—"}
                      />
                      <Field
                        label="Emotional center"
                        value={asString(raw.emotionalCenter) || "—"}
                      />
                      <Field
                        label="Beats category norm"
                        value={asString(raw.whyBeatsCategoryNorm) || "—"}
                      />
                      <Field
                        label="Could fail if"
                        value={asString(raw.whyCouldFail) || "—"}
                      />
                      <Field
                        label="Distinct visual world"
                        value={asString(raw.distinctVisualWorld) || "—"}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Risks</p>
                    <StringList items={raw.risks} empty="—" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Avoid</p>
                    <StringList items={raw.avoidList} empty="—" />
                  </div>
                  <Field
                    label="Mark exploration seed"
                    value={asString(raw.markExplorationSeed) || "—"}
                  />
                </div>
              </DisclosureSection>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No routes in pack.</p>
      )}
    </Card>
  );
}

export function StrategyArtifactCard({
  content,
  preferredFrameworkIds,
}: {
  content: unknown;
  preferredFrameworkIds?: string[];
}) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const pillars =
    content.messagePillars ?? content.pillars ?? content.messagingPillars;
  const angles = content.strategicAngles;
  return (
    <Card>
      <SectionTitle>Strategy</SectionTitle>
      <BrandDnaComplianceStrip content={content} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Objective" value={asString(content.objective) || "—"} />
        <Field label="Audience" value={asString(content.audience) || "—"} />
        <Field label="Insight" value={asString(content.insight) || "—"} />
        <Field
          label="Proposition"
          value={asString(content.proposition) || "—"}
        />
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium text-zinc-500">Message pillars</p>
        <div className="mt-1">
          <StringList items={pillars} empty="No pillars listed." />
        </div>
      </div>
      {isRecord(content.campaignCore) ? (
        <div className="mt-6 rounded-xl border border-amber-900/35 bg-amber-950/15 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
            Campaign core
          </p>
          <p className="mt-1 text-xs text-amber-100/70">
            One idea for concept, copy, visuals, and layout — downstream stages use this as law.
          </p>
          <div className="mt-3 space-y-3 text-sm text-zinc-200">
            <Field
              label="Single-line idea"
              value={asString(content.campaignCore.singleLineIdea) || "—"}
            />
            <Field
              label="Emotional tension"
              value={asString(content.campaignCore.emotionalTension) || "—"}
            />
            <Field
              label="Visual narrative"
              value={asString(content.campaignCore.visualNarrative) || "—"}
            />
          </div>
        </div>
      ) : null}
      {Array.isArray(angles) && angles.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-medium text-zinc-500">
            Strategic angles (Creative Canon)
          </p>
          {isRecord(content._agenticforceSelection) &&
          asString(
            (content._agenticforceSelection as Record<string, unknown>).stage,
          ) === "STRATEGY" ? (
            <div className="mb-3 rounded-lg border border-sky-800/40 bg-sky-950/25 p-3 text-xs text-sky-100/90">
              <p className="font-semibold uppercase tracking-wide text-sky-300/90">
                Creative selection
              </p>
              <p className="mt-2 leading-relaxed">
                {asString(
                  (content._agenticforceSelection as Record<string, unknown>)
                    .selectionRationale,
                ) || "—"}
              </p>
            </div>
          ) : null}
          {isRecord(content._agenticforceSelection) &&
          asString(
            (content._agenticforceSelection as Record<string, unknown>).stage,
          ) === "STRATEGY" ? (
            <PairwiseTournamentDisclosure
              comparisons={
                (content._agenticforceSelection as Record<string, unknown>)
                  .pairwiseComparisons
              }
              title="Strategic angle matchups"
            />
          ) : null}
          {angles.map((a, i) => {
            if (!isRecord(a)) return null;
            const fid = asString(a.frameworkId);
            const ang = asString(a.angle);
            if (!fid) return null;
            const primary = a.isSelectedPrimary === true;
            const alt = a.isAlternate === true;
            return (
              <div key={i} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {primary ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-500/30">
                      Primary
                    </span>
                  ) : null}
                  {alt ? (
                    <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-amber-500/25">
                      Alternate
                    </span>
                  ) : null}
                </div>
                <FrameworkStrip
                  frameworkId={fid}
                  title="Framework"
                  isPreferredForClient={preferredFrameworkIds?.includes(fid)}
                />
                <p className="text-sm text-zinc-200">{ang || "—"}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

export function ConceptArtifactCard({
  content,
  preferredFrameworkIds,
}: {
  content: unknown;
  preferredFrameworkIds?: string[];
}) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const concepts = content.concepts;
  const summary = asString(content.frameworkUsed);

  if (Array.isArray(concepts) && concepts.length > 0) {
    const selection = isRecord(content._agenticforceSelection)
      ? (content._agenticforceSelection as Record<string, unknown>)
      : null;
    return (
      <Card>
        <SectionTitle>Concept pack</SectionTitle>
        <BrandDnaComplianceStrip content={content} />
        {summary ? (
          <p className="mt-2 text-sm text-zinc-400">{summary}</p>
        ) : null}
        {selection ? (
          <div className="mt-3 rounded-lg border border-teal-700/40 bg-teal-950/25 p-3 text-sm text-teal-100/90">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-300/90">
              Creative Director Judge
            </p>
            <p className="mt-1">
              Winner:{" "}
              <span className="font-mono text-teal-200">
                {asString(selection.winnerConceptId) || "—"}
              </span>
            </p>
            {Array.isArray(selection.alternateConceptIds) &&
            selection.alternateConceptIds.length > 0 ? (
              <p className="mt-1 text-xs text-teal-200/85">
                Alternates:{" "}
                {selection.alternateConceptIds.map((x) => String(x)).join(", ")}
              </p>
            ) : null}
            {typeof selection.judgeSummary === "string" &&
            selection.judgeSummary.trim() ? (
              <p className="mt-2 text-xs leading-relaxed text-teal-100/80">
                {selection.judgeSummary.trim()}
              </p>
            ) : null}
            {Array.isArray(selection.rejectedConceptIds) &&
            selection.rejectedConceptIds.length > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                Not surfaced ({selection.rejectedConceptIds.length}):{" "}
                {selection.rejectedConceptIds.map((x) => String(x)).join(", ")}
              </p>
            ) : null}
            {isRecord(selection.scores) ? (
              <p className="mt-2 text-xs text-zinc-400">
                Scores (distinctiveness, brand fit, clarity, emotion, non-generic) per{" "}
                <code className="text-zinc-300">conceptId</code>
              </p>
            ) : null}
            <div className="mt-3">
              <PairwiseTournamentDisclosure
                comparisons={selection.pairwiseComparisons}
                title="Concept route matchups"
              />
            </div>
          </div>
        ) : null}
        {isRecord(content.pairwiseDifferentiation) ? (
          <div className="mt-4">
            <DisclosureSection
              title="Concept comparison"
              subtitle="Pairwise differentiation"
              defaultOpen
            >
              <p className="text-xs text-teal-200/90">
                Strongest concept index:{" "}
                <span className="font-mono">
                  {String(
                    (content.pairwiseDifferentiation as Record<string, unknown>)
                      .strongestConceptIndex ?? "—",
                  )}
                </span>
              </p>
              <p className="mt-2 text-sm text-zinc-200">
                {asString(
                  (content.pairwiseDifferentiation as Record<string, unknown>)
                    .differentiationSummary,
                ) || "—"}
              </p>
              <p className="mt-2 text-xs text-zinc-400">
                {asString(
                  (content.pairwiseDifferentiation as Record<string, unknown>)
                    .aggregateOverlap,
                ) || "—"}
              </p>
              <ul className="mt-3 space-y-2 text-xs text-zinc-300">
                {Array.isArray(
                  (content.pairwiseDifferentiation as Record<string, unknown>)
                    .pairComparisons,
                )
                  ? (
                      (content.pairwiseDifferentiation as Record<string, unknown>)
                        .pairComparisons as unknown[]
                    ).map((row, j) =>
                      isRecord(row) ? (
                        <li
                          key={j}
                          className="rounded border border-teal-800/40 bg-teal-950/30 p-2"
                        >
                          <span className="font-mono text-teal-200/90">
                            {String(row.leftIndex)} vs {String(row.rightIndex)}
                          </span>{" "}
                          · stronger:{" "}
                          <span className="font-medium text-zinc-100">
                            {asString(row.strongerConceptThisPair)}
                          </span>
                          <p className="mt-1 text-zinc-400">
                            Overlap: {asString(row.overlapNotes)}
                          </p>
                          <p className="mt-0.5 text-zinc-300">
                            Diff: {asString(row.howTheyDiffer)}
                          </p>
                        </li>
                      ) : null,
                    )
                  : null}
              </ul>
            </DisclosureSection>
          </div>
        ) : null}
        <div className="mt-6 space-y-3">
          {concepts
            .map((raw, i) => ({ raw, i }))
            .filter(({ raw }) => {
              if (!isRecord(raw)) return false;
              return raw.isRejected !== true;
            })
            .map(({ raw, i }) => {
            const fid = asString(raw.frameworkId);
            const conceptTitle =
              asString(raw.conceptName) || `Concept ${i + 1}`;
            const cid = asString(raw.conceptId);
            const sel = raw.isSelected === true;
            const alt = raw.isAlternate === true;
            return (
              <DisclosureSection
                key={cid || i}
                title={conceptTitle}
                subtitle={
                  [
                    fid ? "Creative Canon route" : undefined,
                    cid ? `id: ${cid}` : undefined,
                    sel ? "PRIMARY" : undefined,
                    alt ? "ALTERNATE" : undefined,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                defaultOpen={sel || i === 0}
              >
                {fid ? (
                  <div className="mb-4">
                    <FrameworkStrip
                      frameworkId={fid}
                      isPreferredForClient={preferredFrameworkIds?.includes(fid)}
                    />
                  </div>
                ) : null}
                <div className="space-y-3">
                  <Field
                    label="Route name"
                    value={asString(raw.conceptName) || "—"}
                  />
                  <Field label="Hook" value={asString(raw.hook) || "—"} />
                  <Field
                    label="Rationale"
                    value={asString(raw.rationale) || "—"}
                  />
                  <Field
                    label="Visual direction"
                    value={asString(raw.visualDirection) || "—"}
                  />
                  <Field
                    label="Why it works for brand"
                    value={asString(raw.whyItWorksForBrand) || "—"}
                  />
                  <Field
                    label="Distinctive vs category"
                    value={asString(raw.distinctivenessVsCategory) || "—"}
                  />
                  <div className="rounded-lg border border-zinc-700/70 bg-zinc-950/40 p-3">
                    <p className="text-[11px] font-semibold uppercase text-zinc-600">
                      Differentiation contract
                    </p>
                    <div className="mt-2 space-y-2">
                      <Field
                        label="Core tension"
                        value={asString(raw.coreTension) || "—"}
                      />
                      <Field
                        label="Emotional center"
                        value={asString(raw.emotionalCenter) || "—"}
                      />
                      <Field
                        label="Beats category norm"
                        value={asString(raw.whyBeatsCategoryNorm) || "—"}
                      />
                      <Field
                        label="Could fail if"
                        value={asString(raw.whyCouldFail) || "—"}
                      />
                      <Field
                        label="Distinct visual world"
                        value={asString(raw.distinctVisualWorld) || "—"}
                      />
                    </div>
                  </div>
                </div>
              </DisclosureSection>
            );
          })}
          {concepts.some(
            (c) => isRecord(c) && c.isRejected === true,
          ) ? (
            <DisclosureSection
              title="Other routes (not surfaced)"
              subtitle="Kept on file — lower-ranked in creative selection"
              defaultOpen={false}
            >
              <ul className="space-y-2 text-sm text-zinc-500">
                {concepts.map((raw, i) => {
                  if (!isRecord(raw) || raw.isRejected !== true) return null;
                  return (
                    <li key={asString(raw.conceptId) || i}>
                      <span className="font-medium text-zinc-400">
                        {asString(raw.conceptName) || `Concept ${i + 1}`}
                      </span>
                      {raw.hook ? (
                        <p className="mt-0.5 text-xs text-zinc-600">
                          {asString(raw.hook)}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </DisclosureSection>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Concept</SectionTitle>
      <BrandDnaComplianceStrip content={content} />
      <div className="mt-4 space-y-4">
        <Field
          label="Concept name"
          value={asString(content.conceptName) || "—"}
        />
        <Field label="Hook" value={asString(content.hook) || "—"} />
        <Field label="Rationale" value={asString(content.rationale) || "—"} />
        <Field
          label="Visual direction"
          value={asString(content.visualDirection) || "—"}
        />
      </div>
    </Card>
  );
}

/**
 * Visual Intelligence artifact — structured art direction for future image/video/logo pipelines.
 * Extension: read these fields in a future `buildImagePromptFromVisualSpec()` (not implemented here).
 */
/**
 * Assembled prompt packages for future `generateVisualAssetFromPromptPackage(artifactId, provider)`.
 * Compare `providerVariants.GENERIC` vs GEMINI_IMAGE vs GPT_IMAGE side-by-side.
 */
export function VisualPromptPackageArtifactCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const variants = content.providerVariants;
  const meta = content.optionalPromptMetadata;

  return (
    <Card>
      <SectionTitle>Visual prompt package</SectionTitle>
      <p className="mt-1 text-xs text-zinc-500">
        Deterministic assembly — ready for provider adapters; no image generation yet.
      </p>
      <div className="mt-4 space-y-4 rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-4">
        <Field
          label="Source visual spec"
          value={asString(content.sourceVisualSpecId) || "—"}
        />
        <Field
          label="Canonical provider target"
          value={asString(content.providerTarget) || "—"}
        />
      </div>
      <div className="mt-6 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Primary prompt (neutral)
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
            {asString(content.primaryPrompt) || "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-800/80">
            Avoid / negative
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
            {asString(content.negativePrompt) || "—"}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Style</p>
            <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
              {asString(content.styleInstructions) || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Composition</p>
            <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
              {asString(content.compositionInstructions) || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Lighting</p>
            <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
              {asString(content.lightingInstructions) || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Color</p>
            <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
              {asString(content.colorInstructions) || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Texture</p>
            <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
              {asString(content.textureInstructions) || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Typography</p>
            <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
              {asString(content.typographyInstructions) || "—"}
            </p>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium text-zinc-500">References</p>
          <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
            {asString(content.referenceInstructions) || "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-zinc-500">Brand alignment</p>
          <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
            {asString(content.brandAlignmentNotes) || "—"}
          </p>
        </div>
        {Array.isArray(content.optionalShotVariants) &&
        content.optionalShotVariants.length > 0 ? (
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Shot variants</p>
            <StringList items={content.optionalShotVariants} empty="—" />
          </div>
        ) : null}
      </div>

      {isRecord(variants) ? (
        <div className="mt-8 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
            Provider-ready variants
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {(["GENERIC", "GEMINI_IMAGE", "GPT_IMAGE"] as const).map((key) => {
              const v = variants[key];
              if (!isRecord(v)) return null;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-violet-200/70 bg-violet-50/40 p-3"
                >
                  <p className="text-xs font-semibold text-violet-950">{key.replace(/_/g, " ")}</p>
                  {typeof v.adapterNote === "string" && v.adapterNote ? (
                    <p className="mt-1 text-[11px] text-violet-900/80">{v.adapterNote}</p>
                  ) : null}
                  <p className="mt-2 text-[10px] font-medium uppercase text-zinc-500">Prompt</p>
                  <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-snug text-zinc-800">
                    {asString(v.prompt) || "—"}
                  </p>
                  <p className="mt-2 text-[10px] font-medium uppercase text-zinc-500">
                    Negative / avoid
                  </p>
                  <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-zinc-700">
                    {asString(v.negativeOrAvoid) || "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isRecord(meta) && Object.keys(meta).length > 0 ? (
        <div className="mt-6 rounded-lg border border-zinc-700/70 bg-zinc-950/40 p-3">
          <p className="text-[11px] font-medium text-zinc-500">Assembly metadata</p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-700">
            {Object.entries(meta).map(([k, val]) => (
              <li key={k}>
                <span className="text-zinc-500">{k}: </span>
                {asString(val)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export function VisualSpecArtifactCard({
  content,
  preferredFrameworkIds,
}: {
  content: unknown;
  preferredFrameworkIds?: string[];
}) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const fw = asString(content.frameworkUsed);
  return (
    <Card>
      <SectionTitle>Visual spec</SectionTitle>
      <BrandDnaComplianceStrip content={content} />
      <p className="mt-1 text-xs text-zinc-500">
        Art direction system — use for design execution or future generative pipelines.
      </p>
      {fw ? (
        <div className="mt-4">
          <FrameworkStrip
            frameworkId={fw}
            title="Primary framework"
            isPreferredForClient={preferredFrameworkIds?.includes(fw.trim())}
          />
        </div>
      ) : null}
      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-zinc-700/80 bg-gradient-to-b from-zinc-900/60 to-zinc-950/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Concept & objective
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Concept route" value={asString(content.conceptName) || "—"} />
            <Field label="Visual objective" value={asString(content.visualObjective) || "—"} />
          </div>
          <div className="mt-3">
            <Field
              label="Why it works for brand"
              value={asString(content.whyItWorksForBrand) || "—"}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-violet-200/60 bg-violet-50/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800/90">
              Mood & emotion
            </p>
            <div className="mt-3 space-y-2">
              <Field label="Mood" value={asString(content.mood) || "—"} />
              <Field label="Emotional tone" value={asString(content.emotionalTone) || "—"} />
            </div>
          </div>
          <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/85">
              Composition & style
            </p>
            <div className="mt-3 space-y-2">
              <Field label="Composition" value={asString(content.composition) || "—"} />
              <Field label="Image style" value={asString(content.imageStyle) || "—"} />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Color direction" value={asString(content.colorDirection) || "—"} />
          <Field label="Lighting" value={asString(content.lightingDirection) || "—"} />
          <Field label="Texture" value={asString(content.textureDirection) || "—"} />
          <Field label="Typography" value={asString(content.typographyDirection) || "—"} />
        </div>
        <div>
          <Field label="Reference logic" value={asString(content.referenceLogic) || "—"} />
        </div>
        <div>
          <Field
            label="Distinctiveness"
            value={asString(content.distinctivenessNotes) || "—"}
          />
        </div>
        <div className="rounded-lg border border-red-200/70 bg-red-50/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-900/80">
            Avoid
          </p>
          <div className="mt-2">
            <StringList items={content.avoidList} empty="Nothing listed." />
          </div>
        </div>
        {typeof content.optionalPromptSeed === "string" && content.optionalPromptSeed.trim() ? (
          <div className="rounded-lg border border-zinc-700/70 bg-zinc-950/40 p-3">
            <p className="text-[11px] font-medium text-zinc-500">Optional prompt seed</p>
            <p className="mt-1 font-mono text-xs leading-relaxed text-zinc-800">
              {content.optionalPromptSeed}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function CopyArtifactCard({
  content,
  preferredFrameworkIds,
}: {
  content: unknown;
  preferredFrameworkIds?: string[];
}) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const fw = asString(content.frameworkUsed);
  const headlineSel = isRecord(content._agenticforceSelection)
    ? (content._agenticforceSelection as Record<string, unknown>)
    : null;
  const copyHeadlineSelection =
    headlineSel && headlineSel.stage === "COPY_HEADLINES" ? headlineSel : null;
  const headlines = Array.isArray(content.headlineOptions)
    ? (content.headlineOptions as unknown[]).map((x) => String(x))
    : [];
  const primaryIdx =
    copyHeadlineSelection &&
    typeof copyHeadlineSelection.primaryHeadlineIndex === "number"
      ? Math.min(
          Math.max(0, Math.floor(copyHeadlineSelection.primaryHeadlineIndex)),
          Math.max(0, headlines.length - 1),
        )
      : 0;
  const altIdxs: number[] = Array.isArray(
    copyHeadlineSelection?.alternateHeadlineIndices,
  )
    ? (copyHeadlineSelection!.alternateHeadlineIndices as unknown[])
        .map((x) => Math.floor(Number(x)))
        .filter((n) => !Number.isNaN(n) && n >= 0 && n < headlines.length)
    : [];
  const surfacedHeadlineIdxs = new Set<number>([primaryIdx, ...altIdxs]);
  const otherHeadlineIdxs = headlines
    .map((_, i) => i)
    .filter((i) => !surfacedHeadlineIdxs.has(i));
  return (
    <Card>
      <SectionTitle>Copy</SectionTitle>
      <BrandDnaComplianceStrip content={content} />
      {fw ? (
        <div className="mt-3">
          <FrameworkStrip
            frameworkId={fw}
            title="Executing framework"
            isPreferredForClient={preferredFrameworkIds?.includes(fw.trim())}
          />
        </div>
      ) : null}
      {copyHeadlineSelection &&
      typeof copyHeadlineSelection.selectionRationale === "string" ? (
        <div className="mt-4 rounded-lg border border-violet-800/40 bg-violet-950/25 p-3 text-xs text-violet-100/90">
          <p className="font-semibold uppercase tracking-wide text-violet-300/90">
            Headline selection
          </p>
          <p className="mt-2 leading-relaxed">
            {copyHeadlineSelection.selectionRationale}
          </p>
        </div>
      ) : null}
      {copyHeadlineSelection ? (
        <div className="mt-3">
          <PairwiseTournamentDisclosure
            comparisons={copyHeadlineSelection.pairwiseComparisons}
            title="Headline matchups"
          />
        </div>
      ) : null}
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-zinc-500">Headlines (selected)</p>
          <ul className="mt-2 space-y-3">
            {headlines[primaryIdx] ? (
              <li className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
                  Primary
                </p>
                <p className="mt-1 text-sm text-zinc-200">{headlines[primaryIdx]}</p>
              </li>
            ) : null}
            {altIdxs.map((idx) =>
              headlines[idx] ? (
                <li
                  key={idx}
                  className="rounded-lg border border-amber-900/35 bg-amber-950/15 p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
                    Alternate
                  </p>
                  <p className="mt-1 text-sm text-zinc-200">{headlines[idx]}</p>
                </li>
              ) : null,
            )}
          </ul>
          {otherHeadlineIdxs.length > 0 ? (
            <DisclosureSection
              title="Other headline candidates"
              subtitle={`${otherHeadlineIdxs.length} not surfaced by default`}
              defaultOpen={false}
            >
              <ul className="mt-2 space-y-2 text-sm text-zinc-500">
                {otherHeadlineIdxs.map((idx) => (
                  <li key={idx} className="text-zinc-400">
                    {headlines[idx]}
                  </li>
                ))}
              </ul>
            </DisclosureSection>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Body copy options</p>
          <StringList
            items={content.bodyCopyOptions}
            empty="No body variants."
          />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">CTA options</p>
          <StringList items={content.ctaOptions} empty="No CTAs." />
        </div>
      </div>
    </Card>
  );
}

export function ReviewReportArtifactCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const fe = asString(content.frameworkExecution);
  return (
    <Card>
      <SectionTitle>Review report</SectionTitle>
      <BrandDnaComplianceStrip content={content} />
      <div className="mt-4 space-y-4">
        <Field
          label="Score summary"
          value={asString(content.scoreSummary) || "—"}
        />
        <Field label="Verdict" value={asString(content.verdict) || "—"} />
        {typeof content.narrativeCoherence === "string" ? (
          <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300/90">
              Campaign coherence (vs Campaign Core)
            </p>
            <div className="mt-2 grid gap-2 text-sm text-cyan-100/90 sm:grid-cols-3">
              <div>
                <span className="text-xs text-cyan-200/70">Narrative</span>
                <p className="font-medium">{content.narrativeCoherence}</p>
              </div>
              <div>
                <span className="text-xs text-cyan-200/70">Tone</span>
                <p className="font-medium">{asString(content.toneCoherence)}</p>
              </div>
              <div>
                <span className="text-xs text-cyan-200/70">Visual</span>
                <p className="font-medium">{asString(content.visualCoherence)}</p>
              </div>
            </div>
            <Field
              label="Alignment notes"
              value={asString(content.campaignCoreAlignmentNotes) || "—"}
            />
          </div>
        ) : null}
        {fe ? (
          <div>
            <p className="text-xs font-medium text-zinc-500">
              Framework execution
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-100">{fe}</p>
            <Field
              label="Framework assessment"
              value={asString(content.frameworkAssessment) || "—"}
            />
          </div>
        ) : null}
        <Field
          label="Quality verdict"
          value={asString(content.qualityVerdict) || "—"}
        />
        {typeof content.creativeBarVerdict === "string" ? (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              content.creativeBarVerdict === "FAILS_BAR"
                ? "border-red-300 bg-red-50 text-red-950"
                : content.creativeBarVerdict === "MARGINAL"
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : "border-emerald-200 bg-emerald-50/80 text-emerald-950"
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Creative bar
            </span>
            <p className="mt-1 font-medium">{content.creativeBarVerdict}</p>
          </div>
        ) : null}
        {isRecord(content.comparisonRankings) ? (
          <div className="rounded-lg border border-violet-200/80 bg-violet-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-900">
              Forced comparison
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-violet-950">
              <li>
                <span className="font-medium">Strongest:</span>{" "}
                {asString(content.comparisonRankings.strongestOutput) || "—"}
              </li>
              <li>
                <span className="font-medium">Weakest:</span>{" "}
                {asString(content.comparisonRankings.weakestOutput) || "—"}
              </li>
              <li>
                <span className="font-medium">Most generic:</span>{" "}
                {asString(content.comparisonRankings.mostGeneric) || "—"}
              </li>
              <li>
                <span className="font-medium">Most on-brand:</span>{" "}
                {asString(content.comparisonRankings.mostOnBrand) || "—"}
              </li>
            </ul>
          </div>
        ) : null}
        <div className="space-y-3 rounded-lg border border-zinc-700/80 bg-zinc-950/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Harsh creative audit
          </p>
          <Field
            label="Technically correct but creatively safe"
            value={asString(content.technicallyCorrectButCreativelySafe) || "—"}
          />
          <Field
            label="Framework named but not expressed"
            value={asString(content.frameworkNamedButNotExpressed) || "—"}
          />
          <Field
            label="Category cliché risk"
            value={asString(content.categoryClicheRisk) || "—"}
          />
          <Field
            label="Polished but not memorable"
            value={asString(content.polishedButNotMemorable) || "—"}
          />
          <Field
            label="Visual distinctiveness"
            value={asString(content.visualDistinctivenessAudit) || "—"}
          />
          <Field
            label="Identity ownability"
            value={asString(content.identityOwnabilityAudit) || "—"}
          />
        </div>
        <Field
          label="Distinctiveness"
          value={asString(content.distinctivenessAssessment) || "—"}
        />
        <Field
          label="Brand alignment"
          value={asString(content.brandAlignmentAssessment) || "—"}
        />
        <Field
          label="Tone alignment (Brand OS)"
          value={asString(content.toneAlignment) || "—"}
        />
        <Field
          label="Language compliance"
          value={asString(content.languageCompliance) || "—"}
        />
        <div>
          <p className="text-xs font-medium text-zinc-500">
            Banned phrase violations
          </p>
          <StringList
            items={content.bannedPhraseViolations}
            empty="None listed."
          />
        </div>
        {content.regenerationRecommended === true ? (
          <div className="text-xs text-amber-800">
            <p className="font-medium">Regeneration recommended (for next cycle)</p>
            <StringList
              items={content.regenerationReasons}
              empty="(no reasons listed)"
            />
          </div>
        ) : null}
        <div>
          <p className="text-xs font-medium text-zinc-500">Issues</p>
          <StringList items={content.issues} empty="None listed." />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Recommendations</p>
          <StringList
            items={content.recommendations}
            empty="None listed."
          />
        </div>
      </div>
    </Card>
  );
}

export function ExportArtifactCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const meta = content.metadata;
  const cd = isRecord(content._creativeDirectorDecision)
    ? (content._creativeDirectorDecision as Record<string, unknown>)
    : null;
  return (
    <Card>
      <SectionTitle>Export</SectionTitle>
      {cd ? (
        <div className="mt-4 rounded-xl border border-violet-600/35 bg-violet-950/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">
            Creative Director decision
          </p>
          <p className="mt-2 text-sm font-medium text-violet-50">
            {asString(cd.verdict) || "—"}
          </p>
          <Field label="Rationale" value={asString(cd.rationale) || "—"} />
          {isRecord(cd.selectedAssets) ? (
            <div className="mt-3 space-y-1 text-sm text-violet-100/85">
              <p>
                <span className="text-violet-300/80">Visual: </span>
                {asString(
                  (cd.selectedAssets as Record<string, unknown>).visualAssetId,
                ) || "—"}
              </p>
              <p>
                <span className="text-violet-300/80">Copy: </span>
                {asString(
                  (cd.selectedAssets as Record<string, unknown>).copyVariant,
                ) || "—"}
              </p>
            </div>
          ) : null}
          {Array.isArray(cd.improvementDirectives) &&
          cd.improvementDirectives.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-violet-300/80">
                Improvement directives
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-violet-100/80">
                {(cd.improvementDirectives as unknown[]).map((x, i) => (
                  <li key={i}>{String(x)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 space-y-4">
        <Field
          label="Export status"
          value={asString(content.exportStatus) || "—"}
        />
        <div>
          <p className="text-xs font-medium text-zinc-500">Formats</p>
          <StringList items={content.formats} empty="—" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Metadata</p>
          {isRecord(meta) ? (
            <ul className="mt-1 space-y-1 text-sm text-zinc-800">
              {Object.entries(meta).map(([k, v]) => (
                <li key={k}>
                  <span className="text-zinc-500">{k}: </span>
                  {asString(v)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">—</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ArtifactByType({
  type,
  content,
  preferredFrameworkIds,
}: {
  type: ArtifactType;
  content: unknown;
  preferredFrameworkIds?: string[];
}) {
  const inner = (() => {
    switch (type) {
      case "INTAKE_SUMMARY":
        return <IntakeSummaryCard content={content} />;
      case "STRATEGY":
        return (
          <StrategyArtifactCard
            content={content}
            preferredFrameworkIds={preferredFrameworkIds}
          />
        );
      case "IDENTITY_STRATEGY":
        return <IdentityStrategyArtifactCard content={content} />;
      case "IDENTITY_ROUTES_PACK":
        return <IdentityRoutesPackArtifactCard content={content} />;
      case "CONCEPT":
        return (
          <ConceptArtifactCard
            content={content}
            preferredFrameworkIds={preferredFrameworkIds}
          />
        );
      case "VISUAL_SPEC":
        return (
          <VisualSpecArtifactCard
            content={content}
            preferredFrameworkIds={preferredFrameworkIds}
          />
        );
      case "VISUAL_PROMPT_PACKAGE":
        return <VisualPromptPackageArtifactCard content={content} />;
      case "COPY":
        return (
          <CopyArtifactCard
            content={content}
            preferredFrameworkIds={preferredFrameworkIds}
          />
        );
      case "REVIEW_REPORT":
        return <ReviewReportArtifactCard content={content} />;
      case "EXPORT":
        return <ExportArtifactCard content={content} />;
      default:
        return <JsonFallback content={content} />;
    }
  })();

  return (
    <div>
      <ArtifactProvenance content={content} />
      <QualityStrip content={content} />
      {inner}
    </div>
  );
}
