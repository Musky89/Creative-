import type { PrismaClient } from "@/generated/prisma/client";

export type TrainingGuidanceResult = {
  trainingQuality: "Strong" | "Medium" | "Weak";
  lines: string[];
};

function uniqRoughStyleKey(prompt: string): string {
  const t = prompt.slice(0, 80).toLowerCase().replace(/\s+/g, " ");
  return t;
}

/**
 * Founder-facing guidance before “Train Brand Visual Style”.
 * Uses only heuristics over stored assets — no extra API calls.
 */
export async function generateTrainingGuidance(
  db: PrismaClient,
  clientId: string,
  visualAssetIds: string[],
): Promise<TrainingGuidanceResult> {
  const lines: string[] = [];
  const n = visualAssetIds.length;

  if (n < 8) {
    lines.push(
      `Pick at least 8 strong frames you would ship (you have ${n} selected). More examples teach the system more reliably.`,
    );
  }

  const assets = await db.visualAsset.findMany({
    where: {
      id: { in: visualAssetIds },
      clientId,
      status: "COMPLETED",
      founderRejected: false,
    },
    include: {
      review: true,
    },
  });

  if (assets.length !== visualAssetIds.length) {
    lines.push("Some selected images are missing or not usable — refresh and re-select.");
  }

  const prompts = assets.map((a) => uniqRoughStyleKey(a.promptUsed));
  const uniquePromptRoots = new Set(prompts);
  if (uniquePromptRoots.size <= 2 && n >= 6) {
    lines.push(
      "These frames look very similar — the system may over-focus on one look. Add variety (lighting, distance, context) if you can.",
    );
  }

  let lowRealism = 0;
  let illustrationCue = 0;
  for (const a of assets) {
    const ev = a.review?.evaluation;
    if (ev && typeof ev === "object") {
      const o = ev as Record<string, unknown>;
      const rs = typeof o.realismScore === "number" ? o.realismScore : null;
      if (rs != null && rs < 0.5) lowRealism += 1;
      const p = (a.promptUsed + " " + String(o.summary ?? "")).toLowerCase();
      if (/\b(illustrat|vector|cartoon|3d render|cgi)\b/.test(p)) illustrationCue += 1;
    }
  }
  if (lowRealism >= Math.ceil(assets.length * 0.4)) {
    lines.push(
      "Several picks score low on realism — prefer real-world photography so future outputs feel like campaigns, not renders.",
    );
  }
  if (illustrationCue >= 2) {
    lines.push(
      "Mixing illustration or heavy CGI cues with photography can confuse the system. Favor one visual world per training set.",
    );
  }

  const profile = await db.brandVisualProfile.findUnique({ where: { clientId } });
  const neg = profile?.negativeTraits;
  if (Array.isArray(neg) && neg.length > 4) {
    lines.push(
      "Your brand already tracks a few visual pitfalls — this training should reinforce what you like, not repeat what you’ve rejected.",
    );
  }

  if (lines.length === 0) {
    lines.push("Solid set — you’re teaching a clear, consistent look.");
  }

  let trainingQuality: TrainingGuidanceResult["trainingQuality"] = "Strong";
  if (n < 8 || uniquePromptRoots.size <= 2 || lowRealism >= 3 || illustrationCue >= 2) {
    trainingQuality = "Weak";
  } else if (n < 10 || uniquePromptRoots.size <= 4 || lowRealism >= 1) {
    trainingQuality = "Medium";
  }

  return { trainingQuality, lines: lines.slice(0, 8) };
}
