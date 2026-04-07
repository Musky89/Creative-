import type { CampaignCore } from "@/lib/campaign/campaign-core";
import { StudioCampaignVisualHero } from "./studio-campaign-visual-hero";
import { StudioCreativeConfidencePanel } from "./studio-creative-confidence-panel";

function clip(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function StudioCampaignAtf({
  clientId,
  campaignCore,
  heroImageUrl,
  showVisualHero,
  primaryHeadline,
  cta,
  bodyCopyLead,
  confidenceScore10,
  confidenceBullets,
  hasCampaignStarted,
}: {
  clientId: string;
  campaignCore: CampaignCore | null;
  heroImageUrl: string | null;
  showVisualHero: boolean;
  primaryHeadline: string | null;
  cta: string | null;
  bodyCopyLead: string | null;
  confidenceScore10: number | null;
  confidenceBullets: string[];
  hasCampaignStarted: boolean;
}) {
  const showEmpty = !hasCampaignStarted;

  return (
    <section className="mb-16 space-y-6 lg:mb-20">
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_min(18rem,100%)] lg:gap-10">
        <div className="min-w-0 space-y-6">
          {showEmpty ? (
            <div className="space-y-3 py-2">
              <p className="text-lg font-medium leading-snug text-zinc-200 sm:text-xl">
                This campaign hasn&apos;t been created yet.
              </p>
              <p className="max-w-2xl text-base leading-relaxed text-zinc-500">
                Generate a campaign to see your creative direction — idea, visuals, and messaging
                will appear here first.
              </p>
            </div>
          ) : null}

          {!showEmpty && campaignCore ? (
            <div id="studio-campaign-core" className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Campaign idea
              </p>
              <h2 className="text-2xl font-semibold leading-[1.15] tracking-tight text-zinc-50 sm:text-3xl lg:text-4xl">
                {clip(campaignCore.singleLineIdea, 200)}
              </h2>
              <p className="max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                <span className="text-zinc-500">Tension · </span>
                {clip(campaignCore.emotionalTension, 280)}
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-500 sm:text-base">
                <span className="text-zinc-600">Visual story · </span>
                {clip(campaignCore.visualNarrative, 320)}
              </p>
            </div>
          ) : null}

          {!showEmpty && !campaignCore ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Campaign idea
              </p>
              <p className="text-base text-zinc-500">
                Your core idea will appear once the campaign idea stage completes.
              </p>
            </div>
          ) : null}

          {showVisualHero ? (
            <StudioCampaignVisualHero
              clientId={clientId}
              imageUrl={heroImageUrl}
              compact
            />
          ) : null}

          {!showEmpty && (primaryHeadline || cta || bodyCopyLead) ? (
            <div className="space-y-5 pt-2">
              {primaryHeadline ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Lead line
                  </p>
                  <p className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                    {primaryHeadline}
                  </p>
                </div>
              ) : null}
              {cta ? (
                <p className="text-lg font-medium text-amber-200/90 sm:text-xl">{cta}</p>
              ) : null}
              {bodyCopyLead ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Supporting copy
                  </p>
                  <p className="mt-2 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                    {bodyCopyLead}
                    {bodyCopyLead.length >= 420 ? "…" : ""}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <StudioCreativeConfidencePanel
          score10={confidenceScore10}
          bullets={confidenceBullets}
        />
      </div>
    </section>
  );
}
