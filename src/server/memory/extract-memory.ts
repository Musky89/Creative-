/**
 * Derive compact summaries + JSON attributes for BrandMemory rows.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function tokenizeKeywords(text: string, max = 12): string[] {
  const t = text.toLowerCase();
  const words = t.split(/[^\w]+/).filter((w) => w.length > 3);
  const stop = new Set([
    "this", "that", "with", "from", "have", "been", "were", "they", "their", "which", "would", "could", "should", "about", "into", "through", "after", "before", "other", "than", "when", "where", "what", "your", "brand", "work", "concept", "copy", "visual",
  ]);
  const counts = new Map<string, number>();
  for (const w of words) {
    if (stop.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

export type MemoryExtraction = {
  summary: string;
  attributes: Record<string, unknown>;
};

export function extractConceptMemory(args: {
  concept: Record<string, unknown>;
  outcome: "APPROVED" | "REJECTED" | "SELECTED";
  judgeReason?: string | null;
}): MemoryExtraction {
  const fw = String(args.concept.frameworkId ?? "").trim() || null;
  const name = String(args.concept.conceptName ?? "Route").trim();
  const hook = String(args.concept.hook ?? "");
  const distinct = String(args.concept.distinctivenessVsCategory ?? "");
  const text = [hook, distinct, args.judgeReason ?? ""].join(" ");
  const keywords = tokenizeKeywords(text, 10);

  const summary =
    args.outcome === "REJECTED"
      ? clip(
          fw
            ? `${name} (${fw}) rejected${args.judgeReason ? ` — ${args.judgeReason}` : ""}`
            : `${name} rejected${args.judgeReason ? ` — ${args.judgeReason}` : ""}`,
          220,
        )
      : clip(
          fw
            ? `${name}: ${fw} framework selected — strong route for this brand.`
            : `${name}: concept route approved.`,
          220,
        );

  return {
    summary,
    attributes: {
      conceptName: name,
      frameworkId: fw,
      hookSnippet: clip(hook, 160),
      keywords,
      structureHints:
        args.outcome === "REJECTED"
          ? ["rejected_concept_route"]
          : ["selected_concept_route"],
    },
  };
}

export function extractVisualMemory(args: {
  spec: Record<string, unknown>;
  asset?: {
    promptUsed?: string | null;
    autoRejected?: boolean;
    founderRejected?: boolean;
    evaluation?: Record<string, unknown> | null;
  } | null;
  outcome: "APPROVED" | "REJECTED";
}): MemoryExtraction {
  const fw = String(args.spec.frameworkUsed ?? "").trim() || null;
  const mood = String(args.spec.mood ?? "");
  const lighting = String(args.spec.lightingDirection ?? "");
  const texture = String(args.spec.textureDirection ?? "");
  const avoidList = Array.isArray(args.spec.avoidList)
    ? (args.spec.avoidList as unknown[]).map((x) => String(x)).slice(0, 8)
    : [];
  const ev = args.asset?.evaluation;
  const slop =
    ev && typeof ev.slopScore === "number"
      ? ev.slopScore
      : ev && isRecord(ev) && typeof (ev as { slopScore?: number }).slopScore === "number"
        ? (ev as { slopScore: number }).slopScore
        : null;
  const realism =
    ev && typeof ev.realismScore === "number" ? ev.realismScore : null;

  const visualTraits: string[] = [];
  if (mood) visualTraits.push(`mood:${clip(mood, 40)}`);
  if (lighting) visualTraits.push(`light:${clip(lighting, 40)}`);
  if (texture) visualTraits.push(`texture:${clip(texture, 40)}`);
  if (args.asset?.autoRejected) visualTraits.push("auto_filtered");
  if (slop != null) visualTraits.push(`slopScore:${slop.toFixed(2)}`);
  if (realism != null) visualTraits.push(`realism:${realism.toFixed(2)}`);

  const summary =
    args.outcome === "APPROVED"
      ? clip(
          fw
            ? `Visual direction (${fw}) approved — ${clip(mood || "on-brief look", 80)}`
            : "Visual direction approved.",
          220,
        )
      : clip(
          args.asset?.autoRejected
            ? `Visual variant rejected (quality filter)${slop != null ? ` — slop ${slop.toFixed(2)}` : ""}`
            : fw
              ? `Visual / frame rejected for ${fw} direction`
              : "Visual asset rejected.",
          220,
        );

  return {
    summary,
    attributes: {
      frameworkId: fw,
      moodSnippet: clip(mood, 120),
      lightingSnippet: clip(lighting, 120),
      textureSnippet: clip(texture, 120),
      avoidList,
      visualTraits,
      promptSnippet: args.asset?.promptUsed
        ? clip(String(args.asset.promptUsed), 200)
        : undefined,
    },
  };
}

export function extractCopyMemory(args: {
  copy: Record<string, unknown>;
  outcome: "APPROVED" | "REJECTED";
}): MemoryExtraction {
  const fw = String(args.copy.frameworkUsed ?? "").trim() || null;
  const headlines = Array.isArray(args.copy.headlineOptions)
    ? (args.copy.headlineOptions as unknown[]).map((x) => String(x))
    : [];
  const bodies = Array.isArray(args.copy.bodyCopyOptions)
    ? (args.copy.bodyCopyOptions as unknown[]).map((x) => String(x))
    : [];
  const blob = [...headlines, ...bodies].join("\n");
  const keywords = tokenizeKeywords(blob, 12);

  const summary =
    args.outcome === "APPROVED"
      ? clip(
          fw
            ? `Copy pack approved (${fw}) — ${headlines[0] ? clip(headlines[0]!, 70) : "headlines locked"}`
            : "Copy pack approved.",
          220,
        )
      : clip("Copy stage sent back for revision — tighten voice and proof.", 220);

  return {
    summary,
    attributes: {
      frameworkId: fw,
      headlineCount: headlines.length,
      keywords,
      toneMarkers: keywords.slice(0, 6),
    },
  };
}

/** One strategic angle after judge merge (primary / alternate). */
export function extractStrategyAngleMemory(args: {
  strategy: Record<string, unknown>;
  angle: Record<string, unknown>;
  isPrimary: boolean;
}): MemoryExtraction {
  const fw = String(args.angle.frameworkId ?? "").trim() || null;
  const angleText = String(args.angle.angle ?? "").trim();
  const cc = isRecord(args.strategy.campaignCore)
    ? args.strategy.campaignCore
    : null;
  const blob = [
    angleText,
    String(args.strategy.insight ?? ""),
    String(args.strategy.proposition ?? ""),
    cc ? String(cc.singleLineIdea ?? "") : "",
    cc ? String(cc.emotionalTension ?? "") : "",
    cc ? String(cc.visualNarrative ?? "") : "",
  ].join(" ");
  const keywords = tokenizeKeywords(blob, 10);

  const summary = args.isPrimary
    ? clip(
        fw
          ? `Primary strategic angle (${fw}) — ${clip(angleText || "selected direction", 100)}`
          : clip(`Primary strategic angle — ${angleText || "selected"}`, 220),
        220,
      )
    : clip(
        fw
          ? `Alternate strategic angle (${fw}) — ${clip(angleText || "backup route", 100)}`
          : clip(`Alternate strategic angle — ${angleText || "backup"}`, 220),
        220,
      );

  return {
    summary,
    attributes: {
      frameworkId: fw,
      angleSnippet: clip(angleText, 200),
      keywords,
      structureHints: args.isPrimary
        ? ["primary_strategic_angle"]
        : ["alternate_strategic_angle"],
      campaignCoreSnippet: cc
        ? clip(String(cc.singleLineIdea ?? ""), 120)
        : undefined,
    },
  };
}

export function extractStrategyMemory(args: {
  strategy: Record<string, unknown>;
  outcome: "APPROVED" | "REJECTED";
}): MemoryExtraction {
  const angles = Array.isArray(args.strategy.strategicAngles)
    ? (args.strategy.strategicAngles as unknown[])
    : [];
  const fwIds = angles
    .map((a) => (isRecord(a) ? String(a.frameworkId ?? "").trim() : ""))
    .filter(Boolean);
  const cc = isRecord(args.strategy.campaignCore)
    ? args.strategy.campaignCore
    : null;
  const blob = [
    String(args.strategy.insight ?? ""),
    String(args.strategy.proposition ?? ""),
    cc ? String(cc.singleLineIdea ?? "") : "",
    cc ? String(cc.emotionalTension ?? "") : "",
    cc ? String(cc.visualNarrative ?? "") : "",
    ...angles.map((a) => (isRecord(a) ? String(a.angle ?? "") : "")),
  ].join(" ");
  const keywords = tokenizeKeywords(blob, 10);

  const summary =
    args.outcome === "APPROVED"
      ? clip(
          fwIds.length
            ? `Strategy approved — frameworks used: ${fwIds.slice(0, 4).join(", ")}`
            : "Strategy approved.",
          220,
        )
      : clip("Strategy revision requested — re-anchor insight and angles.", 220);

  return {
    summary,
    attributes: {
      frameworkIds: fwIds,
      keywords,
      structureHints: ["strategy_angles"],
    },
  };
}

export function extractCampaignPatternMemory(args: {
  format: string;
  variantLabel: string;
  headline: string;
  ctaText?: string | null;
  logoUrl?: string | null;
}): MemoryExtraction {
  const hasLogo = Boolean(args.logoUrl?.trim());
  const summary = clip(
    `Finished campaign layout (${args.format}) — ${clip(args.headline, 80)}${hasLogo ? " · with logo" : ""}`,
    220,
  );
  return {
    summary,
    attributes: {
      outputFormat: args.format,
      variantLabel: args.variantLabel,
      headlineSnippet: clip(args.headline, 160),
      ctaSnippet: args.ctaText?.trim()
        ? clip(args.ctaText.trim(), 120)
        : undefined,
      hasLogo,
      structureHints: ["composed_final_output"],
    },
  };
}

export function extractPipelineFailureMemory(args: {
  stageLabel: string;
  failureType: string;
  failureReason: string;
}): MemoryExtraction {
  const summary = clip(
    `Weak output filtered (${args.stageLabel}) — ${clip(args.failureReason, 140)}`,
    220,
  );
  return {
    summary,
    attributes: {
      pipelineFailureType: args.failureType,
      structureHints: ["pipeline_failure"],
    },
  };
}

export function extractBrandStyleTrainingMemory(args: {
  outcome: "APPROVED" | "FAILED";
  imageCount: number;
  errorMessage?: string | null;
}): MemoryExtraction {
  const summary =
    args.outcome === "APPROVED"
      ? clip(
          `Brand visual style updated from ${args.imageCount} reference images — future frames can match this look.`,
          220,
        )
      : clip(
          args.errorMessage?.trim()
            ? `Brand visual style teaching did not complete — ${clip(args.errorMessage.trim(), 140)}`
            : "Brand visual style teaching did not complete.",
          220,
        );

  return {
    summary,
    attributes: {
      imageCount: args.imageCount,
      structureHints: ["brand_visual_style_training"],
    },
  };
}

export function extractToneMemoryFromReviewReport(args: {
  report: Record<string, unknown>;
  outcome: "APPROVED" | "REJECTED";
}): MemoryExtraction {
  const qv = String(args.report.qualityVerdict ?? "");
  const bar = String(args.report.creativeBarVerdict ?? "");
  const lang = String(args.report.languageCompliance ?? "");
  const td = String(args.report.toneDistinctiveness ?? "");
  const rc = String(args.report.rhythmCompliance ?? "");
  const gen = isRecord(args.report.comparisonRankings)
    ? String(args.report.comparisonRankings.mostGeneric ?? "")
    : "";

  const summary =
    args.outcome === "APPROVED"
      ? clip(
          `Review approved — creative bar ${bar || "n/a"}, quality ${qv || "n/a"}`,
          220,
        )
      : clip(
          `Review flagged issues — language ${lang}, tone distinctiveness ${td || "n/a"}`,
          220,
        );

  return {
    summary,
    attributes: {
      qualityVerdict: qv,
      creativeBarVerdict: bar,
      languageCompliance: lang,
      toneDistinctiveness: td,
      rhythmCompliance: rc,
      mostGenericNote: gen ? clip(gen, 160) : undefined,
      keywords: tokenizeKeywords(
        [
          String(args.report.distinctivenessAssessment ?? ""),
          String(args.report.categoryClicheRisk ?? ""),
        ].join(" "),
        8,
      ),
    },
  };
}
