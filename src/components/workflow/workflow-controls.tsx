"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import {
  approveTaskAction,
  executeNextTaskAction,
  initializeWorkflowAction,
  requestRevisionAction,
  resetTaskReadyAction,
} from "@/app/actions/workflow";
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

export function WorkflowControls({
  clientId,
  briefId,
  hasWorkflow,
  nextExecutableCount,
  reviewTaskId,
  reviseTaskId,
}: {
  clientId: string;
  briefId: string;
  hasWorkflow: boolean;
  nextExecutableCount: number;
  reviewTaskId: string | null;
  reviseTaskId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const approveNoteRef = useRef<HTMLTextAreaElement>(null);
  const revisionRef = useRef<HTMLTextAreaElement>(null);

  const refresh = () => router.refresh();

  const run = async (fn: () => Promise<{ error?: string } | { ok: true } | void>) => {
    start(async () => {
      const r = await fn();
      if (r && typeof r === "object" && "error" in r && r.error) {
        alert(r.error);
        return;
      }
      refresh();
    });
  };

  return (
    <Card>
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Controls
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        All transitions run through the orchestrator on the server.
      </p>

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
                in one step). Requires an executable task.
              </FieldHint>
            </div>

            {reviewTaskId ? (
              <div className="border-t border-zinc-100 pt-4">
                <p className="text-sm font-medium text-zinc-800">
                  Review gate
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Task <span className="font-mono">{reviewTaskId}</span> is
                  awaiting your decision.
                </p>
                <div className="mt-3 space-y-3">
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
                        ),
                      )
                    }
                  >
                    Approve task
                  </ActionButton>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="revisionFeedback">
                      Request revision — feedback (required)
                    </Label>
                    <Textarea
                      ref={revisionRef}
                      id="revisionFeedback"
                      rows={3}
                      placeholder="What must change before this can ship?"
                    />
                  </div>
                  <ActionButton
                    pending={pending}
                    variant="danger"
                    onClick={() => {
                      const feedback = revisionRef.current?.value?.trim() ?? "";
                      if (!feedback) {
                        alert("Revision feedback is required.");
                        return;
                      }
                      run(() =>
                        requestRevisionAction(
                          clientId,
                          briefId,
                          reviewTaskId,
                          feedback,
                        ),
                      );
                    }}
                  >
                    Request revision
                  </ActionButton>
                </div>
              </div>
            ) : null}

            {reviseTaskId ? (
              <div className="border-t border-zinc-100 pt-4">
                <p className="text-sm font-medium text-zinc-800">
                  Revision loop
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Task <span className="font-mono">{reviseTaskId}</span> needs
                  another run. Reset to READY before executing again.
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
