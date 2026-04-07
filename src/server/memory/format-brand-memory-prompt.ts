import type { BrandMemoryPromptSlice } from "./brand-memory-service";

/**
 * Directive-style memory block — **bias**, not hard law (exploration still allowed).
 */
export function formatBrandMemorySection(slice: BrandMemoryPromptSlice | null): string {
  if (!slice) {
    return "";
  }

  const hasAny =
    slice.approvedLines.length > 0 ||
    slice.rejectedLines.length > 0 ||
    slice.preferredFrameworks.length > 0 ||
    slice.avoidPatterns.length > 0;

  if (!hasAny) return "";

  const lines: string[] = [
    "## BRAND MEMORY — LEARNED PREFERENCES (soft bias)",
    "",
    "These notes summarize **past founder and system decisions** for this client. **You MUST NOT treat them as rigid rules** — they are **partial bias** only. **New frameworks and fresh ideas are still encouraged.**",
    "Prefer patterns that worked; steer away from patterns that failed — but **do not** copy verbatim or block exploration.",
    "",
  ];

  if (slice.preferredFrameworks.length) {
    lines.push(
      "**Creative Canon frameworks that have tended to work for this client (weighted):**",
      ...slice.preferredFrameworks.map((id) => `- ${id}`),
      "",
    );
  }

  if (slice.approvedLines.length) {
    lines.push("**Prefer patterns like (recent approvals):**");
    for (const s of slice.approvedLines) lines.push(`- ${s}`);
    lines.push("");
  }

  if (slice.rejectedLines.length) {
    lines.push("**Avoid repeating patterns like (recent rejections):**");
    for (const s of slice.rejectedLines) lines.push(`- ${s}`);
    lines.push("");
  }

  if (slice.avoidPatterns.length) {
    lines.push("**Aggregated caution signals (do not over-index; use as guardrails):**");
    for (const s of slice.avoidPatterns) lines.push(`- ${s}`);
    lines.push("");
  }

  return lines.join("\n");
}
