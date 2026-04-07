import { Card } from "@/components/ui/section";

const PACKAGE_CONTENT = [
  "DELIVERY_MANIFEST.json — roles, formats, selection, future PSD/AI notes",
  "README.md — how to read the package",
  "01_Strategy/identity_strategy.json",
  "02_Routes/identity_routes_pack.json (includes founder selection)",
  "03_Documents/ — strategy + selected route Markdown, IDENTITY_DELIVERY.pdf",
  "04_Assets/vector/*.svg — contract masters (until real vectors are generated)",
  "04_Assets/raster + previews — structural PNG/JPG placeholders",
  "_package_full.json — manifest + both artifacts in one file",
];

export function IdentityExportPanel({
  clientId,
  briefId,
  hasIdentityArtifacts,
  presentation = "default",
}: {
  clientId: string;
  briefId: string;
  hasIdentityArtifacts: boolean;
  presentation?: "default" | "studio";
}) {
  const q = `clientId=${encodeURIComponent(clientId)}`;
  const base = `/api/export/briefs/${briefId}/identity?${q}`;
  const studio = presentation === "studio";

  if (studio) {
    return (
      <Card className="border-emerald-800/40 bg-emerald-950/15">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
          Identity
        </p>
        {!hasIdentityArtifacts ? (
          <p className="mt-3 text-sm text-emerald-100/80">
            Finish identity strategy and routes first — then you can pull a pack from here.
          </p>
        ) : (
          <p className="mt-3 text-sm text-emerald-100/80">
            One download with everything we have so far — strategy, routes, and layout-ready
            assets.
          </p>
        )}
        <div
          className={`mt-4 flex flex-wrap gap-2 ${!hasIdentityArtifacts ? "pointer-events-none opacity-45" : ""}`}
        >
          <a
            href={`${base}&format=zip`}
            className="inline-flex rounded-full bg-emerald-600/90 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Download pack
          </a>
        </div>
        {hasIdentityArtifacts ? (
          <details className="mt-4 text-sm text-emerald-200/70">
            <summary className="cursor-pointer select-none text-emerald-300/90 hover:text-emerald-200">
              Other formats
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`${base}&format=pdf`}
                className="rounded-lg border border-emerald-800/50 px-3 py-1.5 text-xs hover:border-emerald-600"
              >
                PDF
              </a>
              <a
                href={`${base}&format=markdown`}
                className="rounded-lg border border-emerald-800/50 px-3 py-1.5 text-xs hover:border-emerald-600"
              >
                Document
              </a>
              <a
                href={`${base}&format=json`}
                className="rounded-lg border border-emerald-800/50 px-3 py-1.5 text-xs hover:border-emerald-600"
              >
                Structured
              </a>
            </div>
          </details>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="border-emerald-800/50 bg-emerald-950/20">
      <p className="text-xs font-medium tracking-wide text-emerald-400/90 uppercase">
        Identity delivery
      </p>
      <p className="mt-2 text-sm text-emerald-100/85">
        Agency-style ZIP with manifest, documents (MD + PDF), JSON sources, and
        asset folder structure. SVGs are <span className="text-emerald-200">contracts</span>{" "}
        until mark generation fills real masters; PNG/JPG are layout placeholders only.
      </p>

      {!hasIdentityArtifacts ? (
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 text-sm text-amber-100/90">
          Run identity stages first — export unlocks once strategy or routes exist.
        </p>
      ) : null}

      <div
        className={`mt-4 flex flex-wrap gap-2 ${!hasIdentityArtifacts ? "pointer-events-none opacity-45" : ""}`}
      >
        <a
          href={`${base}&format=zip`}
          className="inline-flex rounded-lg bg-emerald-600/90 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Download ZIP package
        </a>
        <a
          href={`${base}&format=pdf`}
          className="inline-flex rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3.5 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-500"
        >
          PDF only
        </a>
        <a
          href={`${base}&format=markdown`}
          className="inline-flex rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3.5 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-500"
        >
          Markdown
        </a>
        <a
          href={`${base}&format=json`}
          className="inline-flex rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3.5 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-500"
        >
          JSON bundle
        </a>
      </div>

      <p className="mt-4 text-xs font-medium text-emerald-500/90 uppercase">
        Included in ZIP
      </p>
      <ul className="mt-2 space-y-1.5 text-xs text-emerald-100/75">
        {PACKAGE_CONTENT.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-emerald-600/80" aria-hidden>
              ·
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
