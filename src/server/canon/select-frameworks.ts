import type { WorkflowStage } from "@/generated/prisma/client";
import type { TaskAgentContext } from "@/server/agents/context";
import {
  type CreativeFramework,
  getFrameworksByIds,
} from "@/lib/canon/frameworks";

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
 * Deterministic selection: 2–4 frameworks per stage from brief + brand signals.
 * No randomness; same inputs → same selection.
 */
export function selectFrameworksForTask(
  stage: WorkflowStage,
  context: TaskAgentContext,
): CreativeFramework[] {
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
        : ["transformation", "problem-agitation", "aspirational-identity", "cultural-relevance"];
    return getFrameworksByIds(picked.slice(0, 4));
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
    const unique = [...new Set(ids)];
    return getFrameworksByIds(unique.slice(0, 4));
  }

  if (stage === "COPY_DEVELOPMENT") {
    const fromConcept = extractConceptFrameworkIds(context);
    if (fromConcept.length >= 2) {
      return getFrameworksByIds(fromConcept.slice(0, 4));
    }
    return getFrameworksByIds([
      "hyper-functional",
      "problem-agitation",
      "authority-proof",
    ]);
  }

  if (stage === "REVIEW") {
    const fromConcept = extractConceptFrameworkIds(context);
    const base =
      fromConcept.length > 0
        ? [...fromConcept, "authority-proof"]
        : ["authority-proof", "minimalist-premium", "hyper-functional"];
    return getFrameworksByIds([...new Set(base)].slice(0, 4));
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
