import type { WorkflowStage } from "@/generated/prisma/client";
import type { TaskAgentContext } from "@/server/agents/context";
import {
  CANON_FRAMEWORKS,
  type CreativeFramework,
  getFrameworksByIds,
} from "@/lib/canon/frameworks";
import {
  loadClientPerformanceMap,
  scoreFrameworkPerformance,
} from "./framework-scoring";

function briefHaystack(ctx: TaskAgentContext): string {
  return [
    ctx.brief.title,
    ctx.brief.businessObjective,
    ctx.brief.communicationObjective,
    ctx.brief.targetAudience,
    ctx.brief.keyMessage,
    ctx.brief.tone,
    ctx.brief.deliverablesSummary,
    ctx.brief.constraintsSummary,
    ctx.clientIndustry,
  ]
    .join(" ")
    .toLowerCase();
}

function has(hay: string, ...words: string[]): boolean {
  return words.some((w) => hay.includes(w));
}

/**
 * Pure heuristic framework ids (pre-performance). Same logic as before.
 */
export function getHeuristicFrameworkIds(
  stage: WorkflowStage,
  context: TaskAgentContext,
): string[] {
  const hay = briefHaystack(context);
  const tone = context.brief.tone.toLowerCase();

  if (stage === "BRIEF_INTAKE" || stage === "EXPORT") {
    return [];
  }

  if (stage === "STRATEGY") {
    const ids: string[] = [];
    if (has(hay, "premium", "luxury", "elegant", "craft")) {
      ids.push("minimalist-premium", "material-as-emotion");
    }
    if (has(hay, "trust", "compliance", "security", "enterprise", "b2b", "regulated")) {
      ids.push("authority-proof");
    }
    if (has(hay, "launch", "new", "introducing", "first")) {
      ids.push("unexpected-contrast", "transformation");
    }
    if (has(hay, "community", "culture", "movement", "moment", "generation")) {
      ids.push("cultural-relevance", "aspirational-identity");
    }
    if (has(tone, "bold", "punchy", "disrupt")) {
      ids.push("problem-agitation", "unexpected-contrast");
    }
    const dedup = [...new Set(ids)];
    const picked =
      dedup.length >= 2
        ? dedup.slice(0, 4)
        : [
            "transformation",
            "problem-agitation",
            "aspirational-identity",
            "cultural-relevance",
          ];
    return picked.slice(0, 4);
  }

  if (stage === "CONCEPTING") {
    const ids: string[] = [];
    if (has(hay, "visual", "design", "look", "feel", "aesthetic", "packaging")) {
      ids.push("material-as-emotion", "sensory-immersion");
    } else {
      ids.push("unexpected-contrast", "sensory-immersion");
    }
    ids.push("transformation", "aspirational-identity");
    if (has(hay, "proof", "data", "study", "clinical", "certified")) {
      ids.push("authority-proof");
    } else {
      ids.push("cultural-relevance");
    }
    return [...new Set(ids)].slice(0, 4);
  }

  if (stage === "COPY_DEVELOPMENT") {
    const fromConcept = extractConceptFrameworkIds(context);
    if (fromConcept.length >= 2) {
      return fromConcept.slice(0, 4);
    }
    return ["hyper-functional", "problem-agitation", "authority-proof"];
  }

  if (stage === "REVIEW") {
    const fromConcept = extractConceptFrameworkIds(context);
    const base =
      fromConcept.length > 0
        ? [...fromConcept, "authority-proof"]
        : ["authority-proof", "minimalist-premium", "hyper-functional"];
    return [...new Set(base)].slice(0, 4);
  }

  return [];
}

function extractConceptFrameworkIds(context: TaskAgentContext): string[] {
  const concept = context.upstreamArtifacts.find(
    (u) => u.stage === "CONCEPTING" || u.type === "CONCEPT",
  );
  if (!concept || concept.content == null || typeof concept.content !== "object") {
    return [];
  }
  const c = concept.content as Record<string, unknown>;
  if (Array.isArray(c.concepts)) {
    const ids: string[] = [];
    for (const item of c.concepts) {
      if (item && typeof item === "object" && "frameworkId" in item) {
        const id = String((item as { frameworkId: unknown }).frameworkId).trim();
        if (id) ids.push(id);
      }
    }
    return ids;
  }
  if (typeof c.frameworkUsed === "string" && c.frameworkUsed.trim()) {
    return [c.frameworkUsed.trim()];
  }
  return [];
}

/**
 * Adaptive selection: rank by heuristic position + FrameworkPerformance.
 * Guarantees at least one heuristic-shortlist id in the final set (exploration / anti-overfit).
 */
export async function selectFrameworksForTask(
  stage: WorkflowStage,
  context: TaskAgentContext,
): Promise<CreativeFramework[]> {
  const heuristicIds = getHeuristicFrameworkIds(stage, context);

  if (heuristicIds.length === 0) {
    return [];
  }

  const pool = [...new Set([...heuristicIds, ...CANON_FRAMEWORKS.map((f) => f.id)])];
  const perfMap = await loadClientPerformanceMap(context.clientId);

  const scored = pool.map((id) => {
    const hIdx = heuristicIds.indexOf(id);
    const heuristicRank = hIdx >= 0 ? hIdx : null;
    const row = perfMap.get(id);
    const score = scoreFrameworkPerformance(row, heuristicRank);
    return { id, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const chosen = scored.slice(0, 4).map((s) => s.id);
  const hasHeuristic = chosen.some((id) => heuristicIds.includes(id));
  if (!hasHeuristic && heuristicIds[0]) {
    chosen.pop();
    chosen.unshift(heuristicIds[0]);
  }

  return getFrameworksByIds([...new Set(chosen)].slice(0, 4));
}

/** Format selected frameworks for system/user prompts. */
export function formatCanonForPrompt(frameworks: CreativeFramework[]): string {
  if (frameworks.length === 0) {
    return "(No Creative Canon frameworks selected for this stage.)";
  }
  return frameworks
    .map(
      (f, i) =>
        `### ${i + 1}. ${f.name} (\`${f.id}\`)\n` +
        `- **Category:** ${f.category}\n` +
        `- **Description:** ${f.description}\n` +
        `- **When to use:** ${f.whenToUse}\n` +
        `- **Structure to apply:** ${f.structure}\n` +
        `- **Example (style reference, do not copy verbatim):** ${f.example}`,
    )
    .join("\n\n");
}
