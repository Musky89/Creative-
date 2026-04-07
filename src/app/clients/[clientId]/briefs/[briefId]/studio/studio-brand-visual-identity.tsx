import { Card } from "@/components/ui/section";
import { getPrisma } from "@/server/db/prisma";

function takeLines(json: unknown, n: number): string[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((x) => String(x).trim())
    .filter((s) => s.length > 2)
    .slice(0, n);
}

export async function StudioBrandVisualIdentityPanel({
  clientId,
}: {
  clientId: string;
}) {
  const prisma = getPrisma();
  const [profile, client] = await Promise.all([
    prisma.brandVisualProfile.findUnique({ where: { clientId } }),
    prisma.client.findUnique({
      where: { id: clientId },
      select: { visualModelRef: true },
    }),
  ]);

  if (!profile) {
    return (
      <Card className="border-zinc-800/80 bg-zinc-950/30">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Brand visual identity
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Mark preferred frames in Studio — we’ll learn lighting, composition, and color patterns for
          future generations.
        </p>
      </Card>
    );
  }

  const light = takeLines(profile.lightingPatterns, 2);
  const comp = takeLines(profile.compositionPatterns, 2);
  const color = takeLines(profile.colorSignatures, 2);
  const evolving =
    profile.confirmationCount < 3
      ? "Evolving — needs more preferred picks"
      : profile.confirmationCount < 6
        ? "Strengthening with each preferred frame"
        : "Stable — multiple confirmations";

  return (
    <Card className="border-cyan-900/40 bg-cyan-950/15">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200/90">
          Brand visual identity
        </p>
        <span className="text-[10px] text-cyan-200/70">{evolving}</span>
      </div>
      <p className="mt-1 text-xs text-cyan-100/70">
        Learned DNA (soft lock in prompts) · confidence {profile.confidenceScore.toFixed(2)} · picks{" "}
        {profile.confirmationCount}
      </p>
      {client?.visualModelRef ? (
        <p className="mt-2 rounded border border-emerald-800/45 bg-emerald-950/30 px-2 py-1.5 text-[11px] text-emerald-100/90">
          Brand visual style is active — new generations can follow this look automatically when enabled.
        </p>
      ) : null}
      <dl className="mt-3 space-y-2 text-xs text-zinc-300">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Lighting</dt>
          <dd className="mt-0.5">{light.length ? light.join(" · ") : "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Composition
          </dt>
          <dd className="mt-0.5">{comp.length ? comp.join(" · ") : "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Color</dt>
          <dd className="mt-0.5">{color.length ? color.join(" · ") : "—"}</dd>
        </div>
      </dl>
    </Card>
  );
}
