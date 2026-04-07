import { Card } from "@/components/ui/section";
import type { BriefWorkPlan } from "@/lib/workflow/brief-work-plan";
import { ENGAGEMENT_TYPE_LABELS } from "@/lib/workflow/brief-work-plan";

function chipClass(active: boolean) {
  return active
    ? "rounded-full border border-emerald-700/50 bg-emerald-950/35 px-2.5 py-0.5 text-[10px] font-medium text-emerald-100/90"
    : "rounded-full border border-zinc-700/60 bg-zinc-900/50 px-2.5 py-0.5 text-[10px] text-zinc-500 line-through opacity-70";
}

export function StudioEngagementOverview({ plan }: { plan: BriefWorkPlan }) {
  const et = ENGAGEMENT_TYPE_LABELS[plan.engagementType];

  const moduleChips: { id: string; label: string; active: boolean }[] = [
    { id: "identity", label: "Identity studio", active: plan.showIdentityStudio },
    { id: "strategy", label: "Strategy layer", active: true },
    { id: "campaign", label: "Campaign creative", active: plan.showCampaignCreative },
    { id: "visual", label: "Visual generation", active: plan.showImageGeneration },
    { id: "copy", label: "Copy module", active: plan.showCopyModule },
    { id: "social", label: "Social content", active: plan.showSocialModule },
    { id: "ooh", label: "OOH / print", active: plan.showOohPrintModule },
    { id: "tvc", label: "TVC / film notes", active: plan.showTvcModule },
    { id: "export", label: "Export", active: plan.showExportModule },
    { id: "deck", label: "Presentation", active: plan.showPresentationModule },
  ];

  return (
    <Card className="border-zinc-800/90 bg-gradient-to-br from-zinc-900/80 to-zinc-950/60">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Engagement overview
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight text-zinc-100">{et}</span>
        <span className="text-xs text-zinc-500">assignment type</span>
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Active workstreams
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {plan.workstreams.length ? (
            plan.workstreams.map((w) => (
              <span
                key={w}
                className="rounded-md border border-sky-800/50 bg-sky-950/30 px-2 py-0.5 text-[11px] font-medium text-sky-100/90"
              >
                {w.replace(/_/g, " ")}
              </span>
            ))
          ) : (
            <span className="text-xs text-zinc-500">
              Default full pipeline — set workstreams on the brief to narrow modules.
            </span>
          )}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Requested deliverables
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {plan.deliverables.slice(0, 24).map((d) => (
            <span
              key={d}
              className="rounded border border-zinc-700/70 bg-zinc-950/50 px-2 py-0.5 text-[10px] text-zinc-300"
            >
              {d.replace(/_/g, " ")}
            </span>
          ))}
          {plan.deliverables.length > 24 ? (
            <span className="text-[10px] text-zinc-500">
              +{plan.deliverables.length - 24} more
            </span>
          ) : null}
          {plan.deliverables.length === 0 ? (
            <span className="text-xs text-zinc-500">None listed — full pipeline assumed.</span>
          ) : null}
        </div>
      </div>
      <div className="mt-5 border-t border-zinc-800/80 pt-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Studio modules
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          Only relevant outputs are emphasized below — one job, coordinated deliverables.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {moduleChips.map((m) => (
            <span key={m.id} className={chipClass(m.active)}>
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
