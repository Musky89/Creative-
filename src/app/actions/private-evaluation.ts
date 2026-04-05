"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  PrivateEvaluationStage,
  PrivateEvaluationVerdict,
} from "@/generated/prisma/client";
import {
  createPrivateEvaluationSession,
  savePrivateEvaluationRecord,
} from "@/server/domain/private-evaluation";
import { ensureInternalTestBriefs } from "@/server/internal-test/ensure-test-briefs";

function clientPath(clientId: string) {
  return `/clients/${clientId}`;
}

function testingPath(clientId: string, briefId?: string, sessionId?: string) {
  const q = new URLSearchParams();
  if (briefId) q.set("briefId", briefId);
  if (sessionId) q.set("sessionId", sessionId);
  const qs = q.toString();
  return `/clients/${clientId}/internal-testing${qs ? `?${qs}` : ""}`;
}

const STAGES: PrivateEvaluationStage[] = [
  "STRATEGY",
  "IDENTITY_STRATEGY",
  "IDENTITY_ROUTES",
  "CONCEPT",
  "VISUAL_SPEC",
  "COPY",
  "VISUAL_ASSET",
];

const VERDICTS: PrivateEvaluationVerdict[] = ["PASS", "FAIL", "NEEDS_WORK"];

function parseStage(s: string): PrivateEvaluationStage | null {
  return STAGES.includes(s as PrivateEvaluationStage)
    ? (s as PrivateEvaluationStage)
    : null;
}

function parseVerdict(s: string): PrivateEvaluationVerdict | null {
  return VERDICTS.includes(s as PrivateEvaluationVerdict)
    ? (s as PrivateEvaluationVerdict)
    : null;
}

export type PrivateEvalFormState = { error?: string; ok?: string };

export async function ensureTestBriefsFormAction(
  _prev: PrivateEvalFormState | null,
  formData: FormData,
): Promise<PrivateEvalFormState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) return { error: "Missing client." };
  try {
    const r = await ensureInternalTestBriefs(clientId);
    revalidatePath(clientPath(clientId));
    revalidatePath(testingPath(clientId));
    return {
      ok: `Test briefs: ${r.created} created, ${r.existing} already present.`,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to ensure test briefs.",
    };
  }
}

export async function startEvalSessionAction(
  clientId: string,
  briefId: string,
  label?: string | null,
) {
  try {
    const s = await createPrivateEvaluationSession(clientId, briefId, label);
    revalidatePath(testingPath(clientId));
    return { ok: true as const, sessionId: s.id };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not start session.",
    };
  }
}

export async function startEvalSessionFormState(
  _prev: PrivateEvalFormState | null,
  formData: FormData,
): Promise<PrivateEvalFormState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const briefId = String(formData.get("briefId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;
  if (!clientId) return { error: "Missing client." };
  if (!briefId) return { error: "Pick a brief." };
  const r = await startEvalSessionAction(clientId, briefId, label);
  if ("error" in r && r.error) return { error: r.error };
  redirect(testingPath(clientId, briefId, r.sessionId));
}

export async function savePrivateEvaluationFormState(
  _prev: PrivateEvalFormState | null,
  formData: FormData,
): Promise<PrivateEvalFormState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const briefId = String(formData.get("briefId") ?? "").trim();
  const stage = parseStage(String(formData.get("stage") ?? ""));
  const verdict = parseVerdict(String(formData.get("verdict") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim() || null;
  const artifactId = String(formData.get("artifactId") ?? "").trim() || null;
  const visualAssetId =
    String(formData.get("visualAssetId") ?? "").trim() || null;
  const feltGeneric = formData.get("feltGeneric") === "on";
  const brandAlign = formData.get("brandAlignmentStrong");
  const brandAlignmentStrong =
    brandAlign === "yes" ? true : brandAlign === "no" ? false : null;
  const wu = formData.get("wouldUse");
  const wouldUse = wu === "yes" ? true : wu === "no" ? false : null;

  if (!clientId) {
    return { error: "Missing client." };
  }
  if (!briefId || !stage || !verdict) {
    return { error: "Brief, stage, and verdict are required." };
  }
  if (!notes) {
    return { error: "Notes are required (even one line helps later)." };
  }

  try {
    await savePrivateEvaluationRecord({
      clientId,
      briefId,
      sessionId,
      stage,
      verdict,
      notes,
      feltGeneric,
      brandAlignmentStrong,
      wouldUse,
      artifactId,
      visualAssetId,
    });
    revalidatePath(testingPath(clientId, briefId, sessionId ?? undefined));
    return { ok: "Saved." };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not save evaluation.",
    };
  }
}
