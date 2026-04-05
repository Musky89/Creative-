import type { ArtifactType } from "@/generated/prisma/client";
import { Card, SectionTitle } from "@/components/ui/section";
import { getFrameworkById } from "@/lib/canon/frameworks";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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
    <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
      <span className="font-medium text-zinc-800">
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
    <ul className="list-inside list-disc space-y-1 text-sm text-zinc-800">
      {list.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}

function FrameworkStrip({
  frameworkId,
  title = "Creative Canon",
}: {
  frameworkId: string;
  title?: string;
}) {
  const fw = getFrameworkById(frameworkId.trim());
  return (
    <div className="rounded-lg border border-violet-200/80 bg-violet-50/60 px-3 py-2">
      <p className="text-[11px] font-medium tracking-wide text-violet-800 uppercase">
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold text-violet-950">
        {fw ? fw.name : frameworkId}
        {fw ? (
          <span className="ml-2 font-normal text-violet-700">
            ({fw.category.replace(/_/g, " ")})
          </span>
        ) : null}
      </p>
      {fw ? (
        <p className="mt-1 text-xs leading-relaxed text-violet-900/90">
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
      <div className="mt-0.5 text-sm text-zinc-900">{value}</div>
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

export function StrategyArtifactCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const pillars =
    content.messagePillars ?? content.pillars ?? content.messagingPillars;
  const angles = content.strategicAngles;
  return (
    <Card>
      <SectionTitle>Strategy</SectionTitle>
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
      {Array.isArray(angles) && angles.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-medium text-zinc-500">
            Strategic angles (Creative Canon)
          </p>
          {angles.map((a, i) => {
            if (!isRecord(a)) return null;
            const fid = asString(a.frameworkId);
            const ang = asString(a.angle);
            if (!fid) return null;
            return (
              <div key={i} className="space-y-2">
                <FrameworkStrip frameworkId={fid} title="Framework" />
                <p className="text-sm text-zinc-800">{ang || "—"}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

export function ConceptArtifactCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const concepts = content.concepts;
  const summary = asString(content.frameworkUsed);

  if (Array.isArray(concepts) && concepts.length > 0) {
    return (
      <Card>
        <SectionTitle>Concept pack</SectionTitle>
        {summary ? (
          <p className="mt-2 text-sm text-zinc-700">{summary}</p>
        ) : null}
        <div className="mt-6 space-y-8">
          {concepts.map((raw, i) => {
            if (!isRecord(raw)) return null;
            const fid = asString(raw.frameworkId);
            return (
              <div
                key={i}
                className="border-t border-zinc-100 pt-6 first:border-t-0 first:pt-0"
              >
                {fid ? <FrameworkStrip frameworkId={fid} /> : null}
                <div className="mt-4 space-y-3">
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
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Concept</SectionTitle>
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

export function CopyArtifactCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
  const fw = asString(content.frameworkUsed);
  return (
    <Card>
      <SectionTitle>Copy</SectionTitle>
      {fw ? (
        <div className="mt-3">
          <FrameworkStrip frameworkId={fw} title="Executing framework" />
        </div>
      ) : null}
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-zinc-500">Headline options</p>
          <StringList
            items={content.headlineOptions}
            empty="No headlines."
          />
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
      <div className="mt-4 space-y-4">
        <Field
          label="Score summary"
          value={asString(content.scoreSummary) || "—"}
        />
        <Field label="Verdict" value={asString(content.verdict) || "—"} />
        {fe ? (
          <div>
            <p className="text-xs font-medium text-zinc-500">
              Framework execution
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900">{fe}</p>
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
        <Field
          label="Distinctiveness"
          value={asString(content.distinctivenessAssessment) || "—"}
        />
        <Field
          label="Brand alignment"
          value={asString(content.brandAlignmentAssessment) || "—"}
        />
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
  return (
    <Card>
      <SectionTitle>Export</SectionTitle>
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
}: {
  type: ArtifactType;
  content: unknown;
}) {
  const inner = (() => {
    switch (type) {
      case "INTAKE_SUMMARY":
        return <IntakeSummaryCard content={content} />;
      case "STRATEGY":
        return <StrategyArtifactCard content={content} />;
      case "CONCEPT":
        return <ConceptArtifactCard content={content} />;
      case "COPY":
        return <CopyArtifactCard content={content} />;
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
