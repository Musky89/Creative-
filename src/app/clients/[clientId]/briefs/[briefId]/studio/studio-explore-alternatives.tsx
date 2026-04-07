"use client";

import { DisclosureSection } from "@/components/ui/collapse";
import { VisualAssetsPanel } from "@/components/studio/visual-assets-panel";
import {
  MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE,
  MAX_VISUAL_ASSETS_PER_PACKAGE,
} from "@/lib/visual/visual-generation-limits";
import type { VisualGenReadinessLine } from "@/lib/studio/visual-generation-readiness";
import { StudioFirstImageCta } from "./studio-first-image-cta";
import {
  StudioVisualReferencesPanel,
  type CompositionGuidanceSummary,
  type PromptPackageRef,
} from "./studio-visual-references";

type AssetRow = {
  id: string;
  status: string;
  providerTarget: string;
  providerName: string;
  modelName: string;
  resultUrl: string | null;
  sourceArtifactId: string;
  generationNotes: string | null;
  createdAt: Date;
  isPreferred: boolean;
  isSecondary: boolean;
  autoRejected: boolean;
  founderRejected: boolean;
  cdDirectorPick?: boolean;
  regenerationAttempt: number;
  variantLabel: string | null;
  composed: boolean;
  review: {
    qualityVerdict: string;
    regenerationRecommended: boolean;
    evaluator: string;
    evaluation: Record<string, unknown> | null;
  } | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function StudioExploreAlternatives({
  clientId,
  briefId,
  visualDirectionStatus,
  hasVisualSpec,
  hasPromptPackage,
  promptPackageArtifactId,
  promptPackageRefs,
  compositionGuidance,
  savedReferenceUrls,
  visualAssets,
  readinessLines,
  creativeDirectorDecision,
  composeDefaultHeadline,
  composeDefaultCta,
  defaultOpen,
  hasBrandVisualStyle,
  showVisualGenerationModule,
}: {
  clientId: string;
  briefId: string;
  visualDirectionStatus: string | null;
  hasVisualSpec: boolean;
  hasPromptPackage: boolean;
  promptPackageArtifactId: string | null;
  promptPackageRefs: PromptPackageRef[];
  compositionGuidance?: CompositionGuidanceSummary | null;
  savedReferenceUrls: string[];
  visualAssets: AssetRow[];
  readinessLines: VisualGenReadinessLine[];
  creativeDirectorDecision: Record<string, unknown> | null;
  composeDefaultHeadline: string | null;
  composeDefaultCta: string | null;
  defaultOpen: boolean;
  hasBrandVisualStyle: boolean;
  showVisualGenerationModule: boolean;
}) {
  const canGenerate =
    hasPromptPackage &&
    promptPackageArtifactId &&
    readinessLines.every((l) => l.level !== "block");

  const blockedReasons = readinessLines.filter((l) => l.level === "block");

  const rawCount = visualAssets.filter(
    (a) => !a.composed && promptPackageArtifactId && a.sourceArtifactId === promptPackageArtifactId,
  ).length;

  return (
    <div id="studio-image-generation">
      <DisclosureSection
        title={showVisualGenerationModule ? "Visual generation & alternatives" : "Additional outputs"}
        subtitle={
          showVisualGenerationModule
            ? "Frames, finishing pass, references — when this engagement includes visuals"
            : "Decisions and extras when not running a full visual pipeline"
        }
        defaultOpen={defaultOpen}
      >
        <div className="space-y-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5">
        {creativeDirectorDecision ? (
          <div className="rounded-xl border border-violet-800/40 bg-violet-950/20 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-200/90">
              Creative Director
            </p>
            <p className="mt-1 text-sm font-medium text-violet-50">
              {String(creativeDirectorDecision.verdict ?? "—")}
            </p>
            {typeof creativeDirectorDecision.rationale === "string" ? (
              <p className="mt-2 text-xs leading-relaxed text-violet-100/80">
                {creativeDirectorDecision.rationale}
              </p>
            ) : null}
            {isRecord(creativeDirectorDecision.selectedAssets) ? (
              <p className="mt-2 text-xs text-violet-200/75">
                Copy pick:{" "}
                {String(creativeDirectorDecision.selectedAssets.copyVariant ?? "—")}
              </p>
            ) : null}
          </div>
        ) : null}

        {!showVisualGenerationModule ? (
          <p className="text-sm text-zinc-400">
            This engagement is not configured for image-variant output. Focus on strategy, copy, or
            export above — add workstreams like{" "}
            <span className="text-zinc-300">STATIC_VISUALS</span> or deliverables like{" "}
            <span className="text-zinc-300">IMAGE_VARIANTS</span> on the brief if you need frames.
          </p>
        ) : null}

        {showVisualGenerationModule ? (
        <div>
          <p className="text-sm text-zinc-400">
            After you approve <strong className="text-zinc-200">Visual direction</strong> in{" "}
            <a href="#review" className="text-sky-400 underline">
              Actions
            </a>
            , the system builds the prompt package so you can generate frames here.
          </p>
        </div>
        ) : null}

        {showVisualGenerationModule ? (
        <div className="space-y-2">
          {readinessLines.map((line, i) => (
            <p
              key={i}
              className={
                line.level === "ok"
                  ? "text-sm text-emerald-400/90"
                  : line.level === "warn"
                    ? "text-sm text-amber-200/90"
                    : "text-sm text-red-300/90"
              }
            >
              {line.level === "block" ? "Blocked: " : line.level === "warn" ? "Note: " : "OK: "}
              {line.text}
            </p>
          ))}
        </div>
        ) : null}

        {showVisualGenerationModule && !hasVisualSpec && visualDirectionStatus == null ? (
          <p className="text-sm text-zinc-500">Run the workflow until Visual direction exists.</p>
        ) : null}

        {showVisualGenerationModule && hasVisualSpec && !hasPromptPackage ? (
          <div className="rounded-lg border border-amber-600/30 bg-amber-950/25 px-3 py-3 text-sm text-amber-100/90">
            {visualDirectionStatus === "AWAITING_REVIEW" ? (
              <>
                <p className="font-medium text-amber-50">Waiting on your approval</p>
                <p className="mt-1 text-amber-100/85">
                  Approve Visual direction in{" "}
                  <a href="#review" className="font-medium text-amber-200 underline">
                    Actions
                  </a>{" "}
                  to unlock generation.
                </p>
              </>
            ) : (
              <p className="text-amber-100/85">
                Visual direction status:{" "}
                <code className="text-xs">{visualDirectionStatus ?? "—"}</code>
              </p>
            )}
          </div>
        ) : null}

        {showVisualGenerationModule && hasPromptPackage && promptPackageArtifactId ? (
          <div className="border-t border-zinc-800/80 pt-6 space-y-6">
            <StudioVisualReferencesPanel
              clientId={clientId}
              briefId={briefId}
              packageRefs={promptPackageRefs}
              savedUrls={savedReferenceUrls}
              compositionGuidance={compositionGuidance ?? null}
            />
            <p className="text-sm font-semibold text-zinc-100">Generate frames</p>
            <p className="mt-1 text-xs text-zinc-500">
              Keys: GEMINI / Google or OpenAI. Storage under <code className="text-zinc-400">storage/</code>.
            </p>
            {hasBrandVisualStyle ? (
              <p className="mt-2 rounded-lg border border-emerald-800/50 bg-emerald-950/25 px-3 py-2 text-xs text-emerald-100/90">
                Using brand visual style ✓ — new batches automatically follow your taught look when fal.ai
                is enabled (pick “Brand style (fal)” in Provider to force it).
              </p>
            ) : null}
            {canGenerate ? (
              <StudioFirstImageCta
                clientId={clientId}
                briefId={briefId}
                promptPackageArtifactId={promptPackageArtifactId}
                existingAssetCount={rawCount}
              />
            ) : null}
            <VisualAssetsPanel
              clientId={clientId}
              briefId={briefId}
              promptPackageArtifactId={promptPackageArtifactId}
              hasBrandVisualStyle={hasBrandVisualStyle}
              critiqueRegenLimit={MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE}
              packageAssetLimit={MAX_VISUAL_ASSETS_PER_PACKAGE}
              composeDefaultHeadline={composeDefaultHeadline}
              composeDefaultCta={composeDefaultCta}
              assets={visualAssets.map((va) => ({
                id: va.id,
                status: va.status,
                providerTarget: va.providerTarget,
                providerName: va.providerName,
                modelName: va.modelName,
                resultUrl: va.resultUrl,
                sourceArtifactId: va.sourceArtifactId,
                generationNotes: va.generationNotes,
                createdAt: va.createdAt.toISOString(),
                isPreferred: va.isPreferred,
                isSecondary: va.isSecondary,
                autoRejected: va.autoRejected,
                founderRejected: va.founderRejected,
                cdDirectorPick: va.cdDirectorPick,
                regenerationAttempt: va.regenerationAttempt,
                variantLabel: va.variantLabel,
                composed: va.composed,
                review: va.review
                  ? {
                      qualityVerdict: va.review.qualityVerdict,
                      regenerationRecommended: va.review.regenerationRecommended,
                      evaluator: va.review.evaluator,
                      evaluation: va.review.evaluation,
                    }
                  : null,
              }))}
              compact
              panelTitle="Frames & finishing"
            />
          </div>
        ) : null}

        {showVisualGenerationModule && blockedReasons.length > 0 && hasPromptPackage ? (
          <p className="text-xs text-zinc-500">
            Resolve blocks above, then refresh. See <code className="text-zinc-400">.env.example</code>.
          </p>
        ) : null}
        </div>
      </DisclosureSection>
    </div>
  );
}
