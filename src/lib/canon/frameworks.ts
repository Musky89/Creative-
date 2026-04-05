/**
 * Creative Canon — v1 frameworks in code (no DB).
 * Shared with UI and server (no server-only imports in client components).
 */

export type CanonCategory =
  | "HOOK"
  | "NARRATIVE"
  | "POSITIONING"
  | "VISUAL_DIRECTION"
  | "CONVERSION";

export type CreativeFramework = {
  id: string;
  name: string;
  category: CanonCategory;
  description: string;
  whenToUse: string;
  structure: string;
  example: string;
};

export const CANON_FRAMEWORKS: readonly CreativeFramework[] = [
  {
    id: "transformation",
    name: "Transformation",
    category: "NARRATIVE",
    description:
      "Moves the audience from a recognizable before-state to a desirable after-state.",
    whenToUse:
      "When the product or message delivers a clear life/capability/status change worth dramatizing.",
    structure:
      "Establish before (concrete) → emotional/functional gap → after (specific) → bridge via brand.",
    example:
      "Before: spreadsheets at midnight. After: decisions before lunch. The shift isn’t software—it’s authority.",
  },
  {
    id: "problem-agitation",
    name: "Problem Agitation",
    category: "HOOK",
    description:
      "Surfaces pain, legitimately intensifies stakes, then introduces relief without cynicism.",
    whenToUse:
      "When inertia is high, the problem is widely felt, and urgency must be earned—not manufactured.",
    structure:
      "Name the pain (specific) → agitate with consequence (true, not hysterical) → pivot to solution as relief.",
    example:
      "Missed renewals don’t start in CRM—they start in handoffs nobody owns. Until routing is one system, leakage is guaranteed.",
  },
  {
    id: "aspirational-identity",
    name: "Aspirational Identity",
    category: "POSITIONING",
    description:
      "Defines who the audience wants to become and aligns the brand as the path to that identity.",
    whenToUse:
      "When purchase is partly self-signaling (status, craft, competence, belonging).",
    structure:
      "Name the identity (verb-based) → show the friction of staying ‘old self’ → brand as ritual/tool of becoming.",
    example:
      "You’re not buying a jacket—you’re buying the version of you that shows up prepared.",
  },
  {
    id: "unexpected-contrast",
    name: "Unexpected Contrast",
    category: "HOOK",
    description:
      "Breaks category pattern with a tension or juxtaposition that earns attention.",
    whenToUse:
      "When the category is noisy, homogeneous, or audiences have stopped noticing ‘more of the same’.",
    structure:
      "Expected category claim → interrupt with opposite or odd truth → resolve into product truth.",
    example:
      "The quietest feature on the car isn’t the motor. It’s the financing.",
  },
  {
    id: "material-as-emotion",
    name: "Material as Emotion",
    category: "VISUAL_DIRECTION",
    description:
      "Maps tangible materials, textures, and craft cues to specific feelings and brand warmth.",
    whenToUse:
      "When physical product, craft, packaging, or sensory quality is a real differentiator.",
    structure:
      "Pick 2–3 materials or textures → assign each an emotional job → tie to a single brand feeling.",
    example:
      "Matte ceramic reads calm; brushed metal reads precision; soft edge radius reads human.",
  },
  {
    id: "authority-proof",
    name: "Authority / Proof",
    category: "CONVERSION",
    description:
      "Leads with credibility, evidence, or expertise so belief precedes persuasion.",
    whenToUse:
      "When distrust, regulation, complexity, or high consideration dominates the journey.",
    structure:
      "Claim → proof point (specific) → mechanism (why true) → CTA as next rational step.",
    example:
      "Used by 120 hospital networks. Audited annually. That’s why uptime isn’t a promise—it’s a contract clause.",
  },
  {
    id: "minimalist-premium",
    name: "Minimalist Premium",
    category: "VISUAL_DIRECTION",
    description:
      "Restraint, negative space, and reduction signal confidence and premium quality.",
    whenToUse:
      "When the brand sells simplicity, luxury, focus, or ‘less but better’.",
    structure:
      "One hero element → generous space → single typographic system → one accent only.",
    example:
      "One product, one line of copy, one shadow. Anything else would cheapen the silence.",
  },
  {
    id: "hyper-functional",
    name: "Hyper-Functional",
    category: "CONVERSION",
    description:
      "Feature-forward clarity: what it does, for whom, under what constraint—fast.",
    whenToUse:
      "When buyers compare specs, workflows, or ROI; emotion is secondary to comprehension.",
    structure:
      "Outcome headline → 3 concrete capabilities → proof or guardrail → frictionless CTA.",
    example:
      "Syncs in 90 seconds. Works offline. Exports to SAP. Try it on your sandbox today.",
  },
  {
    id: "cultural-relevance",
    name: "Cultural Relevance",
    category: "HOOK",
    description:
      "Ties the idea to a live cultural tension, moment, or shared reference—without forced trend-jacking.",
    whenToUse:
      "When timing, movement, or collective conversation unlocks permission to speak.",
    structure:
      "Name the moment (specific) → show how audience feels inside it → brand stance that isn’t generic.",
    example:
      "Everyone’s ‘AI-ready.’ Few can show what changed Monday morning. We show the workflow.",
  },
  {
    id: "sensory-immersion",
    name: "Sensory Immersion",
    category: "VISUAL_DIRECTION",
    description:
      "Rich sensory language and visual density that makes the audience feel present.",
    whenToUse:
      "When experience, taste, place, atmosphere, or emotion-through-senses sells the product.",
    structure:
      "Layer 2–3 senses → anchor to one memorable image → avoid cliché adjective stacks.",
    example:
      "Steam, citrus peel oil, the sound of the latch—morning reduced to one ritual you control.",
  },
] as const;

const byId = new Map<string, CreativeFramework>(
  CANON_FRAMEWORKS.map((f) => [f.id, f]),
);

export function getFrameworkById(id: string): CreativeFramework | undefined {
  return byId.get(id);
}

export function getFrameworksByIds(ids: string[]): CreativeFramework[] {
  return ids
    .map((id) => byId.get(id))
    .filter((f): f is CreativeFramework => f != null);
}
