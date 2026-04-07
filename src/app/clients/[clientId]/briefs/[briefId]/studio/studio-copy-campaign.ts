/**
 * COPY artifact → primary + alternate headlines for campaign view (no raw JSON).
 */

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

export type ParsedCopyCampaign = {
  primaryHeadline: string | null;
  alternateHeadlines: string[];
};

export function parseCopyCampaign(content: unknown): ParsedCopyCampaign | null {
  if (!isRecord(content)) return null;
  const heads = content.headlineOptions;
  if (!Array.isArray(heads)) return null;
  const headlineOptions = heads.map((h) => String(h).trim()).filter(Boolean);
  if (headlineOptions.length === 0) return null;

  const sel = content._agenticforceSelection;
  let primaryIdx = 0;
  if (isRecord(sel) && typeof sel.primaryHeadlineIndex === "number") {
    primaryIdx = Math.max(
      0,
      Math.min(headlineOptions.length - 1, sel.primaryHeadlineIndex),
    );
  }

  const altIdxs = new Set<number>();
  if (isRecord(sel) && Array.isArray(sel.alternateHeadlineIndices)) {
    for (const x of sel.alternateHeadlineIndices as unknown[]) {
      const n = typeof x === "number" ? x : parseInt(String(x), 10);
      if (Number.isFinite(n) && n >= 0 && n < headlineOptions.length) {
        altIdxs.add(n);
      }
    }
  }

  const primaryHeadline = headlineOptions[primaryIdx] ?? null;
  const alternateHeadlines: string[] = [];
  for (const i of altIdxs) {
    if (i !== primaryIdx) alternateHeadlines.push(headlineOptions[i]!);
  }
  for (let i = 0; i < headlineOptions.length && alternateHeadlines.length < 4; i++) {
    if (i !== primaryIdx && !altIdxs.has(i)) {
      alternateHeadlines.push(headlineOptions[i]!);
    }
  }

  return { primaryHeadline, alternateHeadlines: alternateHeadlines.slice(0, 4) };
}
