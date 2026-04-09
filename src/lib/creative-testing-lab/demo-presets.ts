/**
 * Built-in Creative Testing Lab demos: rich brand context + remote reference URLs
 * (HTTPS) so compose/FAL can fetch without uploading. Replace `loraRef` with your
 * Fal-trained adapter when ready.
 *
 * Logos: Wikimedia Commons (raster thumbnails). Heroes + mood board: Unsplash
 * (license-friendly stock aligned by *category* — not official brand photography).
 * We do not scrape brand sites; swap URLs for client-approved CDN assets when ready.
 */

import type { ProductionMode } from "../production-engine/modes";
import type { LabBrandForm, LabCreativeForm } from "./map-to-production-input";
import type { LabExecutionPathUi } from "./run-history";

export const LAB_DEMO_PRESETS_STORAGE_KEY = "creative-testing-lab-demo-presets-version";
/** Bump when built-in demo content changes so localStorage re-merges seeded presets. */
export const LAB_DEMO_PRESETS_VERSION = 3;

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
  /**
   * Readable summary of what this demo pretends arrived from upstream (strategy, canon, etc.).
   * No runtime link to the orchestrator — documentation for testers only.
   */
  simulatedUpstreamSummary?: string;
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
  fullBrandOperatingNotes: `SIMULATED UPSTREAM HANDOFF (not from live pipeline) — Brand OS / strategy slice for lab QA only.

Campaign shell: SP26-FM-INT — "First Mile" spring performance push.
Business objective: Grow consideration in running + training among 18–34; bridge social energy to retail try-on and app sessions.
Audience insight: The decisive moment is not the finish line — it is the rep you almost skip. Win that moment and you win the week.
Single-minded proposition: Progress is a decision you make before the watch starts.
Message architecture: (1) Effort is the brand — show work, not trophies. (2) Equipment serves the athlete — product in motion, never static catalog. (3) Community without cliché — real crews, real courts and tracks.
Creative canon: Framework = "Tension → Release" — open on doubt/fatigue, resolve on forward motion; one hero subject; no anonymous crowds.
Channels: Paid social (1:1, 4:5), high-impact OOH D6, retail window companion stills.
Guardrails: No unsubstantiated performance claims; no comparative superiority without legal clearance; respect athlete diversity representation notes from DE&I brief (simulated).
Production implication: All copy and layouts are lab fiction — replace with approved client assets for shipping.`,
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
  longFormBrief: `--- Simulated upstream creative pack (strategy + concept + copy direction already "approved" for this test) ---

Campaign: SP26-FM-INT / First Mile | Window: Mar–Apr (fictional) | Markets: NA + WE priority.

Strategic narrative (exec summary): We are not selling shoes; we are selling the decision to show up. Retail and social must feel like the same story — grit, light, and forward motion.

Selected concept: "First Mile" — The first mile is mental; the product is permission to start again.

Copy system: Headline family A = imperative ("Go one more.") | B = tension ("Almost stopped. Didn't.") — lab uses A for default. CTA ladder: Explore → Find your run → Shop the pack (use "Find your run" for social).

VISUAL_SPEC (synthetic): Aspect social 1:1 + 4:5; OOH 6:1 landscape. Lens: 35–50mm equivalent feel, eye-level or low hero angle. Grade: cool shadows, warm rim, crushed blacks acceptable on OOH. Wardrobe: authentic training — no logo-mash costumes. Hero occupies ≥60% frame; leave headline band clean on OOH top third.

Deliverables checklist (simulated sign-off): 3 social masters, 1 OOH key visual, 2 retail crops from same hero.

Legal / claims: Avoid "fastest", "best", "% improvement" unless footnoted — lab uses none.

How to use this lab: Load preset → Build plan → Generate with FAL_KEY → mark preferred → Compose → export run JSON for review.`,
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
  fullBrandOperatingNotes: `SIMULATED UPSTREAM HANDOFF — Q-product calm launch (fictional).

Campaign: CALM-PRO-01 — "Single Focus" device-led story for prosumer refresh cycle.
Objective: Reinforce "effortless power + all-day reliability" without spec overload; support ecommerce PDP and paid social retargeting.
Insight: Buyers are exhausted by feature lists; they want one believable promise backed by calm proof.
SMP: One device, one proof, zero noise.
Pillars: (1) Clarity — one focal product per frame. (2) Trust — materials and UI read as real, not renders. (3) Restraint — if it feels loud, it fails.
Creative canon: Apple-style discipline (simulated) — generous margins, neutral fields, no competitor references, no promotional shouting.
Channels: PDP hero, catalog grid, social static, optional minimal motion grab (out of scope for this lab).
Compliance note: Lab uses generic phone imagery + public logo thumb — production requires full identity and legal review.`,
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
  longFormBrief: `--- Simulated upstream pack: CALM-PRO-01 / Single Focus ---

Approved route: Product-as-hero still life only (no lifestyle cast for wave 1).

Copy: Headline "Pro power. All day." | Sub "Battery and performance that stay out of your way." | CTA "See tech specs" (link to PDP anchor). Alt CTA "Buy" for retargeting only.

VISUAL_SPEC: Background #F5F5F7 to #E8E8ED subtle radial; product 45° three-quarter; softbox key camera-left; single readable reflection; specular highlights controlled — no blown metal. Minimum 35% negative space for type. No props except optional single cable coiled as sculptural line.

SKU focus (fictional): Pro-tier phone + one accessory tile secondary.

Lab workflow: preferEdit ON when you have an approved base render; paste LoRA from client packshots for tighter skin. Compare A/B two lighting interpretations.`,
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
  fullBrandOperatingNotes: `SIMULATED UPSTREAM HANDOFF — Summer instant refresh / aisle interrupt (fictional).

Campaign: CHILL-NOW-25 | Objective: Win "cold now" in convenience + grocery top-right shelf; support price-led promo burst without feeling cheap.
Insight: Heat and thirst are temporal — creative must feel immediately refreshing in <0.5s glance.
SMP: The coldest pour in the moment you need it.
Pillars: (1) Red energy — own the warm aisle. (2) Thirst cue — condensation, ice, glass ring. (3) Human warmth — small shared moments, not boardroom smiles.
Retail rules: Promo block legible at 2m; logo lockup per master art; retailer legal strip reserved.
Synthetic only — swap all marks and pack for client-approved mechanicals before production.`,
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
  longFormBrief: `--- Simulated upstream: CHILL-NOW-25 / Cold Now ---

Offer architecture (fictional): "2 for $X" burst in channel; headline holds brand refresh; price lives in promo band.

Copy: H1 "Ice-cold refreshment" | Sub "Real magic in every pour" (placeholder) | CTA "Grab yours today" | Legal: nutrition + trademark lines in 8pt zone (simulated).

VISUAL_SPEC: Macro bottle/can with beads; high-key red field or fridge glow; shallow DOF; ice as secondary texture plate. Avoid muddy browns; avoid fake CGI bubbles.

POS sizes: 22×28" + shelf strip; safe zone 10% all sides.

Lab: Run RETAIL_POS or PACKAGING mode; compose after FAL selects hero; export JSON for stakeholder review.`,
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
        { id: "ref-nike-3", name: "Gym floor / iron", url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80" },
        { id: "ref-nike-4", name: "Weight room mood", url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80" },
        { id: "ref-nike-5", name: "Studio fitness", url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80" },
        { id: "ref-nike-6", name: "Tread / cardio", url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80" },
        { id: "ref-nike-7", name: "Athlete silhouette energy", url: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=600&q=80" },
      ],
    },
    loraTrainingNote:
      "Upload your approved Nike (or client-athletic) CI pack to Fal LoRA training; paste the resulting adapter URL into LoRA / adapter URL. Then try Force LoRA generate on HERO_PHOTO targets.",
    simulatedUpstreamSummary:
      "Pretends SP26-FM-INT strategy + First Mile concept + VISUAL_SPEC + channel plan are already signed off — all text lives in Brand OS notes and Long-form brief.",
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
        { id: "ref-apple-2", name: "Laptop minimal", url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80" },
        { id: "ref-apple-3", name: "Clean workspace", url: "https://images.unsplash.com/photo-1522199710521-72d69614c702?w=600&q=80" },
        { id: "ref-apple-4", name: "Dev desk neutral", url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80" },
        { id: "ref-apple-5", name: "Abstract light gray", url: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=600&q=80" },
      ],
    },
    loraTrainingNote:
      "Train LoRA on client-approved product spin / packshots only. preferEdit + hero URL helps i2i stay on-device geometry.",
    simulatedUpstreamSummary:
      "Pretends CALM-PRO-01 calm launch strategy + Single Focus route + PDP/social VISUAL_SPEC are frozen — see long-form brief for copy ladder.",
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
        { id: "ref-coke-2", name: "Cold drink pour", url: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80" },
        { id: "ref-coke-3", name: "Summer fruit red", url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80" },
        { id: "ref-coke-4", name: "Red cocktail bar", url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80" },
        { id: "ref-coke-5", name: "Beach refreshment", url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80" },
        { id: "ref-coke-6", name: "Ice / summer tone", url: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&q=80" },
      ],
    },
    loraTrainingNote:
      "Use brand-approved bottle/can training set for LoRA; keeps contour and label physics believable under RETAIL_POS composition.",
    simulatedUpstreamSummary:
      "Pretends CHILL-NOW-25 retail strategy + Cold Now concept + POS visual spec + offer architecture are ready — see full handoff in long-form brief.",
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
