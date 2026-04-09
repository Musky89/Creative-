/**
 * Full deterministic seed pack for QA / demos.
 * Bump STANDALONE_AGENTIC_OS_SEED_VERSION in store.ts to reset in-memory data on next server start.
 */

import type { BrandGraph, CampaignGraph, ChannelSpec } from "./schemas";
import { brandGraphSchema, campaignGraphSchema, channelSpecSchema } from "./schemas";

export const SEED_PACK_LABEL = "standalone-agentic-os-full-v2";

export function buildFullSeed(now: string): {
  channels: ChannelSpec[];
  brands: BrandGraph[];
  campaigns: CampaignGraph[];
} {
  const channels: ChannelSpec[] = [
    channelSpecSchema.parse({
      id: "ch-social-11",
      label: "Paid social 1:1 (feed)",
      maxHeadlineChars: 72,
      maxCtaChars: 24,
      minContrastRatio: 4.5,
    }),
    channelSpecSchema.parse({
      id: "ch-social-45",
      label: "Paid social 4:5 (vertical)",
      maxHeadlineChars: 90,
      maxCtaChars: 28,
      minContrastRatio: 4.5,
    }),
    channelSpecSchema.parse({
      id: "ch-ooh",
      label: "OOH / billboard (6:1 read)",
      maxHeadlineChars: 38,
      maxCtaChars: 16,
      minContrastRatio: 4.5,
    }),
    channelSpecSchema.parse({
      id: "ch-retail",
      label: "Retail / POS poster",
      maxHeadlineChars: 48,
      maxCtaChars: 22,
      minContrastRatio: 4.5,
    }),
    channelSpecSchema.parse({
      id: "ch-email",
      label: "Email hero + CTA",
      maxHeadlineChars: 85,
      maxCtaChars: 32,
      minContrastRatio: 4.5,
    }),
  ];

  const brands: BrandGraph[] = [
    brandGraphSchema.parse({
      id: "brand-meridian-saas",
      version: 1,
      name: "Meridian Flow (B2B SaaS seed)",
      updatedAt: now,
      voiceSummary:
        "Clear, confident, slightly witty — speaks to operators who hate fluff. Short sentences. Active voice. Never patronize.",
      mustSignal: "Speed to value, trust, and calm control.",
      mustAvoid: "Buzzword soup, fake urgency, ‘revolutionary’ claims without proof.",
      bannedPhrases: ["synergy", "world-class", "best-in-class", "leverage", "paradigm shift"],
      palette: [
        { name: "Ink", hex: "#0f172a", role: "text" },
        { name: "Cloud", hex: "#f1f5f9", role: "background" },
        { name: "Signal blue", hex: "#0ea5e9", role: "accent" },
        { name: "Success", hex: "#10b981", role: "secondary" },
      ],
      typographyNotes: "Headline: geometric sans 700; body: 400; never more than two weights on one piece.",
      logoNotes: "Wordmark only on social; full lockup on OOH. Clear space = x-height of M.",
      exemplarNotes: "Reference: clean UI shots, hands on keyboard, daylight offices — never stock ‘handshake in lobby’.",
    }),
    brandGraphSchema.parse({
      id: "brand-apex-athletic",
      version: 1,
      name: "Apex Track Co. (athletic seed)",
      updatedAt: now,
      voiceSummary:
        "Raw, motivational, street-credible — talks like a coach who shows up daily. No corporate wellness speak.",
      mustSignal: "Effort, grit, forward motion, inclusive intensity.",
      mustAvoid: "Body shame, before/after exploitation, ‘fix yourself’ tone.",
      bannedPhrases: ["beach body", "guilt-free", "cheat day", "instant results"],
      palette: [
        { name: "Asphalt", hex: "#18181b", role: "background" },
        { name: "Chalk", hex: "#fafafa", role: "text" },
        { name: "Volt", hex: "#eab308", role: "accent" },
        { name: "Blood orange", hex: "#ea580c", role: "primary" },
      ],
      typographyNotes: "Condensed bold headlines; wide tracking on single-word OOH.",
      logoNotes: "Mark never smaller than 24px on social; never on busy photo without knockout bar.",
      exemplarNotes: "Urban track, gym chalk, sweat macro, rubber and asphalt texture — avoid glossy fitness models only.",
    }),
    brandGraphSchema.parse({
      id: "brand-summit-refresh",
      version: 1,
      name: "Summit Chill (beverage seed)",
      updatedAt: now,
      voiceSummary:
        "Warm, inclusive, celebratory small moments — sounds like friends at a table, not a boardroom.",
      mustSignal: "Refreshment, togetherness, simple joy.",
      mustAvoid: "Diet culture, exclusivity, talking down to the drinker.",
      bannedPhrases: ["guilt-free", "sinful", "indulge without consequences", "detox"],
      palette: [
        { name: "Crimson", hex: "#dc2626", role: "primary" },
        { name: "Snow", hex: "#ffffff", role: "background" },
        { name: "Cocoa", hex: "#292524", role: "text" },
        { name: "Fizz", hex: "#fecdd3", role: "secondary" },
      ],
      typographyNotes: "Rounded humanist for headlines on retail; script accent only in logo zone.",
      logoNotes: "Script mark requires minimum width; legal line 8pt zone on POS.",
      exemplarNotes: "Condensation, ice clink, summer table, hands on cold glass — no fake CGI bubbles.",
    }),
    brandGraphSchema.parse({
      id: "brand-lumen-device",
      version: 1,
      name: "Lumen Devices (tech hardware seed)",
      updatedAt: now,
      voiceSummary:
        "Minimal, precise, calm — one idea per sentence. Product truth over hype. Feels expensive through restraint.",
      mustSignal: "Craft, materials, quiet confidence.",
      mustAvoid: "Spec vomit, neon gamer aesthetic, competitor call-outs.",
      bannedPhrases: ["game-changer", "crushing it", "insane", "you won't believe"],
      palette: [
        { name: "Graphite", hex: "#27272a", role: "text" },
        { name: "Mist", hex: "#e4e4e7", role: "background" },
        { name: "Electric", hex: "#3b82f6", role: "accent" },
      ],
      typographyNotes: "Neutral grotesk; generous margins; single hero product per frame.",
      logoNotes: "Product-led frames; mark only in corner lockup on social.",
      exemplarNotes: "Softbox product, 45° hero, neutral gradients — no busy lifestyle crowds for wave one.",
    }),
  ];

  const campaigns: CampaignGraph[] = [
    campaignGraphSchema.parse({
      id: "camp-meridian-trial-q2",
      brandId: "brand-meridian-saas",
      version: 1,
      name: "Q2 trial lift — operators",
      updatedAt: now,
      objective: "Increase qualified trial starts by 20% vs Q1 among ops leads.",
      audience: "Ops directors and founders at 50–500 person companies evaluating workflow tools.",
      singleMindedProposition: "Ship the boring work so your team ships the important work.",
      proofPoints: ["14-day trial", "SOC2 Type II", "Avg 48h onboarding"],
      channelSpecId: "ch-social-11",
    }),
    campaignGraphSchema.parse({
      id: "camp-meridian-ooh-awareness",
      brandId: "brand-meridian-saas",
      version: 1,
      name: "Airport corridor awareness",
      updatedAt: now,
      objective: "Unaided recall in target metros among frequent flyers.",
      audience: "Business travelers who buy software for their teams.",
      singleMindedProposition: "The system that runs when you are in the air.",
      proofPoints: ["Trusted by 2k+ teams (fictional seed)"],
      channelSpecId: "ch-ooh",
    }),
    campaignGraphSchema.parse({
      id: "camp-apex-spring-mile",
      brandId: "brand-apex-athletic",
      version: 1,
      name: "Spring — First mile push",
      updatedAt: now,
      objective: "Own the ‘decision to start’ moment for runners returning after winter.",
      audience: "Runners 18–40 in urban markets.",
      singleMindedProposition: "The first mile is mental — we meet you there.",
      proofPoints: ["New midsole compound (seed)", "30-day wear test"],
      channelSpecId: "ch-social-45",
    }),
    campaignGraphSchema.parse({
      id: "camp-apex-window",
      brandId: "brand-apex-athletic",
      version: 1,
      name: "Flagship window still",
      updatedAt: now,
      objective: "Drive store foot traffic during launch weekend.",
      audience: "City athletes who shop premium run retail.",
      singleMindedProposition: "Built for repeat efforts — show up again tomorrow.",
      proofPoints: ["In-store gait scan"],
      channelSpecId: "ch-retail",
    }),
    campaignGraphSchema.parse({
      id: "camp-summit-summer-aisle",
      brandId: "brand-summit-refresh",
      version: 1,
      name: "Summer aisle interrupt",
      updatedAt: now,
      objective: "Win cold-now occasions in grocery convenience set.",
      audience: "Household shoppers 25–55 stocking for weekends and gatherings.",
      singleMindedProposition: "The coldest pour in the moment you need it.",
      proofPoints: ["2-for promo (retailer TBD)", "Recyclable where facilities exist (seed)"],
      channelSpecId: "ch-retail",
    }),
    campaignGraphSchema.parse({
      id: "camp-summit-social-together",
      brandId: "brand-summit-refresh",
      version: 1,
      name: "Social — togetherness moments",
      updatedAt: now,
      objective: "Engagement and share rate on summer creative.",
      audience: "Social natives planning casual get-togethers.",
      singleMindedProposition: "Small rituals, big smiles.",
      proofPoints: ["Limited summer sleeve (seed)"],
      channelSpecId: "ch-social-11",
    }),
    campaignGraphSchema.parse({
      id: "camp-lumen-pro-launch",
      brandId: "brand-lumen-device",
      version: 1,
      name: "Pro tier — calm power story",
      updatedAt: now,
      objective: "Conversion on PDP and retargeting static.",
      audience: "Creative pros upgrading primary device this cycle.",
      singleMindedProposition: "Pro power that stays out of your way.",
      proofPoints: ["All-day battery claim where legally approved (seed)"],
      channelSpecId: "ch-social-45",
    }),
    campaignGraphSchema.parse({
      id: "camp-lumen-nurture",
      brandId: "brand-lumen-device",
      version: 1,
      name: "Email nurture — spec shy segment",
      updatedAt: now,
      objective: "Re-engage cart abandoners with one clear benefit.",
      audience: "Consideration-stage buyers who bounced from PDP.",
      singleMindedProposition: "One device. One less thing to think about.",
      proofPoints: ["Free returns 30d (seed)"],
      channelSpecId: "ch-email",
    }),
  ];

  return { channels, brands, campaigns };
}
