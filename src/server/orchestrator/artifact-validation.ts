import type { ArtifactType } from "@/generated/prisma/client";
import { z } from "zod";
import type { CampaignCore } from "@/lib/campaign/campaign-core";
import {
  campaignCoreDriftIssues,
  strategyCampaignCoreCohesionIssues,
} from "@/lib/campaign/campaign-core";
import {
  conceptArtifactSchema,
  copyArtifactSchema,
  identityRoutesPackArtifactSchema,
  identityStrategyArtifactSchema,
  reviewReportArtifactSchema,
  strategyArtifactSchema,
  visualPromptPackageArtifactSchema,
  visualSpecArtifactSchema,
} from "@/lib/artifacts/contracts";

export type ArtifactFailureType =
  | "PLACEHOLDER"
  | "EMPTY"
  | "VALIDATION"
  | "QUALITY"
  | "UNKNOWN";

export type ArtifactValidationResult =
  | { ok: true }
  | { ok: false; type: ArtifactFailureType; message: string; zodIssues?: string };

function stripInternalKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_")) continue;
    out[k] = v;
  }
  return out;
}

function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

const intakeSummarySchema = z
  .object({
    summary: z.string().min(12),
    keyMessage: z.string().min(3),
  })
  .passthrough();

const exportArtifactSchema = z
  .object({
    exportStatus: z.string().min(1),
    finalVerdict: z.enum(["APPROVE", "REWORK"]),
    rationale: z.string().min(20),
    selectedCopyVariant: z.string().min(1),
  })
  .passthrough();

/**
 * Validates persisted artifact JSON for pipeline gates (complete → review, approve → unlock).
 */
export function validateArtifactContent(
  artifactType: ArtifactType,
  content: unknown,
  options?: { campaignCore?: CampaignCore | null },
): ArtifactValidationResult {
  if (content === null || content === undefined) {
    return { ok: false, type: "EMPTY", message: "Artifact content is missing." };
  }
  if (typeof content !== "object" || Array.isArray(content)) {
    return { ok: false, type: "EMPTY", message: "Artifact content must be an object." };
  }
  const raw = content as Record<string, unknown>;

  if (raw._agenticforceSource === "placeholder_fallback") {
    return {
      ok: false,
      type: "PLACEHOLDER",
      message: "Output used a fallback placeholder — not valid for progression.",
    };
  }
  if (
    artifactType !== "INTAKE_SUMMARY" &&
    raw._agenticforcePlaceholder === true
  ) {
    return {
      ok: false,
      type: "PLACEHOLDER",
      message: "Structured scaffold placeholder is not valid production output.",
    };
  }

  const stripped = stripInternalKeys(raw);
  if (isEmptyObject(stripped)) {
    return { ok: false, type: "EMPTY", message: "Artifact has no substantive fields." };
  }

  let schema: z.ZodType<unknown>;
  switch (artifactType) {
    case "INTAKE_SUMMARY":
      schema = intakeSummarySchema;
      break;
    case "STRATEGY":
      schema = strategyArtifactSchema;
      break;
    case "IDENTITY_STRATEGY":
      schema = identityStrategyArtifactSchema;
      break;
    case "IDENTITY_ROUTES_PACK":
      schema = identityRoutesPackArtifactSchema;
      break;
    case "CONCEPT":
      schema = conceptArtifactSchema;
      break;
    case "VISUAL_SPEC":
      schema = visualSpecArtifactSchema;
      break;
    case "VISUAL_PROMPT_PACKAGE":
      schema = visualPromptPackageArtifactSchema;
      break;
    case "COPY":
      schema = copyArtifactSchema;
      break;
    case "REVIEW_REPORT":
      schema = reviewReportArtifactSchema;
      break;
    case "EXPORT": {
      const badStatus = raw.exportStatus;
      if (
        badStatus === "PLACEHOLDER_READY" ||
        badStatus === "CREATIVE_DIRECTOR_SKIPPED"
      ) {
        return {
          ok: false,
          type: "PLACEHOLDER",
          message: `Export artifact is not a completed creative decision (${String(badStatus)}).`,
        };
      }
      const exp = exportArtifactSchema.safeParse(stripped);
      if (!exp.success) {
        return {
          ok: false,
          type: "VALIDATION",
          message: "Export artifact failed schema validation.",
          zodIssues: exp.error.issues.map((i) => i.message).join("; "),
        };
      }
      return { ok: true };
    }
    default:
      return { ok: false, type: "UNKNOWN", message: `Unknown artifact type: ${artifactType}` };
  }

  const parsed = schema.safeParse(stripped);
  if (!parsed.success) {
    return {
      ok: false,
      type: "VALIDATION",
      message: "Artifact failed schema validation.",
      zodIssues: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  if (artifactType === "STRATEGY") {
    const stratIssues = strategyCampaignCoreCohesionIssues(stripped);
    if (stratIssues.length > 0) {
      return {
        ok: false,
        type: "VALIDATION",
        message: `Campaign coherence: ${stratIssues[0]}`,
        zodIssues: stratIssues.join(" | "),
      };
    }
  }

  const core = options?.campaignCore ?? null;
  if (core) {
    const drift =
      artifactType === "CONCEPT"
        ? campaignCoreDriftIssues({
            artifactType: "CONCEPT",
            content: stripped,
            core,
          })
        : artifactType === "COPY"
          ? campaignCoreDriftIssues({
              artifactType: "COPY",
              content: stripped,
              core,
            })
          : artifactType === "VISUAL_SPEC"
            ? campaignCoreDriftIssues({
                artifactType: "VISUAL_SPEC",
                content: stripped,
                core,
              })
            : artifactType === "VISUAL_PROMPT_PACKAGE"
              ? campaignCoreDriftIssues({
                  artifactType: "VISUAL_PROMPT_PACKAGE",
                  content: stripped,
                  core,
                })
              : [];
    if (drift.length > 0) {
      return {
        ok: false,
        type: "VALIDATION",
        message: `Campaign coherence: output drifts from Campaign Core — ${drift[0]}`,
        zodIssues: drift.join(" | "),
      };
    }
  }

  return { ok: true };
}

/** True when artifact must not be approved without override / regen. */
export function reviewArtifactQualityBlocksApproval(content: unknown): {
  blocked: boolean;
  reasons: string[];
} {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return { blocked: false, reasons: [] };
  }
  const c = content as Record<string, unknown>;
  if (c._agenticforceSource === "placeholder_fallback") {
    return { blocked: true, reasons: ["Placeholder output cannot be approved."] };
  }
  const q = c._agenticforceQuality;
  if (q && typeof q === "object" && !Array.isArray(q)) {
    const o = q as Record<string, unknown>;
    if (o.stillWeakAfterRegen === true) {
      return {
        blocked: true,
        reasons: ["Quality gate: still weak after regeneration — retry or override."],
      };
    }
  }
  const stripped = stripInternalKeys(c);
  const rr = reviewReportArtifactSchema.safeParse(stripped);
  if (!rr.success) {
    return { blocked: false, reasons: [] };
  }
  const reasons: string[] = [];
  if (rr.data.qualityVerdict === "WEAK") {
    reasons.push("Brand Guardian quality verdict is WEAK.");
  }
  if (rr.data.regenerationRecommended === true) {
    reasons.push("Regeneration was recommended for this output.");
  }
  if (rr.data.narrativeCoherence === "DRIFT") {
    reasons.push("Brand Guardian: narrative drift vs Campaign Core.");
  }
  if (rr.data.toneCoherence === "DRIFT") {
    reasons.push("Brand Guardian: tone drift vs Campaign Core / Brand OS.");
  }
  if (rr.data.visualCoherence === "DRIFT") {
    reasons.push("Brand Guardian: visual drift vs Campaign Core / VISUAL_SPEC.");
  }
  return { blocked: reasons.length > 0, reasons };
}

export function formatValidationForLog(v: ArtifactValidationResult): string {
  if (v.ok) return "valid";
  return `${v.type}: ${v.message}${v.zodIssues ? ` (${v.zodIssues})` : ""}`;
}
