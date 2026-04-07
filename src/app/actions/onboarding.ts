"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/server/domain/clients";
import { upsertBrandBible } from "@/server/domain/brand-bible";
import { upsertServiceBlueprint } from "@/server/domain/service-blueprint";
import { createBrief } from "@/server/domain/briefs";
import {
  generateOnboardingDraftLlm,
  mapDraftToBrandBibleInput,
  mapDraftToServiceBlueprint,
  mapOptionalBriefToInput,
  type OnboardingLlmDraft,
  type RoughOnboardingInput,
} from "@/server/onboarding/ai-brand-onboarding";
import { brandOsTasteEngineSchema } from "@/lib/brand/brand-os-taste";
import type { FormState } from "./brand-bible";

export type OnboardingDraftState =
  | FormState
  | { ok: true; draftJson: string }
  | null;

export async function generateOnboardingDraftAction(
  _prev: OnboardingDraftState,
  formData: FormData,
): Promise<OnboardingDraftState> {
  const input: RoughOnboardingInput = {
    brandName: String(formData.get("brandName") ?? "").trim(),
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    market: String(formData.get("market") ?? "").trim(),
    goal: String(formData.get("goal") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    includeBriefDraft: formData.get("includeBriefDraft") === "on",
  };

  if (!input.brandName || !input.description || !input.market || !input.goal) {
    return { error: "Brand name, description, market, and goal are required." };
  }

  const r = await generateOnboardingDraftLlm(input);
  if (!r.ok) return { error: r.error };

  return { ok: true as const, draftJson: JSON.stringify(r.draft) };
}

export async function applyOnboardingDraftCreateClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const brandName = String(formData.get("brandName") ?? "").trim();
  const draftJson = String(formData.get("draftJson") ?? "").trim();

  if (!brandName || !draftJson) {
    return { error: "Missing brand name or draft. Generate a draft first." };
  }

  let draft: OnboardingLlmDraft;
  try {
    draft = JSON.parse(draftJson) as OnboardingLlmDraft;
  } catch {
    return { error: "Invalid draft payload." };
  }

  const bb = mapDraftToBrandBibleInput(draft.brandBible);
  const taste = brandOsTasteEngineSchema.safeParse({
    languageDnaPhrasesUse: bb.languageDnaPhrasesUse,
    languageDnaPhrasesNever: bb.languageDnaPhrasesNever,
    languageDnaSentenceRhythm: bb.languageDnaSentenceRhythm,
    languageDnaHeadlinePatterns: bb.languageDnaHeadlinePatterns,
    languageDnaCtaPatterns: bb.languageDnaCtaPatterns,
    categoryTypicalBehavior: bb.categoryTypicalBehavior,
    categoryClichesToAvoid: bb.categoryClichesToAvoid,
    categoryDifferentiation: bb.categoryDifferentiation,
    tensionCoreContradiction: bb.tensionCoreContradiction,
    tensionEmotionalBalance: bb.tensionEmotionalBalance,
    tasteCloserThan: bb.tasteCloserThan,
    tasteShouldFeelLike: bb.tasteShouldFeelLike,
    tasteMustNotFeelLike: bb.tasteMustNotFeelLike,
    visualNeverLooksLike: bb.visualNeverLooksLike,
    visualCompositionTendencies: bb.visualCompositionTendencies,
    visualMaterialTextureDirection: bb.visualMaterialTextureDirection,
    visualLightingTendencies: bb.visualLightingTendencies,
  });
  if (!taste.success) {
    return { error: `Taste validation: ${taste.error.message}` };
  }

  const client = await createClient({
    name: brandName,
    industry: draft.industry,
    isDemoClient: false,
  });

  await upsertBrandBible(client.id, bb);
  await upsertServiceBlueprint(client.id, mapDraftToServiceBlueprint(draft.serviceBlueprint));

  if (draft.optionalBrief) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 45);
    await createBrief(
      client.id,
      mapOptionalBriefToInput(draft.optionalBrief, deadline),
    );
  }

  revalidatePath("/");
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}
