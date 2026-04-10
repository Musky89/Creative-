import { NextResponse } from "next/server";
import { z } from "zod";
import { isStandaloneAgenticOsEnabled } from "@/lib/standalone-agentic-os/flags";
import { runFullCase } from "@/lib/standalone-agentic-os/pipeline";
import { getBrand, getCampaign, getChannel, listCases } from "@/lib/standalone-agentic-os/store";

export async function GET() {
  if (!isStandaloneAgenticOsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ cases: listCases(40) });
}

const runSchema = z.object({
  brandId: z.string().min(1),
  campaignId: z.string().min(1),
  maxRevisions: z.number().int().min(0).max(3).optional(),
});

export async function POST(req: Request) {
  if (!isStandaloneAgenticOsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const brand = getBrand(parsed.data.brandId);
  const campaign = getCampaign(parsed.data.campaignId);
  if (!brand || !campaign) {
    return NextResponse.json({ error: "Brand or campaign not found" }, { status: 404 });
  }
  if (campaign.brandId !== brand.id) {
    return NextResponse.json({ error: "Campaign brandId mismatch" }, { status: 422 });
  }
  const channel = getChannel(campaign.channelSpecId);
  if (!channel) {
    return NextResponse.json({ error: "Channel spec not found" }, { status: 404 });
  }
  try {
    const caseFile = await runFullCase({
      brand,
      campaign,
      channel,
      maxRevisions: parsed.data.maxRevisions,
    });
    return NextResponse.json({ case: caseFile });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
