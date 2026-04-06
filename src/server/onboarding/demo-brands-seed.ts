/**
 * Demo-only seed data: Coca-Cola & McDonald's (South Africa campaign briefs).
 * Based on public brand positioning — not confidential materials.
 */
import type { BrandBibleFormInput } from "@/server/domain/brand-bible";
import type { ServiceBlueprintFormInput } from "@/server/domain/service-blueprint";
import type { BriefFormInput } from "@/server/domain/briefs";

export const DEMO_DISCLAIMER =
  "Demo client — public-brand-style data for internal testing only. Not affiliated with or endorsed by the brand.";

export const cocaColaBrandBible = (): BrandBibleFormInput => ({
  positioning:
    "Coca-Cola is the world’s most recognized soft-drink brand, built on optimism, togetherness, and the simple pleasure of refreshment. In market, it competes on emotional connection and occasion (meals, celebrations, summer) as much as on product.",
  targetAudience:
    "South African teens and young adults, families, and social hosts who buy beverages for gatherings, lunch, and hot-weather refreshment; also retailers and food-service partners.",
  toneOfVoice:
    "Warm, upbeat, inclusive, conversational — celebrate real moments without talking down. Short, rhythmic lines; avoid corporate stiffness.",
  messagingPillars: [
    "Real refreshment for real moments",
    "Share happiness — together tastes better",
    "Iconic taste, trusted quality",
  ],
  visualIdentity: [
    "Red-forward palette with white accent; high energy and clarity",
    "Dynamic human moments: friends, food, music, outdoor summer",
    "Product-in-context: condensation, chill, pour — not sterile pack shots only",
  ],
  channelGuidelines: [
    "Social video-first; OOH in high-traffic summer locations",
    "Retail POS with clear price/value cues where relevant",
    "Music and culture partnerships where brand-safe",
  ],
  mandatoryInclusions: [
    "Responsible enjoyment messaging where regulations require",
    "Correct trademark treatment for brand name",
  ],
  thingsToAvoid: [
    "Health claims the brand cannot substantiate",
    "Targeting children inappropriately",
    "Political or divisive messaging",
  ],
  vocabularyStyle: "SIMPLE",
  sentenceStyle: "SHORT",
  primaryEmotion: "DESIRE",
  persuasionStyle: "STORY_LED",
  bannedPhrases: ["best in class", "innovative solution", "premium feel"],
  preferredPhrases: ["refreshment", "together", "real magic", "taste the feeling"],
  signaturePatterns: ["Moment + product + emotion in one breath", "Rhyming or rhythmic headlines"],
  emotionalToneDescription:
    "Joyful, slightly nostalgic, inviting — like the start of a good weekend.",
  emotionalBoundaries: ["Never bleak or cynical", "Never shame-based"],
  hookStyles: ["Summer moment hook", "Shared table / cheers", "Beat-drop + product beat"],
  narrativeStyles: ["Slice-of-life montage", "Single hero moment"],
  visualStyle: "Vibrant, sun-lit, saturated reds; lifestyle documentary energy",
  colorPhilosophy: "Coke red as hero; natural skin tones; cool blues/greens for refreshment cues",
  compositionStyle: "Rule of thirds; product legible in first 2s of film",
  textureFocus: "Ice, condensation, carbonation bubbles, fabric and skin warmth",
  lightingStyle: "High-key daylight; golden hour for emotional peaks",
  languageDnaPhrasesUse: ["Share a Coke", "Real magic", "Open happiness"],
  languageDnaPhrasesNever: ["Guaranteed results", "Medical benefits"],
  languageDnaSentenceRhythm: ["Short punchy", "Two-beat headline + subline"],
  languageDnaHeadlinePatterns: ["Verb-led: Share / Taste / Chill / Feel"],
  languageDnaCtaPatterns: ["Grab yours", "Find us in store", "Tag your crew"],
  categoryTypicalBehavior:
    "Soft drinks often lean on generic refreshment and price wars; summer campaigns flood OOH with sameness.",
  categoryClichesToAvoid: ["Ice cubes flying in slow motion only", "Generic DJ party with no story"],
  categoryDifferentiation:
    "Anchor in unmistakable brand equity (contour bottle, red disc) plus authentic South African summer culture — not a generic cola ad.",
  tensionCoreContradiction: "Global icon vs. local summer truth — must feel both huge and personal.",
  tensionEmotionalBalance: "High energy without chaos; inclusive without being bland.",
  tasteCloserThan: [
    "Closer to a music-festival recap than a corporate annual report",
    "Closer to street culture energy than luxury minimalism",
  ],
  tasteShouldFeelLike: "Sun on your face, cold bottle in hand, friends nearby.",
  tasteMustNotFeelLike: "A bank ad, a pharma spot, or a tech keynote.",
  visualNeverLooksLike: [
    "Muddy desaturated grade",
    "Stock office handshakes",
    "Fake CGI liquid that breaks believability",
  ],
  visualCompositionTendencies: "Foreground product or human gesture; background context readable",
  visualMaterialTextureDirection: "Real glass, real sweat, real food textures",
  visualLightingTendencies: "Hard sun + soft fill for skin; avoid flat fluorescent",
  onboardingSource: "demo_seed",
  aiOnboardingNeedsReview: true,
});

export const cocaColaBlueprint = (): ServiceBlueprintFormInput => ({
  templateType: "FULL_PIPELINE",
  activeServices: [
    "Campaign strategy & messaging",
    "Creative concepting",
    "Visual direction & key art",
    "Retail & social adaptation",
  ],
  qualityThreshold: 0.88,
  approvalRequired: true,
});

export const cocaColaBrief = (): BriefFormInput => {
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 3);
  return {
    title: "Coca-Cola South Africa — Summer refreshment campaign",
    businessObjective:
      "Grow brand love and volume during peak summer by owning refreshment occasions (outdoor, meals, social) in key metros.",
    communicationObjective:
      "Make Coke the default drink for shared summer moments — memorable film, social, and retail that feel locally true.",
    targetAudience:
      "SA consumers 16–35 and young families; heavy soft-drink buyers; culturally connected to music, sport, and street culture.",
    keyMessage: "Real refreshment hits different when you share it.",
    deliverablesRequested: [
      "Hero 30s film + cutdowns",
      "Key visual system",
      "Social content toolkit",
      "Retail POS basics",
    ],
    tone: "Upbeat, inclusive, culturally fluent — never preachy.",
    constraints: ["Follow local regulations for HFSS / alcohol adjacency", "Trademark compliance"],
    deadline,
    identityWorkflowEnabled: false,
    onboardingSource: "demo_seed",
    aiOnboardingNeedsReview: true,
  };
};

export const mcdonaldsBrandBible = (): BrandBibleFormInput => ({
  positioning:
    "McDonald’s is a global QSR leader known for consistency, speed, value, and family-friendly meals. In South Africa it competes on affordability, familiarity, and craveable classics (burgers, fries, breakfast) plus local relevance.",
  targetAudience:
    "Value-conscious families, students, young workers, and drive-through commuters seeking familiar taste and quick service.",
  toneOfVoice:
    "Friendly, straightforward, slightly playful — emphasize taste, value, and ease. No snobbery; clear benefits.",
  messagingPillars: [
    "Great taste you know",
    "Value that fits your day",
    "Fast, easy, everywhere",
  ],
  visualIdentity: [
    "Warm reds and yellows; appetite appeal; clean product photography",
    "Family and diverse everyday South Africans",
    "App and drive-thru convenience cues",
  ],
  channelGuidelines: ["TV/OLV", "Social (short-form)", "In-store and window POS", "Delivery partners"],
  mandatoryInclusions: ["Accurate pricing where shown", "Local menu accuracy"],
  thingsToAvoid: ["Mocking competitors directly", "Unsubstantiated superiority claims"],
  vocabularyStyle: "SIMPLE",
  sentenceStyle: "MEDIUM",
  primaryEmotion: "TRUST",
  persuasionStyle: "DIRECT",
  bannedPhrases: ["best in class", "innovative solution", "premium feel"],
  preferredPhrases: ["I’m lovin’ it", "Your favourites", "Made for your day"],
  signaturePatterns: ["Crave + convenience + price in one line", "Before/after hunger beat"],
  emotionalToneDescription: "Comforting, satisfying, lightly humorous — everyday treat energy.",
  emotionalBoundaries: ["No guilt-tripping", "No exclusionary class signals"],
  hookStyles: ["Hunger moment", "Family table win", "Late-night crave"],
  narrativeStyles: ["Problem-solution snackable", "Day-in-the-life montage"],
  visualStyle: "Appetite-forward, warm grading, crisp product macro + real people",
  colorPhilosophy: "Golden fries and bun warmth vs. clean whites; reds for appetite triggers",
  compositionStyle: "Product-forward with readable logo; thumb-stopping first frame on mobile",
  textureFocus: "Melted cheese, crisp lettuce, steam, sesame texture",
  lightingStyle: "Kitchen-warm key; avoid sterile clinic lighting",
  languageDnaPhrasesUse: ["Your favourites", "That hit the spot", "Grab & go"],
  languageDnaPhrasesNever: ["Guaranteed weight loss", "Cheap and nasty"],
  languageDnaSentenceRhythm: ["Punchy headline + offer subline"],
  languageDnaHeadlinePatterns: ["Crave-led: Hot / Fresh / Now"],
  languageDnaCtaPatterns: ["Order now", "Tap the app", "Pull up to the window"],
  categoryTypicalBehavior: "QSR ads often yell price and pile food; risk looking interchangeable.",
  categoryClichesToAvoid: ["Generic flying ingredients with no story", "Fake family perfection"],
  categoryDifferentiation:
    "Pair craveable food macro with real SA routines (school run, payday treat, mates after sport) — not generic global paste.",
  tensionCoreContradiction: "Global consistency vs. local taste of life.",
  tensionEmotionalBalance: "Fun without chaos; value without feeling cheap.",
  tasteCloserThan: [
    "Closer to a satisfying food reel than a bank savings ad",
    "Closer to Friday-night energy than Monday-morning corporate",
  ],
  tasteShouldFeelLike: "Immediate hunger + relief when you get the bag.",
  tasteMustNotFeelLike: "Fine dining pretension or cold fintech minimalism.",
  visualNeverLooksLike: ["Grey mushy food grade", "Over-CGI burgers", "Empty restaurants at noon"],
  visualCompositionTendencies: "Macro hero + human reaction in same beat",
  visualMaterialTextureDirection: "Grease-sheen realism within brand standards",
  visualLightingTendencies: "Warm key; subtle rim for appetite",
  onboardingSource: "demo_seed",
  aiOnboardingNeedsReview: true,
});

export const mcdonaldsBlueprint = (): ServiceBlueprintFormInput => ({
  templateType: "FULL_PIPELINE",
  activeServices: [
    "Value & seasonal campaign",
    "Menu window creative",
    "Social performance content",
    "In-store communication",
  ],
  qualityThreshold: 0.85,
  approvalRequired: true,
});

/** Fictional demo only — public QSR tropes, not official KFC materials. */
export const kfcBrandBible = (): BrandBibleFormInput => ({
  positioning:
    "A bold fried-chicken QSR known for spice-forward flavour, bucket sharing, and “treat yourself” energy. In South Africa it competes on crave, heat, and weekend indulgence — less family-meal utility, more flavour swagger. (Internal demo — not affiliated with any brand.)",
  targetAudience:
    "Young adults, mates after sport, late-night delivery users, and spice-curious families who want a louder, more indulgent QSR choice.",
  toneOfVoice:
    "Bold, cheeky, confident — sensory and spicy. Short lines; playful swagger without insulting competitors by name.",
  messagingPillars: [
    "Finger-licking flavour you feel",
    "Heat, crunch, and shareable wins",
    "Indulgence without the fine-dining wait",
  ],
  visualIdentity: [
    "Deep reds, black, and warm neutrals; high contrast and appetite macro",
    "Steam, spice flecks, glossy glaze, char where appropriate",
    "Urban night energy and share-table spreads — not sterile white QSR",
  ],
  channelGuidelines: ["OLV and social first", "Delivery app tiles", "Window and in-store posters"],
  mandatoryInclusions: ["Accurate offer language where pricing appears", DEMO_DISCLAIMER],
  thingsToAvoid: ["Naming or imitating real competitor trademarks", "Medical or nutrition claims"],
  vocabularyStyle: "SIMPLE",
  sentenceStyle: "SHORT",
  primaryEmotion: "DESIRE",
  persuasionStyle: "DIRECT",
  bannedPhrases: ["best in class", "innovative solution", "premium feel"],
  preferredPhrases: ["Extra crispy", "That heat hits", "Share the bucket"],
  signaturePatterns: ["Spice + crunch + mates in one beat", "Night-out hunger hook"],
  emotionalToneDescription:
    "Indulgent, slightly rebellious Friday-night energy — flavour-forward and confident.",
  emotionalBoundaries: ["No cruelty or shock imagery", "No classist put-downs"],
  hookStyles: ["Late-night crave", "Spice dare", "Share-table victory"],
  narrativeStyles: ["Snappy product montage", "One-bite reaction"],
  visualStyle:
    "High-contrast, warm tungsten + red accents; glossy food macro; gritty-real urban backdrops",
  colorPhilosophy: "Black and deep red as anchors; warm highlights on food; avoid pastel washout",
  compositionStyle: "Tight macro + negative space for type; thumb-stopping contrast",
  textureFocus: "Crunch crumb, glaze sheen, smoke wisps, sesame or char where relevant",
  lightingStyle: "Warm low-key with rim; night-market glow; avoid flat clinical white",
  languageDnaPhrasesUse: ["That crunch", "Turn up the heat", "Share the win"],
  languageDnaPhrasesNever: ["Guaranteed results", "Official partnership unless true"],
  languageDnaSentenceRhythm: ["Two-word punch + sensory line"],
  languageDnaHeadlinePatterns: ["Heat-led / crunch-led headlines"],
  languageDnaCtaPatterns: ["Order now", "Grab a bucket", "Tap for delivery"],
  categoryTypicalBehavior:
    "QSR often stacks generic flying ingredients; risk looking like every other red-and-yellow ad.",
  categoryClichesToAvoid: ["Fake CGI chicken", "Stock 'happy family' with no flavour story"],
  categoryDifferentiation:
    "Own spice, crunch, and night-out indulgence — distinct from warm-yellow family QSR cues.",
  tensionCoreContradiction: "Indulgence vs. everyday affordability.",
  tensionEmotionalBalance: "Bold without mean-spirited; spicy without gross-out.",
  tasteCloserThan: [
    "Closer to a mates-on-the-stoop night than a bank savings message",
    "Closer to street-food energy than corporate annual report",
  ],
  tasteShouldFeelLike: "Immediate mouth-watering heat and crunch — you can almost hear the bite.",
  tasteMustNotFeelLike: "Muted wellness salad branding or cold fintech minimalism.",
  visualNeverLooksLike: [
    "Washed-out pastel lifestyle stock",
    "Over-CGI meat",
    "Confusable parody of another chain's exact trade dress",
  ],
  visualCompositionTendencies: "Macro hero biased low; high contrast; readable silhouette",
  visualMaterialTextureDirection: "Real oil sheen, crumb, char — tactile not plastic",
  visualLightingTendencies: "Warm key + edge light; subtle haze for appetite",
  onboardingSource: "demo_seed",
  aiOnboardingNeedsReview: true,
});

export const kfcBlueprint = (): ServiceBlueprintFormInput => ({
  templateType: "FULL_PIPELINE",
  activeServices: [
    "Seasonal LTO campaign",
    "Social performance suite",
    "In-store and window",
    "Delivery partner tiles",
  ],
  qualityThreshold: 0.85,
  approvalRequired: true,
});

export const mcdonaldsBrief = (): BriefFormInput => {
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 2);
  return {
    title: "McDonald’s South Africa — Value & family seasonal push",
    businessObjective:
      "Drive visits and basket size during a seasonal window by reinforcing value bundles and family meal solutions.",
    communicationObjective:
      "Make the brand the easy choice for families and friends — clear offers, craveable food, frictionless ordering.",
    targetAudience:
      "Budget-aware families, young adults, and delivery users in major SA cities and towns.",
    keyMessage: "The flavours you love, priced for real life.",
    deliverablesRequested: [
      "Hero campaign film 20–30s",
      "Value-led social suite",
      "In-store posters / window",
      "App push / partner assets outline",
    ],
    tone: "Warm, direct, a little playful — confidence without arrogance.",
    constraints: ["Accurate pricing and offer legal", "No misleading comparative claims"],
    deadline,
    identityWorkflowEnabled: false,
    onboardingSource: "demo_seed",
    aiOnboardingNeedsReview: true,
  };
};

/** Same LTO idea on both chains — compare key art via Brand OS + prompt package. */
export const mcdonaldsRibBurgerBrief = (): BriefFormInput => {
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 2);
  return {
    title: "McDonald’s South Africa — Rib burger LTO launch",
    businessObjective:
      "Drive trial and repeat on a limited-time rib-style burger during a 6-week window — lift dinner and weekend dayparts.",
    communicationObjective:
      "Make the rib burger the craveable, shareable hero — smoky-sweet glaze, messy-in-a-good-way eat, clear LTO urgency without hype lies.",
    targetAudience:
      "Burger-forward young adults and families; delivery users; mates after sport; SA metros and large towns.",
    keyMessage: "Smoky-sweet rib flavour, built for the bite — only here for a short run.",
    deliverablesRequested: [
      "Hero key visual (OOH / social)",
      "6–8s social cutdowns",
      "In-store poster + window",
    ],
    tone: "Warm, appetite-first, lightly playful — mass-market QSR appeal.",
    constraints: [
      DEMO_DISCLAIMER,
      "No false limited-time claims; accurate menu naming",
      "Generated key art must not include real third-party logos or trademarks",
    ],
    deadline,
    identityWorkflowEnabled: false,
    onboardingSource: "demo_seed",
    aiOnboardingNeedsReview: true,
  };
};

export const kfcRibBurgerBrief = (): BriefFormInput => {
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 2);
  return {
    title: "KFC-style demo — Rib burger LTO launch (SA)",
    businessObjective:
      "Win rib-burger trial among heat- and crunch-seeking QSR buyers during a sharp LTO window.",
    communicationObjective:
      "Own smoky-spicy rib glaze and messy crunch — night-out energy, shareable plates, clear LTO.",
    targetAudience:
      "Spice-forward young adults, delivery night owls, and share-bucket occasions in SA cities.",
    keyMessage: "Rib glaze meets crunch — turn up the flavour before it’s gone.",
    deliverablesRequested: [
      "Hero key visual (social + window)",
      "Spicy social suite",
      "Delivery hero tile",
    ],
    tone: "Bold, sensory, confident — indulgent without bro toxicity.",
    constraints: [
      DEMO_DISCLAIMER,
      "Fictional demo brand only — no official KFC marks or trade dress in generated imagery",
      "Accurate offer language if price appears",
    ],
    deadline,
    identityWorkflowEnabled: false,
    onboardingSource: "demo_seed",
    aiOnboardingNeedsReview: true,
  };
};
