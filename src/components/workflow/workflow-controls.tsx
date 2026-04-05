"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  approveTaskAction,
  executeNextTaskAction,
  initializeWorkflowAction,
  requestRevisionAction,
  resetTaskReadyAction,
} from "@/app/actions/workflow";
import { STAGE_LABELS } from "@/lib/workflow-display";
import type { WorkflowStage } from "@/generated/prisma/client";
import { Card } from "@/components/ui/section";
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
      ? "bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
      : variant === "danger"
        ? "border border-red-200 bg-red-50 text-red-900 hover:bg-red-100 disabled:opacity-50"
        : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 disabled:opacity-50";
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : variant === "error"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-zinc-200 bg-zinc-50 text-zinc-800";
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

export function WorkflowControls({
  clientId,
  briefId,
  hasWorkflow,
  nextExecutableTaskIds,
  reviewTaskId,
  reviseTaskId,
  brandReadiness,
  timelineTasks,
}: {
  clientId: string;
  briefId: string;
  hasWorkflow: boolean;
  nextExecutableTaskIds: string[];
  reviewTaskId: string | null;
  reviseTaskId: string | null;
  brandReadiness: { ok: boolean; missing: string[] };
  timelineTasks: { id: string; stage: WorkflowStage }[];
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

  return (
    <Card>
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Controls
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        All transitions run through the orchestrator on the server.
      </p>

      {!brandReadiness.ok ? (
        <div className="mt-4">
          <Notice variant="info">
            <p className="font-medium">Brand Bible required for AI stages</p>
            <p className="mt-1 text-sm opacity-90">
              Complete the following before running Strategist, Creative Director, Art
              Director, Copywriter, or Brand Guardian tasks:
            </p>
            <ul className="mt-2 list-inside list-disc text-sm">
              {brandReadiness.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <Link
              href={`/clients/${clientId}/brand-bible`}
              className="mt-2 inline-block text-sm font-medium underline"
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
              Initialize workflow
            </ActionButton>
          </div>
        ) : (
          <>
            <div>
              <ActionButton
                pending={pending}
                disabled={nextExecutableCount === 0}
                onClick={() =>
                  run(() => executeNextTaskAction(clientId, briefId))
                }
              >
                Execute next task
              </ActionButton>
              <FieldHint>
                Runs the next READY task in pipeline order (starts and completes
                in one step). Brand Bible must be complete before agent stages.
              </FieldHint>
            </div>

            {reviewTaskId ? (
              <div className="border-t border-zinc-100 pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      Review gate
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      <span className="font-medium text-zinc-700">
                        {reviewStageLabel}
                      </span>
                      <span className="mx-1 text-zinc-300">·</span>
                      <span className="font-mono">{reviewTaskId}</span>
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80">
                    Awaiting your decision
                  </span>
                </div>

                <div className="mt-3">
                  <Label htmlFor="reviewerLabel">Reviewer name (optional)</Label>
                  <input
                    ref={reviewerRef}
                    id="reviewerLabel"
                    type="text"
                    placeholder="e.g. Jordan — stored on review records"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2"
                  />
                  <FieldHint>
                    Used for attribution until full auth exists.
                  </FieldHint>
                </div>

                <div className="mt-4 space-y-3">
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
                  <ActionButton
                    pending={pending}
                    onClick={() =>
                      run(() =>
                        approveTaskAction(
                          clientId,
                          briefId,
                          reviewTaskId,
                          approveNoteRef.current?.value?.trim() || undefined,
                          reviewerRef.current?.value?.trim() || undefined,
                        ),
                      )
                    }
                  >
                    Approve task
                  </ActionButton>
                </div>

                <div className="mt-6 border-t border-zinc-100 pt-4">
                  <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Request changes
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Sends the task back to revision. Be specific so the next run
                    is purposeful.
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
                      Request revision
                    </ActionButton>
                  </div>
                </div>
              </div>
            ) : null}

            {reviseTaskId ? (
              <div className="border-t border-zinc-100 pt-4">
                <p className="text-sm font-medium text-zinc-800">
                  Revision required
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  <span className="font-medium">
                    {stageLabelForTaskId(reviseTaskId, timelineTasks)}
                  </span>{" "}
                  — reset to READY, then execute again to regenerate.
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
                    Reset revised task to ready
                  </ActionButton>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}
