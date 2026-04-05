"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createBrief,
  updateBrief,
  type BriefFormInput,
} from "@/server/domain/briefs";
import type { FormState } from "./brand-bible";

function parseBriefForm(formData: FormData): BriefFormInput | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const businessObjective = String(formData.get("businessObjective") ?? "").trim();
  const communicationObjective = String(
    formData.get("communicationObjective") ?? "",
  ).trim();
  const targetAudience = String(formData.get("targetAudience") ?? "").trim();
  const keyMessage = String(formData.get("keyMessage") ?? "").trim();
  const tone = String(formData.get("tone") ?? "").trim();
  const deadlineStr = String(formData.get("deadline") ?? "").trim();
  const deliverablesRaw = String(formData.get("deliverablesRequested") ?? "");
  const constraintsRaw = String(formData.get("constraints") ?? "");

  if (
    !title ||
    !businessObjective ||
    !communicationObjective ||
    !targetAudience ||
    !keyMessage ||
    !tone ||
    !deadlineStr
  ) {
    return { error: "All primary brief fields are required." };
  }

  const deadline = new Date(deadlineStr);
  if (Number.isNaN(deadline.getTime())) {
    return { error: "Invalid deadline." };
  }

  const lines = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  return {
    title,
    businessObjective,
    communicationObjective,
    targetAudience,
    keyMessage,
    deliverablesRequested: lines(deliverablesRaw),
    tone,
    constraints: lines(constraintsRaw),
    deadline,
  };
}

export async function createBriefFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) return { error: "Missing client." };
  const parsed = parseBriefForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const brief = await createBrief(clientId, parsed);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}/briefs/${brief.id}/edit`);
}

export async function updateBriefFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const briefId = String(formData.get("briefId") ?? "").trim();
  if (!clientId || !briefId) return { error: "Missing brief or client." };
  const parsed = parseBriefForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  await updateBrief(briefId, clientId, parsed);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/briefs/${briefId}/edit`);
  revalidatePath(`/clients/${clientId}/briefs/${briefId}/studio`);
  return { ok: true as const };
}

