import type { PrismaClient, WorkflowStage } from "@/generated/prisma/client";
import {
  extractConceptMemory,
  extractCopyMemory,
  extractStrategyMemory,
  extractToneMemoryFromReviewReport,
  extractVisualMemory,
} from "./extract-memory";
import { recordBrandMemoryEvent } from "./brand-memory-service";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function winningConcept(content: Record<string, unknown>): Record<string, unknown> | null {
  const concepts = content.concepts;
  if (!Array.isArray(concepts)) return null;
  for (const c of concepts) {
    if (isRecord(c) && c.isSelected === true) return c;
  }
  const sel = content._agenticforceSelection;
  if (isRecord(sel)) {
    const wid = String(sel.winnerConceptId ?? "").trim();
    if (wid) {
      for (const c of concepts) {
        if (isRecord(c) && String(c.conceptId ?? "") === wid) return c;
      }
    }
  }
  return null;
}

export async function recordBrandMemoryOnArtifactApproval(
  db: PrismaClient,
  args: { clientId: string; stage: WorkflowStage; content: unknown },
): Promise<void> {
  if (!isRecord(args.content)) return;

  if (args.stage === "STRATEGY") {
    const ext = extractStrategyMemory({ strategy: args.content, outcome: "APPROVED" });
    const fws = ext.attributes.frameworkIds;
    const fw =
      Array.isArray(fws) && typeof fws[0] === "string" ? (fws[0] as string) : null;
    await recordBrandMemoryEvent(db, {
      clientId: args.clientId,
      type: "STRATEGY",
      frameworkId: fw,
      summary: ext.summary,
      attributes: ext.attributes,
      outcome: "APPROVED",
      strengthScore: 0.72,
    });
    return;
  }

  if (args.stage === "CONCEPTING") {
    // Winner + rejects already recorded when the judge runs at concept persist.
    return;
  }

  if (args.stage === "VISUAL_DIRECTION") {
    const ext = extractVisualMemory({ spec: args.content, asset: null, outcome: "APPROVED" });
    await recordBrandMemoryEvent(db, {
      clientId: args.clientId,
      type: "VISUAL",
      frameworkId: String(args.content.frameworkUsed ?? "").trim() || null,
      summary: ext.summary,
      attributes: ext.attributes,
      outcome: "APPROVED",
      strengthScore: 0.8,
    });
    return;
  }

  if (args.stage === "COPY_DEVELOPMENT") {
    const ext = extractCopyMemory({ copy: args.content, outcome: "APPROVED" });
    await recordBrandMemoryEvent(db, {
      clientId: args.clientId,
      type: "COPY",
      frameworkId: String(args.content.frameworkUsed ?? "").trim() || null,
      summary: ext.summary,
      attributes: ext.attributes,
      outcome: "APPROVED",
      strengthScore: 0.82,
    });
    return;
  }

  if (args.stage === "REVIEW") {
    const ext = extractToneMemoryFromReviewReport({
      report: args.content,
      outcome: "APPROVED",
    });
    const qv = String(args.content.qualityVerdict ?? "");
    const strength =
      qv === "STRONG" ? 0.9 : qv === "ACCEPTABLE" ? 0.65 : 0.5;
    await recordBrandMemoryEvent(db, {
      clientId: args.clientId,
      type: "TONE",
      frameworkId: null,
      summary: ext.summary,
      attributes: ext.attributes,
      outcome: "APPROVED",
      strengthScore: strength,
    });
  }
}

export async function recordBrandMemoryOnReviewRevisionRequested(
  db: PrismaClient,
  args: { clientId: string; stage: WorkflowStage; content: unknown },
): Promise<void> {
  if (!isRecord(args.content)) return;

  if (args.stage === "REVIEW") {
    const ext = extractToneMemoryFromReviewReport({
      report: args.content,
      outcome: "REJECTED",
    });
    await recordBrandMemoryEvent(db, {
      clientId: args.clientId,
      type: "TONE",
      frameworkId: null,
      summary: ext.summary,
      attributes: ext.attributes,
      outcome: "REJECTED",
      strengthScore: 0.55,
    });
    return;
  }

  if (args.stage === "STRATEGY") {
    const ext = extractStrategyMemory({ strategy: args.content, outcome: "REJECTED" });
    await recordBrandMemoryEvent(db, {
      clientId: args.clientId,
      type: "STRATEGY",
      frameworkId: null,
      summary: ext.summary,
      attributes: ext.attributes,
      outcome: "REJECTED",
      strengthScore: 0.5,
    });
    return;
  }

  if (args.stage === "CONCEPTING") {
    const w = winningConcept(args.content);
    const c = w ?? (Array.isArray(args.content.concepts) && isRecord(args.content.concepts[0])
      ? (args.content.concepts[0] as Record<string, unknown>)
      : null);
    if (!c) return;
    const ext = extractConceptMemory({ concept: c, outcome: "REJECTED" });
    await recordBrandMemoryEvent(db, {
      clientId: args.clientId,
      type: "CONCEPT",
      frameworkId: String(c.frameworkId ?? "").trim() || null,
      summary: ext.summary,
      attributes: ext.attributes,
      outcome: "REJECTED",
      strengthScore: 0.45,
    });
    return;
  }

  if (args.stage === "VISUAL_DIRECTION") {
    const ext = extractVisualMemory({
      spec: args.content,
      asset: null,
      outcome: "REJECTED",
    });
    await recordBrandMemoryEvent(db, {
      clientId: args.clientId,
      type: "VISUAL",
      frameworkId: String(args.content.frameworkUsed ?? "").trim() || null,
      summary: ext.summary,
      attributes: ext.attributes,
      outcome: "REJECTED",
      strengthScore: 0.48,
    });
    return;
  }

  if (args.stage === "COPY_DEVELOPMENT") {
    const ext = extractCopyMemory({ copy: args.content, outcome: "REJECTED" });
    await recordBrandMemoryEvent(db, {
      clientId: args.clientId,
      type: "COPY",
      frameworkId: String(args.content.frameworkUsed ?? "").trim() || null,
      summary: ext.summary,
      attributes: ext.attributes,
      outcome: "REJECTED",
      strengthScore: 0.48,
    });
  }
}
