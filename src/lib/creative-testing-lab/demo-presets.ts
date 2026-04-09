/**
 * Built-in Creative Testing Lab demos: rich brand context + remote reference URLs
 * (HTTPS) so compose/FAL can fetch without uploading. Replace `loraRef` with your
 * Fal-trained adapter when ready.
 *
 * Logos: Wikimedia Commons (raster thumbnails). Heroes: Unsplash (generic category
 * imagery aligned to each demo — not official brand photography).
 */

import type { ProductionMode } from "../production-engine/modes";
import type { LabBrandForm, LabCreativeForm } from "./map-to-production-input";
import type { LabExecutionPathUi } from "./run-history";

export const LAB_DEMO_PRESETS_STORAGE_KEY = "creative-testing-lab-demo-presets-version";
export const LAB_DEMO_PRESETS_VERSION = 1;

export type LabFullPreset = {
  id: string;
  name: string;
  brand: LabBrandForm;
  creative: LabCreativeForm;
  mode: ProductionMode;
  qualityTier: "draft" | "standard" | "high" | "premium";
  executionPath: LabExecutionPathUi;
  batchSize: number;
  targetTypeFilter: string;
  styleModelRef: string;
  /** Paste your Fal LoRA / adapter URL after you train on approved brand assets */
  loraRef: string;
  strongRefs: boolean;
  preferEdit: boolean;
  seedAssets: {
    logoUrl?: string;
    heroUrl?: string;
    secondaryUrl?: string;
    tertiaryUrl?: string;
    extraRefs?: { id: string; name: string; url: string }[];
  };
  /** Shown in UI / export — not executed automatically */
  loraTrainingNote?: string;
};

const nikeBrand = (): LabBrandForm => ({
  clientName: "Nike (demo lab profile)",
  industry: "Athletic footwear & apparel",
  brandSummary:
    "Performance-first sports brand: movement, grit, and self-betterment. Energy is high; aesthetics are bold, athletic, and modern with strong negative space when used in OOH.",
  toneOfVoice:
    "Direct, motivational, confident — short clauses, action verbs, no corporate filler. Speak to athletes and everyday movers.",
  keyAudience: "16–40 active lifestyle; runners, gym, team sports, street sport culture.",
  positioning: "Empowerment through sport — push limits, celebrate effort.",
  mustSignal: "Motion, determination, premium sport energy, bold composition.",
  mustAvoid: "Static stock poses, cluttered layouts, soft lifestyle clichés without tension, fake inspirational fluff.",
  visualLanguage:
    "High contrast, dynamic angles, decisive cropping, swoosh-aware layouts (logo zone respected), urban track or training environments.",
  colorPalette: "#FF6000, #000000, #FFFFFF",
  fontNotes: "Condensed bold sans for headlines; clean geometric sans for support.",
  brandRulesCi:
    "Respect logo clear space; do not distort swoosh; prefer black or white wordmark on busy imagery.",
  competitorNotes: "Adidas, Puma, Under Armour — differentiate with edgier crop and grittier light.",
  marketRegion: "Global",
  fullBrandOperatingNotes:
    "Test harness only. Use official brand guidelines for production. This preset is for isolated lab QA of prompts, routing, and LoRA conditioning.",
});

const nikeCreative = (): LabCreativeForm => ({
  projectTitle: "Lab: Spring performance social + OOH test",
  campaignCore: "Own the first mile — show the moment before the breakthrough.",
  emotionalTension: "Doubt vs. resolve; fatigue vs. second wind.",
  visualNarrative: "Close training detail → wide payoff frame; sweat, texture, rubber, asphalt.",
  conceptName: "First Mile",
  conceptRationale: "Meets the brand’s performance story without relying on generic victory tropes.",
  headline: "Go one more.",
  cta: "Find your run",
  supportingCopy: "Built for repeat efforts. Test creative for scroll-stopping crop and legible type at distance.",
  visualDirection:
    "Dramatic side light, shallow depth, cool shadows with warm accent (brand orange as rim or UI only). Hero fills 60%+ of frame.",
  compositionIntent: "Hero left or full-bleed with corner stack; CTA never competes with footwear focal point.",
  moodLighting: "Golden-hour edge or gritty gym practicals; avoid flat commercial lighting.",
  negativeSpaceNotes: "Reserve top or side band for headline in OOH; social may use tighter crop.",
  deliverableNotes: "SOCIAL 1:1 + OOH landscape — verify readability at 3m mock distance.",
  packagingNotes: "",
  fashionNotes: "Technical fabric detail acceptable as tertiary tile.",
  longFormBrief:
    "QA preset: validate FAL routing (generate vs edit), LoRA strength, and composer handoff. Compare two hero crops with Compare A/B.",
});

const appleBrand = (): LabBrandForm => ({
  clientName: "Apple (demo lab profile)",
  industry: "Consumer technology",
  brandSummary:
    "Minimal, precise, human-centered technology. Calm confidence; product as hero; generous whitespace and restrained color.",
  toneOfVoice: "Simple, specific, quiet confidence — no hype adjectives, no exclamation clutter.",
  keyAudience: "Creative professionals, students, premium mobile and computing buyers.",
  positioning: "Tools that disappear so the work shines.",
  mustSignal: "Clarity, precision, premium materials, calm backgrounds, product truth.",
  mustAvoid: "Neon gamer aesthetics, busy textures, loud gradients, stock handshake photos.",
  visualLanguage:
    "Neutral gradients or solid fields, soft natural light, floating or angled product hero, meticulous alignment.",
  colorPalette: "#000000, #F5F5F7, #FFFFFF, #2997FF",
  fontNotes: "SF-like neutral grotesk stack in composer; system feel.",
  brandRulesCi: "Apple mark only where policy allows — lab uses neutral product-led frames.",
  competitorNotes: "Samsung, Google Pixel — counter with stillness and single-subject discipline.",
  marketRegion: "Global",
  fullBrandOperatingNotes:
    "Demo only. Production requires Apple identity compliance. Use this preset to stress-test minimal composition and edit paths.",
});

const appleCreative = (): LabCreativeForm => ({
  projectTitle: "Lab: Product hero — calm precision",
  campaignCore: "The shot is the story — one device, one idea.",
  emotionalTension: "Noise vs. focus.",
  visualNarrative: "Product floating on soft gray; reflection subtle; UI glow restrained.",
  conceptName: "Single Focus",
  conceptRationale: "Matches minimal brand system and tests composer typography against clean plate.",
  headline: "Pro power. All day.",
  cta: "See tech specs",
  supportingCopy: "Short subline for catalog-style frame; verify hierarchy under fashion/ecom layout.",
  visualDirection:
    "45° product hero, softbox highlight, no busy environment; optional single hand crop for social variant.",
  compositionIntent: "Center-weighted or rule-of-thirds product; text in lower third safe zone.",
  moodLighting: "Soft diffused key, very soft fill, cool-neutral balance.",
  negativeSpaceNotes: "At least 35% clean field for headline stack on social.",
  deliverableNotes: "ECOMMERCE_FASHION / SOCIAL — toggle targets and compare outputs.",
  packagingNotes: "",
  fashionNotes: "Editorial still life; no lifestyle crowd scenes.",
  longFormBrief:
    "Train a product LoRA on approved packshots, paste URL into LoRA field, then run Generate — single target on MODEL_SHOT or hero tile.",
});

const cokeBrand = (): LabBrandForm => ({
  clientName: "Coca-Cola (demo lab profile)",
  industry: "Beverages",
  brandSummary:
    "Classic refreshment brand: optimism, togetherness, and iconic red. High recognition; packaging and pour shots are sacred.",
  toneOfVoice: "Warm, inclusive, upbeat — conversational, timeless, never cynical.",
  keyAudience: "Broad household; teens to adults; social and retail moments.",
  positioning: "Happiness in small rituals — pour, clink, share.",
  mustSignal: "Red brand energy, thirst cue, effervescence, human warmth (not sterile).",
  mustAvoid: "Diet cliché body shaming, muddy brown palettes, cheap clip-art bubbles.",
  visualLanguage:
    "Vibrant red fields, condensation, glass and metal highlights, summer or diner warmth.",
  colorPalette: "#F40009, #FFFFFF, #000000",
  fontNotes: "Spencerian-inspired curves only where licensed — lab uses neutral sans in composer.",
  brandRulesCi: "Script logo treatment per official art; lab uses raster logo reference only.",
  competitorNotes: "Pepsi, energy drinks — own red warmth and classic glass bottle cues.",
  marketRegion: "Global",
  fullBrandOperatingNotes:
    "Demo preset for retail/POS and OOH readability tests. Not for unapproved trademark use in the wild.",
});

const cokeCreative = (): LabCreativeForm => ({
  projectTitle: "Lab: Retail POS — cold & now",
  campaignCore: "The coldest pour in the aisle wins the trip.",
  emotionalTension: "Heat vs. relief.",
  visualNarrative: "Sweated glass, ice, red backdrop, price burst zone reserved.",
  conceptName: "Cold Now",
  conceptRationale: "Tests promo hierarchy + FAL texture plate + deterministic pack layout.",
  headline: "Ice-cold refreshment",
  cta: "Grab yours today",
  supportingCopy: "Price / offer line TBD by retailer — leave band for sticker or digital tile.",
  visualDirection:
    "Macro condensation, shallow DOF, saturated red with white headline knockouts; avoid illegible micro-type on FAL plates.",
  compositionIntent: "RETAIL_POS: product + offer balance; clear promo block top or bottom.",
  moodLighting: "Bright high-key with sparkle speculars; fridge-case cool fill acceptable.",
  negativeSpaceNotes: "Keep 10% margin for retailer legal on POS.",
  deliverableNotes: "Run PACKAGING or RETAIL_POS; compare composed output vs raw FAL plate.",
  packagingNotes: "Front-of-pack hierarchy test — claims band + logo zone.",
  fashionNotes: "",
  longFormBrief:
    "Use LoRA trained on approved bottle/can photography for tighter brand skin. Start with router_default, then force edit if you have a base pour photo.",
});

/** Wikimedia raster logos — fetch may require User-Agent (set in deterministic composer). */
const WM = "https://upload.wikimedia.org/wikipedia/commons/thumb";

export const LAB_SEEDED_DEMO_PRESETS: LabFullPreset[] = [
  {
    id: "demo-lab-nike",
    name: "Demo: Nike-style athletic (SOCIAL)",
    brand: nikeBrand(),
    creative: nikeCreative(),
    mode: "SOCIAL",
    qualityTier: "high",
    executionPath: "router",
    batchSize: 2,
    targetTypeFilter: "",
    styleModelRef: "",
    loraRef: "",
    strongRefs: true,
    preferEdit: false,
    seedAssets: {
      logoUrl: `${WM}/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png`,
      heroUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80",
      secondaryUrl: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&q=80",
      tertiaryUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80",
      extraRefs: [
        { id: "ref-nike-1", name: "Training / grit", url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80" },
        { id: "ref-nike-2", name: "Track texture", url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80" },
      ],
    },
    loraTrainingNote:
      "Upload your approved Nike (or client-athletic) CI pack to Fal LoRA training; paste the resulting adapter URL into LoRA / adapter URL. Then try Force LoRA generate on HERO_PHOTO targets.",
  },
  {
    id: "demo-lab-apple",
    name: "Demo: Apple-style tech minimal (ECOMMERCE_FASHION)",
    brand: appleBrand(),
    creative: appleCreative(),
    mode: "ECOMMERCE_FASHION",
    qualityTier: "premium",
    executionPath: "router",
    batchSize: 1,
    targetTypeFilter: "",
    styleModelRef: "",
    loraRef: "",
    strongRefs: true,
    preferEdit: true,
    seedAssets: {
      logoUrl: `${WM}/f/fa/Apple_logo_black.svg/200px-Apple_logo_black.svg.png`,
      heroUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=80",
      secondaryUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=900&q=80",
      tertiaryUrl: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=900&q=80",
      extraRefs: [
        { id: "ref-apple-1", name: "Desk still life", url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80" },
      ],
    },
    loraTrainingNote:
      "Train LoRA on client-approved product spin / packshots only. preferEdit + hero URL helps i2i stay on-device geometry.",
  },
  {
    id: "demo-lab-coca-cola",
    name: "Demo: Coca-Cola-style refreshment (RETAIL_POS)",
    brand: cokeBrand(),
    creative: cokeCreative(),
    mode: "RETAIL_POS",
    qualityTier: "high",
    executionPath: "router",
    batchSize: 2,
    targetTypeFilter: "",
    styleModelRef: "",
    loraRef: "",
    strongRefs: true,
    preferEdit: false,
    seedAssets: {
      logoUrl: `${WM}/c/ce/Coca-Cola_logo.svg/320px-Coca-Cola_logo.svg.png`,
      heroUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=900&q=80",
      secondaryUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=900&q=80",
      tertiaryUrl: "https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=900&q=80",
      extraRefs: [
        { id: "ref-coke-1", name: "Chilled can", url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80" },
      ],
    },
    loraTrainingNote:
      "Use brand-approved bottle/can training set for LoRA; keeps contour and label physics believable under RETAIL_POS composition.",
  },
];

export function mergeSeededDemoPresets(existing: LabFullPreset[]): LabFullPreset[] {
  const prefix = "demo-lab-";
  const custom = existing.filter((p) => !p.id.startsWith(prefix));
  return [...LAB_SEEDED_DEMO_PRESETS, ...custom];
}

/** Call on lab mount: bumps demo seed when `LAB_DEMO_PRESETS_VERSION` changes. */
export function rehydrateLabPresetsFromStorage(args: {
  presetsJson: string | null;
  demoVersionKey: string;
}): { presets: LabFullPreset[]; shouldPersist: boolean } {
  let existing: LabFullPreset[] = [];
  if (args.presetsJson) {
    try {
      const parsed = JSON.parse(args.presetsJson) as unknown;
      if (Array.isArray(parsed)) existing = parsed as LabFullPreset[];
    } catch {
      /* ignore */
    }
  }
  const storedVer = args.demoVersionKey;
  if (storedVer === String(LAB_DEMO_PRESETS_VERSION)) {
    const presets = existing.length ? existing : mergeSeededDemoPresets([]);
    return { presets, shouldPersist: !existing.length };
  }
  const merged = mergeSeededDemoPresets(existing);
  return { presets: merged, shouldPersist: true };
}
