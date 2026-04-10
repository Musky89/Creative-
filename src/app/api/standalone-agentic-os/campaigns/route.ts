import { NextResponse } from "next/server";
import { z } from "zod";
import { isStandaloneAgenticOsEnabled } from "@/lib/standalone-agentic-os/flags";
import { campaignGraphSchema } from "@/lib/standalone-agentic-os/schemas";
import { listCampaigns, putCampaign } from "@/lib/standalone-agentic-os/store";

export async function GET() {
  if (!isStandaloneAgenticOsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ campaigns: listCampaigns() });
}

const createSchema = campaignGraphSchema.omit({ version: true, updatedAt: true }).extend({
  id: z.string().min(1).optional(),
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const now = new Date().toISOString();
  const id = parsed.data.id ?? `camp-${Date.now()}`;
  const existing = listCampaigns().find((c) => c.id === id);
  const campaign = campaignGraphSchema.parse({
    ...parsed.data,
    id,
    version: (existing?.version ?? 0) + 1,
    updatedAt: now,
  });
  putCampaign(campaign);
  return NextResponse.json({ campaign });
}
