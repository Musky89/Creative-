"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  approveTaskAction,
  executeNextTaskAction,
  initializeWorkflowAction,
  requestRevisionAction,
  resetTaskReadyAction,
  retryTaskGenerationAction,
} from "@/app/actions/workflow";
import { STAGE_LABELS } from "@/lib/workflow-display";
import type { TaskStatus, WorkflowStage } from "@/generated/prisma/client";
import { FieldHint, Label, Textarea } from "@/components/ui/forms";

function ActionButton({
  children,
  pending,
  disabled,
  variant = "dark",
  onClick,
}: {
  children: React.ReactNode;
  pending: boolean;
  disabled?: boolean;
  variant?: "dark" | "light" | "danger";
  onClick: () => void;
}) {
  const v =
    variant === "dark"
      ? "bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50"
      : variant === "danger"
        ? "border border-red-500/40 bg-red-950/40 text-red-100 hover:bg-red-950/60 disabled:opacity-50"
        : "border border-zinc-600 bg-zinc-950/60 text-zinc-100 hover:border-zinc-500 disabled:opacity-50";
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-sm font-medium ${v}`}
    >
      {pending ? "…" : children}
    </button>
  );
}

function Notice({
  variant,
  children,
}: {
  variant: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const cls =
    variant === "success"
      ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-100"
      : variant === "error"
        ? "border-red-500/35 bg-red-950/40 text-red-100"
        : "border-zinc-600 bg-zinc-950/50 text-zinc-200";
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>
  );
}

function stageLabelForTaskId(
  taskId: string,
  tasks: { id: string; stage: WorkflowStage }[],
): string {
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return taskId;
  return STAGE_LABELS[t.stage as keyof typeof STAGE_LABELS] ?? t.stage;
}

function primaryActionLabel(stage: WorkflowStage | null | undefined): string {
  switch (stage) {
    case "BRIEF_INTAKE":
      return "Continue";
    case "STRATEGY":
      return "Generate ideas";
    case "IDENTITY_STRATEGY":
    case "IDENTITY_ROUTING":
      return "Develop identity";
    case "CONCEPTING":
      return "Develop concepts";
    case "VISUAL_DIRECTION":
      return "Create visuals";
    case "COPY_DEVELOPMENT":
      return "Write copy";
    case "REVIEW":
      return "Run review";
    case "EXPORT":
      return "Build campaign";
    default:
      return "Continue";
  }
}

export function WorkflowControls({
  clientId,
  briefId,
  hasWorkflow,
  nextExecutableTaskIds,
  nextExecutableStage = null,
  reviewTaskId,
  reviseTaskId,
  brandReadiness,
  timelineTasks,
  reviewApproveGate,
}: {
  clientId: string;
  briefId: string;
  hasWorkflow: boolean;
  nextExecutableTaskIds: string[];
  /** When the next READY task is an agent stage, used to gate Brand Bible without blocking intake/export. */
  nextExecutableStage?: WorkflowStage | null;
  reviewTaskId: string | null;
  reviseTaskId: string | null;
  brandReadiness: { ok: boolean; missing: string[] };
  timelineTasks: {
    id: string;
    stage: WorkflowStage;
    status: TaskStatus;
    lastFailureReason?: string | null;
    lastFailureType?: string | null;
  }[];
  reviewApproveGate: {
    canApprove: boolean;
    structuralOk: boolean;
    structuralMessage: string | null;
    qualityBlocked: boolean;
    qualityReasons: string[];
  } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const approveNoteRef = useRef<HTMLTextAreaElement>(null);
  const revisionRef = useRef<HTMLTextAreaElement>(null);
  const reviewerRef = useRef<HTMLInputElement>(null);
  const [approveAnyway, setApproveAnyway] = useState(false);

  useEffect(() => {
    setApproveAnyway(false);
  }, [reviewTaskId]);

  const refresh = () => router.refresh();

  const run = async (
    fn: () => Promise<{ error?: string } | { ok: true } | void>,
  ) => {
    setNotice(null);
    start(async () => {
      const r = await fn();
      if (r && typeof r === "object" && "error" in r && r.error) {
        setNotice({ type: "error", text: r.error });
        return;
      }
      setNotice({ type: "success", text: "Saved." });
      refresh();
    });
  };

  const nextExecutableCount = nextExecutableTaskIds.length;
  const reviewStageLabel = reviewTaskId
    ? stageLabelForTaskId(reviewTaskId, timelineTasks)
    : null;

  const failedTasks = timelineTasks.filter((t) => t.status === "FAILED");
  const approveDisabled =
    !!reviewTaskId &&
    (!reviewApproveGate ||
      !reviewApproveGate.structuralOk ||
      (reviewApproveGate.qualityBlocked && !approveAnyway));

  const approveTooltip =
    reviewApproveGate && !reviewApproveGate.structuralOk
      ? reviewApproveGate.structuralMessage ?? "Output is not valid for approval."
      : reviewApproveGate?.qualityBlocked && !approveAnyway
        ? reviewApproveGate.qualityReasons.join(" ")
        : undefined;

  return (
    <div
      id="studio-workspace"
      className="rounded-2xl bg-zinc-900/25 px-5 py-6 sm:px-6 sm:py-7"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Workspace
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        Generate, choose, refine — one focused move at a time.
      </p>

      {!brandReadiness.ok &&
      nextExecutableStage != null &&
      nextExecutableStage !== "BRIEF_INTAKE" &&
      nextExecutableStage !== "EXPORT" ? (
        <div className="mt-4">
          <Notice variant="info">
            <p className="font-medium">Brand guide needed</p>
            <p className="mt-1 text-sm opacity-90">
              Add these to your Brand Bible so the creative team can run with a clear voice
              and guardrails:
            </p>
            <ul className="mt-2 list-inside list-disc text-sm">
              {brandReadiness.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <Link
              href={`/clients/${clientId}/brand-bible`}
              className="mt-2 inline-block text-sm font-medium text-emerald-200 underline decoration-emerald-500/50"
            >
              Open Brand Bible →
            </Link>
          </Notice>
        </div>
      ) : null}

      {notice ? (
        <div className="mt-4">
          <Notice variant={notice.type}>{notice.text}</Notice>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        {!hasWorkflow ? (
          <div>
            <ActionButton
              pending={pending}
              onClick={() =>
                run(() => initializeWorkflowAction(clientId, briefId))
              }
            >
              Start campaign workspace
            </ActionButton>
          </div>
        ) : (
          <>
            {failedTasks.length > 0 ? (
              <div className="rounded-lg border border-red-500/35 bg-red-950/35 px-3 py-3">
                <p className="text-sm font-medium text-red-100">Needs attention</p>
                <ul className="mt-2 space-y-2 text-xs text-red-100/85">
                  {failedTasks.map((t) => (
                    <li key={t.id}>
                      <span className="font-medium text-red-50">
                        {STAGE_LABELS[t.stage]}
                      </span>
                      {t.lastFailureType ? (
                        <span className="ml-1 text-red-200/70">({t.lastFailureType})</span>
                      ) : null}
                      {t.lastFailureReason ? (
                        <p className="mt-0.5 text-red-100/80">{t.lastFailureReason}</p>
                      ) : (
                        <p className="mt-0.5 text-red-200/70">
                          We couldn&apos;t produce a valid output — try again, then continue.
                        </p>
                      )}
                      <div className="mt-2">
                        <ActionButton
                          pending={pending}
                          variant="light"
                          onClick={() =>
                            run(() => retryTaskGenerationAction(clientId, briefId, t.id))
                          }
                        >
                          Try again
                        </ActionButton>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <ActionButton
                pending={pending}
                disabled={
                  nextExecutableCount === 0 ||
                  failedTasks.length > 0 ||
                  (!brandReadiness.ok &&
                    nextExecutableStage != null &&
                    nextExecutableStage !== "BRIEF_INTAKE" &&
                    nextExecutableStage !== "EXPORT")
                }
                onClick={() =>
                  run(() => executeNextTaskAction(clientId, briefId))
                }
              >
                {primaryActionLabel(nextExecutableStage)}
              </ActionButton>
              <FieldHint>
                Moves the work forward in order. Brand guide must be complete before AI
                stages.
              </FieldHint>
            </div>

            {reviewTaskId ? (
              <div className="border-t border-zinc-800 pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Your decision</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      <span className="font-medium text-zinc-300">
                        {reviewStageLabel}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs font-medium text-amber-200/90">
                    Awaiting you
                  </span>
                </div>

                <div className="mt-3">
                  <Label htmlFor="reviewerLabel">Reviewer name (optional)</Label>
                  <input
                    ref={reviewerRef}
                    id="reviewerLabel"
                    type="text"
                    placeholder="e.g. Jordan — stored on review records"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/30"
                  />
                  <FieldHint>
                    Used for attribution until full auth exists.
                  </FieldHint>
                </div>

                <div className="mt-4 space-y-3">
                  {reviewApproveGate && !reviewApproveGate.structuralOk ? (
                    <Notice variant="error">
                      <p className="font-medium">Cannot approve — invalid output</p>
                      <p className="mt-1 text-sm opacity-90">
                        {reviewApproveGate.structuralMessage}
                      </p>
                    </Notice>
                  ) : null}
                  {reviewApproveGate?.qualityBlocked ? (
                    <Notice variant="info">
                      <p className="font-medium">Quality gate</p>
                      <p className="mt-1 text-sm opacity-90">
                        {reviewApproveGate.qualityReasons.join(" ")} Regenerate, or approve with
                        override below (not recommended).
                      </p>
                    </Notice>
                  ) : null}
                  <div>
                    <Label htmlFor="approveFeedback">
                      Approval note (optional)
                    </Label>
                    <Textarea
                      ref={approveNoteRef}
                      id="approveFeedback"
                      rows={2}
                      placeholder="Optional context for the record"
                    />
                  </div>
                  {reviewApproveGate?.qualityBlocked && reviewApproveGate.structuralOk ? (
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-amber-100/90">
                      <input
                        type="checkbox"
                        checked={approveAnyway}
                        onChange={(e) => setApproveAnyway(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-600"
                      />
                      <span>
                        Approve anyway (not recommended) — bypasses weak / regen-recommended
                        quality signals.
                      </span>
                    </label>
                  ) : null}
                  <div title={approveTooltip}>
                    <ActionButton
                      pending={pending}
                      disabled={approveDisabled}
                      onClick={() =>
                        run(() =>
                          approveTaskAction(
                            clientId,
                            briefId,
                            reviewTaskId,
                            approveNoteRef.current?.value?.trim() || undefined,
                            reviewerRef.current?.value?.trim() || undefined,
                            approveAnyway,
                          ),
                        )
                      }
                    >
                      Lock this in
                    </ActionButton>
                  </div>
                </div>

                <div className="mt-6 border-t border-zinc-800 pt-4">
                  <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Refine
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Send this back with clear direction so the next pass lands closer.
                  </p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor="revisionFeedback">
                        Revision feedback (required)
                      </Label>
                      <Textarea
                        ref={revisionRef}
                        id="revisionFeedback"
                        rows={4}
                        placeholder="What must change before this can ship?"
                      />
                    </div>
                    <ActionButton
                      pending={pending}
                      variant="danger"
                      onClick={() => {
                        const feedback =
                          revisionRef.current?.value?.trim() ?? "";
                        if (!feedback) {
                          setNotice({
                            type: "error",
                            text: "Revision feedback is required.",
                          });
                          return;
                        }
                        run(() =>
                          requestRevisionAction(
                            clientId,
                            briefId,
                            reviewTaskId,
                            feedback,
                            reviewerRef.current?.value?.trim() || undefined,
                          ),
                        );
                      }}
                    >
                      Refine
                    </ActionButton>
                  </div>
                </div>
              </div>
            ) : null}

            {reviseTaskId ? (
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-sm font-medium text-zinc-100">Refine in progress</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  <span className="font-medium">
                    {stageLabelForTaskId(reviseTaskId, timelineTasks)}
                  </span>{" "}
                  — reset when you&apos;re ready, then generate again.
                </p>
                <div className="mt-3">
                  <ActionButton
                    pending={pending}
                    variant="light"
                    onClick={() =>
                      run(() =>
                        resetTaskReadyAction(clientId, briefId, reviseTaskId),
                      )
                    }
                  >
                    Ready to regenerate
                  </ActionButton>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
