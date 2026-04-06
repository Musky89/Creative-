import type { CreativeFramework } from "@/lib/canon/frameworks";
import { formatCanonForPrompt } from "./select-frameworks";

/**
 * Injected into agent user prompts — instructs models to apply Canon, not just name it.
 */
export function buildCreativeCanonUserSection(
  frameworks: CreativeFramework[],
): string {
  if (frameworks.length === 0) {
    return [
      "## Creative Canon",
      "No frameworks were auto-selected for this stage. Still avoid generic marketing filler; ground ideas in the brief and Brand Bible.",
    ].join("\n\n");
  }

  const ids = frameworks.map((f) => f.id).join(", ");

  return [
    "## Creative Canon (SELECTED — mandatory to apply)",
    "These frameworks are not decoration. Your output must **show** their structure (before/after, tension, proof ladder, etc.) in the actual copy you write for each field.",
    "",
    formatCanonForPrompt(frameworks),
    "",
    `**Allowed \`frameworkId\` string values (use exactly, lowercase-hyphenated):** ${ids}`,
  ].join("\n\n");
}
