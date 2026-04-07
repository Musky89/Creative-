"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/server/db/prisma";
import {
  createBrief,
  updateBrief,
  type BriefFormInput,
} from "@/server/domain/briefs";
import type { FormState } from "./brand-bible";
import type { BriefEngagementType } from "@/generated/prisma/client";
import { CREATIVE_WORKSTREAMS } from "@/lib/workflow/brief-work-plan";

const ENGAGEMENT_TYPES: BriefEngagementType[] = [
  "CAMPAIGN",
  "BRAND_IDENTITY",
  "CONTENT_SYSTEM",
  "PRODUCT_LAUNCH",
  "ALWAYS_ON_SOCIAL",
  "RETAIL_PROMOTION",
  "EDITORIAL_PRINT",
  "OOH",
  "TVC_FILM",
  "CREATIVE_STRATEGY_ONLY",
  "CUSTOM",
];

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
  const presetDeliverables = formData
    .getAll("deliverablePresets")
    .map((x) => String(x).trim().toUpperCase())
    .filter(Boolean);
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

  const engagementRaw = String(formData.get("engagementType") ?? "CAMPAIGN").trim();
  const engagementType = ENGAGEMENT_TYPES.includes(engagementRaw as BriefEngagementType)
    ? (engagementRaw as BriefEngagementType)
    : "CUSTOM";

  const wsSet = new Set(CREATIVE_WORKSTREAMS.map((w) => w.toUpperCase()));
  const workstreams = formData
    .getAll("workstreams")
    .map((x) => String(x).trim().toUpperCase())
    .filter((w) => wsSet.has(w));

  let identityWorkflowEnabled =
    formData.get("identityWorkflowEnabled") === "on" ||
    formData.get("identityWorkflowEnabled") === "true";
  if (engagementType === "BRAND_IDENTITY") {
    identityWorkflowEnabled = true;
  }

  return {
    title,
    businessObjective,
    communicationObjective,
    targetAudience,
    keyMessage,
    deliverablesRequested: [
      ...new Set([...presetDeliverables, ...lines(deliverablesRaw)]),
    ],
    engagementType,
    workstreams,
    tone,
    constraints: lines(constraintsRaw),
    deadline,
    identityWorkflowEnabled,
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
  await getPrisma().brief.update({
    where: { id: briefId, clientId },
    data: {
      onboardingSource: "manual",
      aiOnboardingNeedsReview: false,
    },
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/briefs/${briefId}/edit`);
  revalidatePath(`/clients/${clientId}/briefs/${briefId}/studio`);
  return { ok: true as const };
}

