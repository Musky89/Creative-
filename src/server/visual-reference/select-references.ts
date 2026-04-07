import type { VisualSpecArtifact } from "@/lib/artifacts/contracts";
import type { BrandOperatingSystemContext } from "@/server/brand/brand-os-prompt";
import type { PrismaClient, VisualReference } from "@/generated/prisma/client";
import type { BrandVisualProfileForPrompt } from "@/server/visual-identity/merge-brand-visual-profile";

export type SelectedVisualReference = Pick<
  VisualReference,
  "id" | "label" | "category" | "imageUrl" | "metadata"
>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function refTags(ref: VisualReference): Set<string> {
  const m = ref.metadata;
  const tags = new Set<string>();
  tags.add(ref.label.toLowerCase());
  tags.add(ref.category.toLowerCase());
  if (isRecord(m)) {
    const raw = m.tags;
    if (Array.isArray(raw)) {
      for (const t of raw) tags.add(String(t).toLowerCase());
    }
    for (const k of ["mood", "composition", "lighting", "style", "region"] as const) {
      const v = m[k];
      if (typeof v === "string" && v.trim()) {
        for (const w of normTokens(v)) tags.add(w);
      }
    }
    const brandCues = m.brandCues;
    if (Array.isArray(brandCues)) {
      for (const t of brandCues) for (const w of normTokens(String(t))) tags.add(w);
    }
  }
  return tags;
}

/** Bias pool toward the correct demo client when name matches SA QSR harnesses. */
function clientNameAnchorTokens(clientName: string): Set<string> {
  const n = clientName.toLowerCase();
  const out = new Set<string>();
  if (n.includes("mcdonald")) {
    for (const w of [
      "mcdonalds_sa_demo",
      "mcdonald",
      "mcdonalds",
      "family",
      "bright",
      "playful",
      "golden",
      "happy",
    ]) {
      out.add(w);
    }
  }
  if (n.includes("kfc")) {
    for (const w of [
      "kfc_sa_demo",
      "kfc",
      "fried",
      "chicken",
      "crispy",
      "spicy",
      "moody",
      "contrast",
      "indulgent",
    ]) {
      out.add(w);
    }
  }
  return out;
}

function haystackFromSpec(
  spec: VisualSpecArtifact,
  brandOs: BrandOperatingSystemContext,
): Set<string> {
  const parts = [
    spec.composition,
    spec.lightingDirection,
    spec.mood,
    spec.emotionalTone,
    spec.imageStyle,
    spec.textureDirection,
    spec.colorDirection,
    spec.referenceLogic,
    spec.distinctivenessNotes,
    spec.referenceIntent ?? "",
    ...(spec.referenceStyleHints ?? []),
    brandOs.visualStyle,
    brandOs.compositionStyle,
    brandOs.lightingStyle,
    brandOs.textureFocus,
    brandOs.colorPhilosophy,
    brandOs.visualCompositionTendencies,
    brandOs.visualLightingTendencies,
    brandOs.visualMaterialTextureDirection,
    brandOs.categoryDifferentiation,
  ];
  const out = new Set<string>();
  for (const p of parts) {
    for (const w of normTokens(String(p))) out.add(w);
  }
  return out;
}

function memoryKeywordSets(
  rows: { outcome: string; summary: string; attributes: unknown }[],
): { approved: Set<string>; rejected: Set<string> } {
  const approved = new Set<string>();
  const rejected = new Set<string>();
  for (const r of rows) {
    const bag = r.outcome === "APPROVED" ? approved : rejected;
    for (const w of normTokens(r.summary)) bag.add(w);
    if (isRecord(r.attributes)) {
      const traits = r.attributes.visualTraits;
      if (Array.isArray(traits)) {
        for (const t of traits) {
          for (const w of normTokens(String(t))) bag.add(w);
        }
      }
      const kw = r.attributes.keywords;
      if (Array.isArray(kw)) {
        for (const t of kw) bag.add(String(t).toLowerCase());
      }
    }
  }
  return { approved, rejected };
}

/**
 * Deterministic reference pick: 2–5 rows, scored by spec/brand overlap + brand memory bias.
 */
function profileWordSets(profile: BrandVisualProfileForPrompt | null | undefined): {
  positive: Set<string>;
  negative: Set<string>;
  weight: number;
} {
  if (!profile) {
    return { positive: new Set(), negative: new Set(), weight: 0 };
  }
  const positive = new Set<string>();
  const negative = new Set<string>();
  const buckets = [
    ...profile.lightingPatterns,
    ...profile.compositionPatterns,
    ...profile.colorSignatures,
    ...profile.texturePatterns,
    ...profile.framingRules,
    ...profile.styleKeywords,
  ];
  for (const line of buckets) {
    for (const w of normTokens(line)) positive.add(w);
  }
  for (const line of profile.negativeTraits) {
    for (const w of normTokens(line)) negative.add(w);
  }
  const weight = Math.min(1, 0.35 + profile.confirmationCount * 0.08);
  return { positive, negative, weight };
}

export async function selectVisualReferences(
  db: PrismaClient,
  args: {
    clientId: string;
    /** When set, used to bias toward brand-scoped reference anchors (e.g. demo client names). */
    clientName?: string | null;
    spec: VisualSpecArtifact;
    brandOs: BrandOperatingSystemContext;
    brandVisualProfile?: BrandVisualProfileForPrompt | null;
    /** Optional founder image URLs — treated as high-priority pseudo-references (description-only in prompts). */
    extraImageUrls?: string[];
    minCount?: number;
    maxCount?: number;
  },
): Promise<SelectedVisualReference[]> {
  const minC = Math.min(5, Math.max(2, args.minCount ?? 2));
  const maxC = Math.min(5, Math.max(minC, args.maxCount ?? 5));

  const [globalRefs, clientRefs, memRows, clientRow] = await Promise.all([
    db.visualReference.findMany({ where: { clientId: null } }),
    db.visualReference.findMany({ where: { clientId: args.clientId } }),
    db.brandMemory.findMany({
      where: { clientId: args.clientId, type: "VISUAL" },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { outcome: true, summary: true, attributes: true },
    }),
    db.client.findUnique({
      where: { id: args.clientId },
      select: { name: true },
    }),
  ]);

  const poolAll = [...clientRefs, ...globalRefs];
  const seen = new Set<string>();
  const pool = poolAll.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  const hay = haystackFromSpec(args.spec, args.brandOs);
  const nameForBias = args.clientName?.trim() || clientRow?.name || "";
  const nameAnchors = clientNameAnchorTokens(nameForBias);
  for (const w of nameAnchors) hay.add(w);
  const { approved: memOk, rejected: memBad } = memoryKeywordSets(memRows);
  const prof = profileWordSets(args.brandVisualProfile ?? null);

  type Scored = { ref: VisualReference; score: number };
  const founderBoost = (args.extraImageUrls?.length ?? 0) > 0 ? 0.35 : 0;

  const scored: Scored[] = pool.map((ref) => {
    const tags = refTags(ref);
    let score = founderBoost;
    for (const w of hay) {
      if (tags.has(w)) score += 1.2;
    }
    if (nameAnchors.size && ref.clientId === args.clientId) {
      const anchor =
        isRecord(ref.metadata) && typeof ref.metadata.anchor === "string"
          ? ref.metadata.anchor
          : "";
      if (anchor && nameAnchors.has(anchor)) score += 3.5;
    }
    for (const w of tags) {
      if (hay.has(w)) score += 0.35;
    }
    for (const w of memOk) {
      if (tags.has(w)) score += 0.85;
    }
    for (const w of memBad) {
      if (tags.has(w)) score -= 1.1;
    }
    let profAlign = 0;
    let profConflict = 0;
    for (const w of tags) {
      if (prof.positive.has(w)) profAlign += 1;
      if (prof.negative.has(w)) profConflict += 1;
    }
    score += profAlign * 0.45 * prof.weight;
    score -= profConflict * 0.95 * prof.weight;
    if (ref.clientId === args.clientId) score += 2;
    return { ref, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const picked: SelectedVisualReference[] = scored
    .slice(0, maxC)
    .filter((s) => s.score > 0 || pool.length <= maxC)
    .map((s) => ({
      id: s.ref.id,
      label: s.ref.label,
      category: s.ref.category,
      imageUrl: s.ref.imageUrl,
      metadata: s.ref.metadata,
    }));

  if (picked.length < minC) {
    for (const s of scored) {
      if (picked.length >= minC) break;
      if (!picked.some((p) => p.id === s.ref.id)) {
        picked.push({
          id: s.ref.id,
          label: s.ref.label,
          category: s.ref.category,
          imageUrl: s.ref.imageUrl,
          metadata: s.ref.metadata,
        });
      }
    }
  }

  return picked.slice(0, maxC);
}

