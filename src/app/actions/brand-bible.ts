"use server";

import { revalidatePath } from "next/cache";
import { upsertBrandBible } from "@/server/domain/brand-bible";

export type FormState = { error?: string } | { ok: true } | null;

export async function saveBrandBibleFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) return { error: "Missing client." };
  return saveBrandBibleAction(clientId, formData);
}

export async function saveBrandBibleAction(clientId: string, formData: FormData) {
  const positioning = String(formData.get("positioning") ?? "").trim();
  const targetAudience = String(formData.get("targetAudience") ?? "").trim();
  const toneOfVoice = String(formData.get("toneOfVoice") ?? "").trim();
  const messagingPillarsRaw = String(formData.get("messagingPillars") ?? "");
  const visualIdentityRaw = String(formData.get("visualIdentity") ?? "");
  const channelGuidelinesRaw = String(formData.get("channelGuidelines") ?? "");
  const mandatoryInclusionsRaw = String(formData.get("mandatoryInclusions") ?? "");
  const thingsToAvoidRaw = String(formData.get("thingsToAvoid") ?? "");

  if (!positioning || !targetAudience || !toneOfVoice) {
    return { error: "Positioning, target audience, and tone of voice are required." };
  }

  const lines = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  await upsertBrandBible(clientId, {
    positioning,
    targetAudience,
    toneOfVoice,
    messagingPillars: lines(messagingPillarsRaw),
    visualIdentity: lines(visualIdentityRaw),
    channelGuidelines: lines(channelGuidelinesRaw),
    mandatoryInclusions: lines(mandatoryInclusionsRaw),
    thingsToAvoid: lines(thingsToAvoidRaw),
  });

  revalidatePath(`/clients/${clientId}`);
  return { ok: true as const };
}
