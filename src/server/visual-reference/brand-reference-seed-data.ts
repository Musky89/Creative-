import type { VisualReferenceCategory } from "@/generated/prisma/client";

/** Stable anchor for scoring / future filters — not displayed as legal brand claim. */
export type BrandReferenceAnchor = "mcdonalds_sa_demo" | "kfc_sa_demo";

export type BrandVisualReferenceSeedRow = {
  label: string;
  category: VisualReferenceCategory;
  imageUrl: string;
  metadata: Record<string, unknown>;
  anchor: BrandReferenceAnchor;
};

/**
 * Curated Unsplash-style references (generic food / lifestyle — not official campaign assets).
 * Tuned for South African QSR demo: McDonald's-adjacent vs KFC-adjacent visual language.
 */
export const MCDONALDS_SA_REFERENCE_SEED: BrandVisualReferenceSeedRow[] = [
  {
    anchor: "mcdonalds_sa_demo",
    label: "Burger hero — center-weighted appetite (SA QSR)",
    category: "COMPOSITION",
    imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "burger", "hero", "center", "appetite", "qsr", "south-africa"],
      lighting: "bright even key, minimal harsh shadow",
      composition: "single hero burger, readable layers, logo-safe negative space",
      mood: "fun, approachable, crave-forward",
      region: "South Africa",
      brandCues: ["warm buns", "golden fries energy", "red-yellow friendly pop", "family QSR"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "Shared meal table — diverse casual lunch (lifestyle)",
    category: "COMPOSITION",
    imageUrl: "https://images.unsplash.com/photo-1528605105345-5344ea076eac?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "family", "friends", "table", "diverse", "lifestyle", "shared"],
      lighting: "bright ambient restaurant / patio fill",
      composition: "group at table, eye-level, breathing room between subjects",
      mood: "inclusive, upbeat, everyday celebration",
      region: "South Africa",
      brandCues: ["multi-generational possible", "casual dining", "bright social"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "Outdoor picnic / park bite — sunny SA context",
    category: "COMPOSITION",
    imageUrl: "https://images.unsplash.com/photo-1504674900800-0286980b6eeb?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "outdoor", "picnic", "sun", "park", "sa-sunlight"],
      lighting: "high sun with soft bounce, warm African afternoon bias",
      composition: "environmental food moment, hands + packaging readable",
      mood: "lighthearted, weekend energy",
      region: "South Africa",
      brandCues: ["takeaway-friendly", "bright sky bias", "natural warmth"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "High-key friendly fill — playground-bright QSR",
    category: "LIGHTING",
    imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7448?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "high-key", "soft", "wrap", "friendly", "bright"],
      lighting: "soft wrap light, lifted shadows, chipper retail feel",
      composition: "food-forward with clean separation from background",
      mood: "safe, happy, mass-appeal",
      region: "South Africa",
      brandCues: ["no horror-movie contrast", "inviting gloss control"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "Golden-hour outdoor practical — warm SA tones",
    category: "LIGHTING",
    imageUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "golden-hour", "warm", "natural", "salad-bright"],
      lighting: "directional sun + warm bounce, saturated but not neon",
      composition: "hero food with environmental color harmony",
      mood: "fresh, vibrant, optimistic",
      region: "South Africa",
      brandCues: ["warm skin tones for casting", "appetite greens and reds"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "Window daylight — clean editorial QSR",
    category: "LIGHTING",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "window", "daylight", "editorial", "clean"],
      lighting: "large-source soft daylight, subtle specular control",
      composition: "bowl/plate hero — adapt to burger tray geometry",
      mood: "premium-casual, trustworthy",
      region: "South Africa",
      brandCues: ["readable ingredients", "hygiene-forward brightness"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "Bold color block — playful campaign flat",
    category: "STYLE",
    imageUrl: "https://images.unsplash.com/photo-1561758033-d89a9ad41c12?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "bold", "color", "graphic", "playful", "pop"],
      lighting: "even studio pop, saturated set",
      composition: "strong silhouette, simple background",
      mood: "energetic, youth-skew, fun",
      region: "South Africa",
      brandCues: ["mass-market joy", "poster readability"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "Clean minimal product read — logo adjacency safe",
    category: "STYLE",
    imageUrl: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "minimal", "clean", "product", "symmetry-light"],
      lighting: "soft even, low drama",
      composition: "centered hero, generous margins",
      mood: "clear offer communication",
      region: "South Africa",
      brandCues: ["value clarity", "menu-board energy"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "Bright social energy — handheld candid",
    category: "STYLE",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "restaurant", "bustle", "candid", "social"],
      lighting: "warm practicals, busy but readable faces",
      composition: "layered depth, real dining room",
      mood: "community, familiarity",
      region: "South Africa",
      brandCues: ["diverse casting friendly", "real-world restaurant truth"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "Campaign cue — golden warmth & red appetite accents",
    category: "BRAND",
    imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "brand", "golden", "warm", "burger", "campaign"],
      lighting: "warm key, appetizing highlight on bun",
      composition: "macro-to-medium burger storytelling",
      mood: "indulgent but family-safe",
      region: "South Africa",
      brandCues: ["fries-yellow warmth", "ketchup-red hints", "no competitor marks"],
    },
  },
  {
    anchor: "mcdonalds_sa_demo",
    label: "Campaign cue — sunny drive moment (SA roadside)",
    category: "BRAND",
    imageUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=80",
    metadata: {
      tags: ["mcdonalds_sa_demo", "brand", "drive", "road", "sunny", "mobility"],
      lighting: "hard sun + car interior bounce, high energy",
      composition: "windshield world + hand/snack readable",
      mood: "on-the-go convenience win",
      region: "South Africa",
      brandCues: ["commute culture", "bright optimism"],
    },
  },
];

export const KFC_SA_REFERENCE_SEED: BrandVisualReferenceSeedRow[] = [
  {
    anchor: "kfc_sa_demo",
    label: "Crispy chicken macro — texture-forward hero",
    category: "COMPOSITION",
    imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "chicken", "fried", "crispy", "macro", "texture"],
      lighting: "directional side rake to read crust",
      composition: "tight crop on breading break, steam optional",
      mood: "indulgent, crave-heavy",
      region: "South Africa",
      brandCues: ["spice dust", "crunch read", "warm oil sheen believable"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "Overhead feast spread — messy-indulgent styling",
    category: "COMPOSITION",
    imageUrl: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "overhead", "spread", "buckets", "comfort"],
      lighting: "low moody overhead, pools of warmth",
      composition: "table chaos controlled, hero pieces clustered",
      mood: "late-night share, guilty pleasure",
      region: "South Africa",
      brandCues: ["shared bucket energy", "parchment/tray texture"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "Low-angle hero — dramatic crispy stack",
    category: "COMPOSITION",
    imageUrl: "https://images.unsplash.com/photo-1608039829570-9282cdb035f0?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "low-angle", "stack", "dramatic", "fried"],
      lighting: "under-rim fill + strong key from side",
      composition: "monumental food, shallow depth",
      mood: "bold, confident spice brand",
      region: "South Africa",
      brandCues: ["red-orange cast friendly", "night-out hunger"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "Low-key moody key — rich shadow retention",
    category: "LIGHTING",
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "low-key", "moody", "shadow", "contrast", "burger-alt"],
      lighting: "single strong source, deep blacks, controlled specular",
      composition: "grill/bar energy adaptable to fried chicken",
      mood: "intense, adult-indulgent",
      region: "South Africa",
      brandCues: ["not family-bright QSR", "texture over cleanliness"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "Tungsten practical night — street heat",
    category: "LIGHTING",
    imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "tungsten", "night", "street", "warm-dark"],
      lighting: "warm practicals, falloff into shadow",
      composition: "environmental night eat",
      mood: "urban SA night culture",
      region: "South Africa",
      brandCues: ["after-match meal", "neon spill optional"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "Hard sidelight — crispy edge emphasis",
    category: "LIGHTING",
    imageUrl: "https://images.unsplash.com/photo-1588168333986-5078d3ae3947?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "sidelight", "edge", "crispy", "contrast"],
      lighting: "narrow beam, high micro-contrast on crust",
      composition: "chicken pieces staggered depth",
      mood: "sensory, spicy anticipation",
      region: "South Africa",
      brandCues: ["read every flake", "no flat lighting"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "Gritty appetite macro — oil and spice truth",
    category: "STYLE",
    imageUrl: "https://images.unsplash.com/photo-1615550390619-1334d4ffc246?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "gritty", "macro", "spice", "realism"],
      lighting: "mixed color temp, imperfect = believable",
      composition: "fill frame with food truth",
      mood: "unapologetic crave",
      region: "South Africa",
      brandCues: ["peri-peri / heat story without naming trademarks"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "High-contrast editorial — billboard drama",
    category: "STYLE",
    imageUrl: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "editorial", "contrast", "pizza-grill-adapt"],
      lighting: "dramatic wood-fire spill — adapt to fryer warmth",
      composition: "dark surround, glowing food core",
      mood: "premium heat, confident",
      region: "South Africa",
      brandCues: ["not soft family QSR", "flame-kissed narrative"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "Comfort close framing — basket / box intimacy",
    category: "STYLE",
    imageUrl: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "close", "basket", "comfort", "fried-chicken"],
      lighting: "warm low bounce from food itself",
      composition: "hands entering frame optional",
      mood: "satisfying, tactile",
      region: "South Africa",
      brandCues: ["sharing bucket", "Sundays / sports adjacency"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "Campaign cue — deep red-orange heat story",
    category: "BRAND",
    imageUrl: "https://images.unsplash.com/photo-1527477394900-a5c3fde615e6?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "brand", "red", "orange", "heat", "spice", "wings"],
      lighting: "warm gel bias acceptable, not neon",
      composition: "fried chicken as sun — radial heat",
      mood: "fiery fun, youthful edge",
      region: "South Africa",
      brandCues: ["Zinger-style heat without copying packaging"],
    },
  },
  {
    anchor: "kfc_sa_demo",
    label: "Campaign cue — midnight crunch (SA city night)",
    category: "BRAND",
    imageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=1200&q=80",
    metadata: {
      tags: ["kfc_sa_demo", "brand", "midnight", "city", "neon-edge"],
      lighting: "mixed street + warm food glow",
      composition: "handheld bag/box moment",
      mood: "after-hours crave",
      region: "South Africa",
      brandCues: ["delivery / walk-up night trade", "contrast vs McD bright family"],
    },
  },
];
