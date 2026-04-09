import type { BrandGraph, CampaignGraph, ChannelSpec, CaseFile } from "./schemas";

type GlobalStore = {
  brands: Map<string, BrandGraph>;
  campaigns: Map<string, CampaignGraph>;
  channels: Map<string, ChannelSpec>;
  cases: CaseFile[];
};

function getStore(): GlobalStore {
  const g = globalThis as unknown as { __standaloneAgenticOsStore?: GlobalStore };
  if (!g.__standaloneAgenticOsStore) {
    g.__standaloneAgenticOsStore = {
      brands: new Map(),
      campaigns: new Map(),
      channels: new Map(),
      cases: [],
    };
    seedIfEmpty(g.__standaloneAgenticOsStore);
  }
  return g.__standaloneAgenticOsStore;
}

function seedIfEmpty(s: GlobalStore) {
  if (s.channels.size > 0) return;
  const now = new Date().toISOString();
  const social: ChannelSpec = {
    id: "ch-social",
    label: "Paid social (1:1)",
    maxHeadlineChars: 72,
    maxCtaChars: 28,
    minContrastRatio: 4.5,
  };
  const ooh: ChannelSpec = {
    id: "ch-ooh",
    label: "OOH landscape",
    maxHeadlineChars: 42,
    maxCtaChars: 18,
    minContrastRatio: 4.5,
  };
  s.channels.set(social.id, social);
  s.channels.set(ooh.id, ooh);

  const brand: BrandGraph = {
    id: "brand-demo",
    version: 1,
    name: "Demo brand (seed)",
    updatedAt: now,
    voiceSummary: "Direct, warm, confident. Short sentences. No jargon.",
    mustSignal: "Trust and clarity.",
    mustAvoid: "Hype without proof, fear-mongering.",
    bannedPhrases: ["world-class", "synergy", "best-in-class"],
    palette: [
      { name: "Ink", hex: "#0f172a", role: "text" },
      { name: "Paper", hex: "#f8fafc", role: "background" },
      { name: "Accent", hex: "#2563eb", role: "accent" },
    ],
    typographyNotes: "Bold condensed headline; clean sans body.",
    logoNotes: "Clear space = height of the mark.",
    exemplarNotes: "Use approved mood boards only.",
  };
  s.brands.set(brand.id, brand);

  const campaign: CampaignGraph = {
    id: "camp-demo",
    brandId: brand.id,
    version: 1,
    name: "Spring consideration (seed)",
    updatedAt: now,
    objective: "Drive trial sign-ups among professionals 25–45.",
    audience: "Time-poor professionals who value outcomes over features.",
    singleMindedProposition: "Get the outcome without the busywork.",
    proofPoints: ["14-day trial", "No card to start"],
    channelSpecId: social.id,
  };
  s.campaigns.set(campaign.id, campaign);
}

export function listBrands(): BrandGraph[] {
  return [...getStore().brands.values()];
}

export function getBrand(id: string): BrandGraph | undefined {
  return getStore().brands.get(id);
}

export function putBrand(b: BrandGraph): void {
  getStore().brands.set(b.id, b);
}

export function listCampaigns(): CampaignGraph[] {
  return [...getStore().campaigns.values()];
}

export function getCampaign(id: string): CampaignGraph | undefined {
  return getStore().campaigns.get(id);
}

export function putCampaign(c: CampaignGraph): void {
  getStore().campaigns.set(c.id, c);
}

export function listChannels(): ChannelSpec[] {
  return [...getStore().channels.values()];
}

export function getChannel(id: string): ChannelSpec | undefined {
  return getStore().channels.get(id);
}

export function putChannel(ch: ChannelSpec): void {
  getStore().channels.set(ch.id, ch);
}

export function listCases(limit = 50): CaseFile[] {
  const c = getStore().cases;
  return c.slice(-limit).reverse();
}

export function appendCase(cf: CaseFile): void {
  getStore().cases.push(cf);
  const s = getStore().cases;
  if (s.length > 200) s.splice(0, s.length - 200);
}
