import type { BrandGraph, CampaignGraph, ChannelSpec, CaseFile } from "./schemas";
import { buildFullSeed, SEED_PACK_LABEL } from "./seed-data";

type GlobalStore = {
  /** Bump when seed pack changes so dev server reload picks up new data. */
  seedPackVersion: number;
  seedPackLabel: string;
  brands: Map<string, BrandGraph>;
  campaigns: Map<string, CampaignGraph>;
  channels: Map<string, ChannelSpec>;
  cases: CaseFile[];
};

/** Increment to replace in-memory seed on next cold start / first request. */
export const STANDALONE_AGENTIC_OS_SEED_PACK_VERSION = 2;

function emptyStore(): GlobalStore {
  return {
    seedPackVersion: STANDALONE_AGENTIC_OS_SEED_PACK_VERSION,
    seedPackLabel: SEED_PACK_LABEL,
    brands: new Map(),
    campaigns: new Map(),
    channels: new Map(),
    cases: [],
  };
}

function applyFullSeed(s: GlobalStore) {
  const now = new Date().toISOString();
  const { channels, brands, campaigns } = buildFullSeed(now);
  s.channels.clear();
  s.brands.clear();
  s.campaigns.clear();
  for (const ch of channels) s.channels.set(ch.id, ch);
  for (const b of brands) s.brands.set(b.id, b);
  for (const c of campaigns) s.campaigns.set(c.id, c);
}

function getStore(): GlobalStore {
  const g = globalThis as unknown as { __standaloneAgenticOsStore?: GlobalStore };
  if (!g.__standaloneAgenticOsStore) {
    const s = emptyStore();
    applyFullSeed(s);
    g.__standaloneAgenticOsStore = s;
    return s;
  }
  if (g.__standaloneAgenticOsStore.seedPackVersion !== STANDALONE_AGENTIC_OS_SEED_PACK_VERSION) {
    const s = emptyStore();
    applyFullSeed(s);
    g.__standaloneAgenticOsStore = s;
  }
  return g.__standaloneAgenticOsStore;
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

export function getDatasetMeta(): {
  seedPackVersion: number;
  seedPackLabel: string;
  channelCount: number;
  brandCount: number;
  campaignCount: number;
  caseCount: number;
  channels: { id: string; label: string }[];
  brands: { id: string; name: string; version: number }[];
  campaigns: { id: string; name: string; brandId: string; channelSpecId: string }[];
} {
  const s = getStore();
  return {
    seedPackVersion: s.seedPackVersion,
    seedPackLabel: s.seedPackLabel,
    channelCount: s.channels.size,
    brandCount: s.brands.size,
    campaignCount: s.campaigns.size,
    caseCount: s.cases.length,
    channels: [...s.channels.values()].map((c) => ({ id: c.id, label: c.label })),
    brands: [...s.brands.values()].map((b) => ({ id: b.id, name: b.name, version: b.version })),
    campaigns: [...s.campaigns.values()].map((c) => ({
      id: c.id,
      name: c.name,
      brandId: c.brandId,
      channelSpecId: c.channelSpecId,
    })),
  };
}
