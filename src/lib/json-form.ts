/**
 * Convert multiline text (one item per non-empty line) to JSON array for Prisma Json fields.
 */
export function linesToJsonArray(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function jsonArrayToLines(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join("\n");
  }
  if (value == null) return "";
  return String(value);
}
