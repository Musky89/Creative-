import { VisualAssetsPanel } from "@/components/studio/visual-assets-panel";
import { Card } from "@/components/ui/section";
import {
  MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE,
  MAX_VISUAL_ASSETS_PER_PACKAGE,
} from "@/server/visual-generation/generate-visual-asset-from-prompt-package";
import type { VisualGenReadinessLine } from "@/lib/studio/visual-generation-readiness";
import { StudioFirstImageCta } from "./studio-first-image-cta";

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

export function StudioVisualGenerationHub({
  clientId,
  briefId,
  visualDirectionStatus,
  hasVisualSpec,
  hasPromptPackage,
  promptPackageArtifactId,
  visualAssets,
  readinessLines,
  creativeDirectorDecision,
  composeDefaultHeadline,
}: {
  clientId: string;
  briefId: string;
  visualDirectionStatus: string | null;
  hasVisualSpec: boolean;
  hasPromptPackage: boolean;
  promptPackageArtifactId: string | null;
  visualAssets: AssetRow[];
  readinessLines: VisualGenReadinessLine[];
  creativeDirectorDecision: Record<string, unknown> | null;
  composeDefaultHeadline: string | null;
}) {
  const canGenerate =
    hasPromptPackage &&
    promptPackageArtifactId &&
    readinessLines.every((l) => l.level !== "block");

  const blockedReasons = readinessLines.filter((l) => l.level === "block");

  return (
    <Card
      id="studio-image-generation"
      className="border-sky-900/40 bg-sky-950/20 ring-1 ring-sky-900/30"
    >
      <p className="text-xs font-medium tracking-wide text-sky-300/90 uppercase">
        Campaign images
      </p>
      <p className="mt-2 text-sm text-sky-100/85">
        Images are built from the{" "}
        <strong className="font-medium text-sky-50">visual prompt package</strong>, which is
        created when you <strong className="font-medium text-sky-50">approve</strong> the{" "}
        <strong className="font-medium text-sky-50">Visual direction</strong> stage in{" "}
        <a href="#review" className="text-sky-200 underline decoration-sky-600">
          Actions
        </a>
        .
      </p>

      {creativeDirectorDecision ? (
        <div className="mt-4 rounded-xl border border-violet-700/40 bg-violet-950/25 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">
            Creative Director decision
          </p>
          <p className="mt-1 text-sm font-medium text-violet-50">
            {String(creativeDirectorDecision.verdict ?? "—")}
          </p>
          {typeof creativeDirectorDecision.rationale === "string" ? (
            <p className="mt-2 text-xs leading-relaxed text-violet-100/85">
              {creativeDirectorDecision.rationale}
            </p>
          ) : null}
          {isRecord(creativeDirectorDecision.selectedAssets) ? (
            <p className="mt-2 text-xs text-violet-200/80">
              Selected copy:{" "}
              {String(creativeDirectorDecision.selectedAssets.copyVariant ?? "—")}
            </p>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-4 space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-3 text-sm">
        <li className="flex gap-2 text-zinc-300">
          <span className="text-zinc-500">1.</span>
          Visual direction task produces a <code className="text-xs text-zinc-400">VISUAL_SPEC</code>{" "}
          (see{" "}
          <a
            href="#studio-visual-direction-artifact"
            className="text-sky-300 underline decoration-sky-700"
          >
            Visual direction output
          </a>
          ).
        </li>
        <li className="flex gap-2 text-zinc-300">
          <span className="text-zinc-500">2.</span>
          <strong className="font-medium text-zinc-200">Approve</strong> that stage → system
          assembles <code className="text-xs text-zinc-400">VISUAL_PROMPT_PACKAGE</code>.
        </li>
        <li className="flex gap-2 text-zinc-300">
          <span className="text-zinc-500">3.</span>
          Use <strong className="font-medium text-zinc-200">Generate visual assets</strong>{" "}
          below (needs image API keys + storage).
        </li>
      </ul>

      <div className="mt-4 space-y-2">
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

      {!hasVisualSpec && visualDirectionStatus == null ? (
        <p className="mt-3 text-sm text-zinc-500">
          Run the workflow until the Visual direction stage exists.
        </p>
      ) : null}

      {hasVisualSpec && !hasPromptPackage ? (
        <div className="mt-4 rounded-lg border border-amber-600/35 bg-amber-950/30 px-3 py-3 text-sm text-amber-100/90">
          {visualDirectionStatus === "AWAITING_REVIEW" ? (
            <>
              <p className="font-medium text-amber-50">Prompt package is waiting on you</p>
              <p className="mt-1 text-amber-100/85">
                Visual direction is in <strong>review</strong>. Open{" "}
                <a href="#review" className="font-medium text-amber-200 underline">
                  Actions → Approve task
                </a>{" "}
                to create the prompt package and unlock generation.
              </p>
            </>
          ) : visualDirectionStatus === "COMPLETED" && !hasPromptPackage ? (
            <>
              <p className="font-medium text-amber-50">Prompt package missing</p>
              <p className="mt-1 text-amber-100/85">
                Visual direction is completed but no package was stored. Try re-approving from
                review history or check server logs for assembly errors.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-amber-50">Not ready yet</p>
              <p className="mt-1 text-amber-100/85">
                Complete or approve the Visual direction stage first (current status:{" "}
                <code className="text-xs">{visualDirectionStatus ?? "—"}</code>).
              </p>
            </>
          )}
        </div>
      ) : null}

      {hasPromptPackage && promptPackageArtifactId ? (
        <div className="mt-6 border-t border-zinc-800/80 pt-6">
          <p className="text-sm font-semibold text-zinc-100">
            Generate visual assets
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Provider keys: prefer <code className="text-zinc-400">GEMINI_API_KEY</code> /{" "}
            <code className="text-zinc-400">GOOGLE_API_KEY</code>, fallback{" "}
            <code className="text-zinc-400">OPENAI_API_KEY</code>. Same controls appear under
            Visual direction in Outputs.
          </p>
          {canGenerate ? (
            <StudioFirstImageCta
              clientId={clientId}
              briefId={briefId}
              promptPackageArtifactId={promptPackageArtifactId}
              existingAssetCount={
                visualAssets.filter((a) => a.sourceArtifactId === promptPackageArtifactId)
                  .length
              }
            />
          ) : null}
          <VisualAssetsPanel
            clientId={clientId}
            briefId={briefId}
            promptPackageArtifactId={promptPackageArtifactId}
            critiqueRegenLimit={MAX_CRITIQUE_REGENERATIONS_PER_PACKAGE}
            packageAssetLimit={MAX_VISUAL_ASSETS_PER_PACKAGE}
            composeDefaultHeadline={composeDefaultHeadline}
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
            panelTitle="Provider & variants"
          />
        </div>
      ) : null}

      {blockedReasons.length > 0 && hasPromptPackage ? (
        <p className="mt-3 text-xs text-zinc-500">
          Fix the blocked items above, then refresh. See{" "}
          <code className="text-zinc-400">.env.example</code> and{" "}
          <code className="text-zinc-400">docs/LOCAL_DEV.md</code>.
        </p>
      ) : null}
    </Card>
  );
}
