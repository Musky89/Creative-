"use server";

import { revalidatePath } from "next/cache";
import type { ServiceBlueprintTemplateType } from "@/generated/prisma/client";
import { upsertServiceBlueprint } from "@/server/domain/service-blueprint";
import type { FormState } from "./brand-bible";

const TEMPLATES: ServiceBlueprintTemplateType[] = [
  "FULL_PIPELINE",
  "CAMPAIGN_SPRINT",
  "RETAINER_MONTHLY",
  "CUSTOM",
];

export async function saveServiceBlueprintFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) return { error: "Missing client." };
  return saveServiceBlueprintAction(clientId, formData);
}

export async function saveServiceBlueprintAction(
  clientId: string,
  formData: FormData,
) {
  const templateType = String(formData.get("templateType") ?? "") as ServiceBlueprintTemplateType;
  const qualityThreshold = Number(formData.get("qualityThreshold"));
  const ar = formData.get("approvalRequired");
  const approvalRequired = ar === "on";
  const activeServicesRaw = String(formData.get("activeServices") ?? "");

  if (!TEMPLATES.includes(templateType)) {
    return { error: "Invalid template type." };
  }
  if (Number.isNaN(qualityThreshold) || qualityThreshold < 0 || qualityThreshold > 1) {
    return { error: "Quality threshold must be a number between 0 and 1." };
  }

  const activeServices = activeServicesRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  await upsertServiceBlueprint(clientId, {
    templateType,
    activeServices,
    qualityThreshold,
    approvalRequired,
  });

  revalidatePath(`/clients/${clientId}`);
  return { ok: true as const };
}
