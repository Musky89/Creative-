import type {
  ArtifactType,
  PrivateEvaluationStage,
} from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { extractFrameworkIdsFromArtifactContent } from "@/server/canon/outcomes";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function extractStillWeakFromContent(content: unknown): boolean {
  if (!isRecord(content)) return false;
  const q = content._agenticforceQuality;
  if (!isRecord(q)) return false;
  return q.stillWeakAfterRegen === true;
}

export function artifactTypeForStage(
  stage: PrivateEvaluationStage,
): ArtifactType | null {
  switch (stage) {
    case "STRATEGY":
      return "STRATEGY";
    case "CONCEPT":
      return "CONCEPT";
    case "VISUAL_SPEC":
      return "VISUAL_SPEC";
    case "COPY":
      return "COPY";
    default:
      return null;
  }
}

export function buildIssueTags(args: {
  verdict: string;
  feltGeneric: boolean;
  brandAlignmentStrong: boolean | null;
  wouldUse: boolean | null;
  stillWeak: boolean;
}): string[] {
  const tags = new Set<string>();
  if (args.feltGeneric) tags.add("generic_language");
  if (args.stillWeak) tags.add("still_weak_after_regen");
  if (args.verdict === "FAIL") tags.add("verdict_fail");
  if (args.verdict === "NEEDS_WORK") tags.add("verdict_needs_work");
  if (args.brandAlignmentStrong === false) tags.add("weak_brand_alignment");
  if (args.wouldUse === false) tags.add("not_usable");
  return [...tags];
}

export function frameworkIdsFromArtifactContent(
  content: unknown,
): Prisma.InputJsonValue {
  return extractFrameworkIdsFromArtifactContent(content) as Prisma.InputJsonValue;
}
