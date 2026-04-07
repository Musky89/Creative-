/**
 * Derive winner / alternatives / rejected concept routes from CONCEPT artifact JSON.
 */
export type ConceptRouteBrief = {
  conceptId: string;
  conceptName: string;
  hook: string;
  rationale: string;
  whyItWorksForBrand: string;
  frameworkId: string;
  isSelected?: boolean;
  isAlternate?: boolean;
  isRejected?: boolean;
};

export type ParsedConceptPack = {
  routes: ConceptRouteBrief[];
  winner: ConceptRouteBrief | null;
  alternatives: ConceptRouteBrief[];
  rejected: ConceptRouteBrief[];
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

export function parseConceptPack(content: unknown): ParsedConceptPack | null {
  if (!isRecord(content)) return null;
  const raw = content.concepts;
  if (!Array.isArray(raw)) return null;

  const routes: ConceptRouteBrief[] = raw.map((c, i) => {
    if (!isRecord(c)) {
      return {
        conceptId: `concept-${i}`,
        conceptName: "Route",
        hook: "",
        rationale: "",
        whyItWorksForBrand: "",
        frameworkId: "",
      };
    }
    return {
      conceptId:
        typeof c.conceptId === "string" && c.conceptId.trim()
          ? c.conceptId.trim()
          : `concept-${i}`,
      conceptName: String(c.conceptName ?? `Concept ${i + 1}`),
      hook: String(c.hook ?? ""),
      rationale: String(c.rationale ?? ""),
      whyItWorksForBrand: String(c.whyItWorksForBrand ?? ""),
      frameworkId: String(c.frameworkId ?? ""),
      isSelected: c.isSelected === true,
      isAlternate: c.isAlternate === true,
      isRejected: c.isRejected === true,
    };
  });

  const winner =
    routes.find((r) => r.isSelected) ??
    (() => {
      const sel = content._agenticforceSelection;
      if (!isRecord(sel)) return routes[0] ?? null;
      const wid = String(sel.winnerConceptId ?? "").trim();
      if (!wid) return routes[0] ?? null;
      return routes.find((r) => r.conceptId === wid) ?? routes[0] ?? null;
    })();

  const rejected = routes.filter((r) => r.isRejected === true);
  const taggedAlternates = routes.filter((r) => r.isAlternate === true);
  let alternatives =
    taggedAlternates.length > 0
      ? taggedAlternates
      : routes.filter(
          (r) => r.conceptId !== winner?.conceptId && r.isRejected !== true,
        );
  alternatives = alternatives.slice(0, 2);

  return { routes, winner, alternatives, rejected };
}
