import type { BrandGraph, CampaignGraph, ChannelSpec } from "./schemas";
import {
  creativeProposalSchema,
  criticVerdictSchema,
  type CreativeProposal,
  type CriticVerdict,
  type CaseFile,
} from "./schemas";
import { runVerification } from "./verification";
import { appendCase } from "./store";

function extractJsonObject(text: string): unknown {
  const t = text.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(t.slice(start, end + 1)) as unknown;
}

async function openaiJson(args: {
  system: string;
  user: string;
}): Promise<unknown> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return extractJsonObject(content);
}

export function generateProposalDeterministic(
  brand: BrandGraph,
  campaign: CampaignGraph,
  channel: ChannelSpec,
): CreativeProposal {
  const words = campaign.singleMindedProposition.split(/\s+/).filter(Boolean);
  const h = words.slice(0, 10).join(" ").slice(0, channel.maxHeadlineChars) || "Your outcome, simplified";
  return creativeProposalSchema.parse({
    headline: h,
    subhead: campaign.objective.slice(0, 120),
    cta: "Start free trial".slice(0, channel.maxCtaChars),
    visualBrief: [
      `Mood aligned to: ${brand.voiceSummary.slice(0, 120)}`,
      `Palette: ${brand.palette.map((p) => p.hex).join(", ")}`,
      `Channel: ${channel.label} — bold type-safe zone, single hero subject.`,
    ].join(" "),
    rationale: `Anchored to SMP: ${campaign.singleMindedProposition.slice(0, 200)}`,
  });
}

export async function generateProposal(
  brand: BrandGraph,
  campaign: CampaignGraph,
  channel: ChannelSpec,
): Promise<{ proposal: CreativeProposal; llm: boolean }> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { proposal: generateProposalDeterministic(brand, campaign, channel), llm: false };
  }
  const system = `You are a senior creative. Output a single JSON object with keys: headline, subhead (optional string), cta, visualBrief (string), rationale (string). Respect channel limits: headline max ${channel.maxHeadlineChars} characters, CTA max ${channel.maxCtaChars} characters. Never use banned phrases from the brand pack.`;
  const user = JSON.stringify({
    brand: {
      name: brand.name,
      voice: brand.voiceSummary,
      mustSignal: brand.mustSignal,
      mustAvoid: brand.mustAvoid,
      bannedPhrases: brand.bannedPhrases,
      palette: brand.palette,
    },
    campaign: {
      objective: campaign.objective,
      audience: campaign.audience,
      smp: campaign.singleMindedProposition,
      proofPoints: campaign.proofPoints,
    },
    channel: { label: channel.label, maxHeadlineChars: channel.maxHeadlineChars, maxCtaChars: channel.maxCtaChars },
  });
  const raw = await openaiJson({ system, user });
  const proposal = creativeProposalSchema.parse(raw);
  return { proposal, llm: true };
}

export function criticDeterministic(
  proposal: CreativeProposal,
  brand: BrandGraph,
  verificationPassed: boolean,
): CriticVerdict {
  const issues: string[] = [];
  if (!verificationPassed) issues.push("Automated verification failed — see checks.");
  const blob = `${proposal.headline} ${proposal.visualBrief}`.toLowerCase();
  for (const p of brand.bannedPhrases) {
    if (p && blob.includes(p.toLowerCase())) issues.push(`Banned phrase leaked: "${p}"`);
  }
  const overall =
    issues.length === 0 && verificationPassed ? "strong" : issues.length <= 1 ? "acceptable" : "weak";
  return criticVerdictSchema.parse({
    overall,
    onBrandScore: verificationPassed && issues.length === 0 ? 9 : issues.length === 0 ? 7 : 5,
    issues,
    regenerationRecommended: !verificationPassed || issues.length > 0,
    revisionHints: verificationPassed
      ? ["Tighten visualBrief to one decisive art-direction sentence."]
      : ["Shorten headline or CTA", "Remove banned language", "Fix palette roles for contrast"],
  });
}

export async function runCritic(
  proposal: CreativeProposal,
  brand: BrandGraph,
  campaign: CampaignGraph,
  verificationPassed: boolean,
): Promise<{ critic: CriticVerdict; llm: boolean }> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { critic: criticDeterministic(proposal, brand, verificationPassed), llm: false };
  }
  const system = `You are a harsh brand guardian. Output JSON only: overall ("strong"|"acceptable"|"weak"|"fail"), onBrandScore (0-10 number), issues (string array), regenerationRecommended (boolean), revisionHints (string array). Be strict on generic marketing and brand violations.`;
  const user = JSON.stringify({
    brand: { voice: brand.voiceSummary, mustAvoid: brand.mustAvoid, banned: brand.bannedPhrases },
    campaign: { smp: campaign.singleMindedProposition },
    proposal,
    verificationPassed,
  });
  const raw = await openaiJson({ system, user });
  const critic = criticVerdictSchema.parse(raw);
  return { critic, llm: true };
}

export async function runFullCase(args: {
  brand: BrandGraph;
  campaign: CampaignGraph;
  channel: ChannelSpec;
  maxRevisions?: number;
}): Promise<CaseFile> {
  const maxRev = Math.min(3, Math.max(0, args.maxRevisions ?? 1));
  let proposal: CreativeProposal;
  let llmUsed = false;
  const gen = await generateProposal(args.brand, args.campaign, args.channel);
  proposal = gen.proposal;
  llmUsed = gen.llm;

  let revisionCount = 0;
  let verification = runVerification({
    brand: args.brand,
    campaign: args.campaign,
    channel: args.channel,
    proposal,
  });
  let criticPack = await runCritic(proposal, args.brand, args.campaign, verification.passed);
  if (criticPack.llm) llmUsed = true;

  while (
    revisionCount < maxRev &&
    (!verification.passed || criticPack.critic.regenerationRecommended)
  ) {
    revisionCount += 1;
    proposal = generateProposalDeterministic(args.brand, args.campaign, args.channel);
    if (criticPack.critic.revisionHints[0]) {
      proposal = {
        ...proposal,
        headline: proposal.headline.slice(0, args.channel.maxHeadlineChars - 3) + "…",
        cta: proposal.cta.slice(0, args.channel.maxCtaChars),
        visualBrief: `${criticPack.critic.revisionHints[0]} — ${proposal.visualBrief}`.slice(0, 800),
      };
    }
    verification = runVerification({
      brand: args.brand,
      campaign: args.campaign,
      channel: args.channel,
      proposal,
    });
    criticPack = await runCritic(proposal, args.brand, args.campaign, verification.passed);
    if (criticPack.llm) llmUsed = true;
  }

  const caseFile: CaseFile = {
    id: `case-${Date.now()}`,
    createdAt: new Date().toISOString(),
    brandId: args.brand.id,
    brandVersion: args.brand.version,
    campaignId: args.campaign.id,
    campaignVersion: args.campaign.version,
    proposal,
    critic: criticPack.critic,
    verification,
    revisionCount,
    llmUsed,
  };
  appendCase(caseFile);
  return caseFile;
}
