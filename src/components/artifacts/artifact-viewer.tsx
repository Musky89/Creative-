import type { ArtifactType } from "@/generated/prisma/client";
import { Card, SectionTitle } from "@/components/ui/section";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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
    </Card>
  );
}

export function ConceptArtifactCard({ content }: { content: unknown }) {
  if (!isRecord(content)) return <JsonFallback content={content} />;
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
  return (
    <Card>
      <SectionTitle>Copy</SectionTitle>
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
  return (
    <Card>
      <SectionTitle>Review report</SectionTitle>
      <div className="mt-4 space-y-4">
        <Field
          label="Score summary"
          value={asString(content.scoreSummary) || "—"}
        />
        <Field label="Verdict" value={asString(content.verdict) || "—"} />
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
}
