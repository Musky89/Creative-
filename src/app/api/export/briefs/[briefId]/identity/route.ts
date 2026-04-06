import { NextResponse } from "next/server";
import { getBriefForClient } from "@/server/domain/briefs";
import {
  buildIdentityDeliveryManifest,
  buildIdentityDeliveryPdf,
  buildIdentityFullJsonPayload,
  buildSelectedRouteMarkdown,
  buildStrategySummary,
  latestArtifactContent,
} from "@/server/export/identity-delivery-builders";
import { buildIdentityDeliveryZip } from "@/server/export/identity-delivery-zip";
import { stripMeta } from "@/server/export/studio-export";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ briefId: string }> },
) {
  try {
    const { briefId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId")?.trim();
    const format = (searchParams.get("format") ?? "zip").toLowerCase();

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "Missing clientId query parameter." },
        { status: 400 },
      );
    }

    const brief = await getBriefForClient(briefId, clientId);
    if (!brief) {
      return NextResponse.json({ ok: false, error: "Brief not found." }, {
        status: 404,
      });
    }

    if (!brief.identityWorkflowEnabled) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Identity export is only available when identity workflow is enabled for this brief.",
        },
        { status: 400 },
      );
    }

    const tasks = brief.tasks.map((t) => ({
      stage: t.stage,
      artifacts: t.artifacts.map((a) => ({
        type: a.type,
        version: a.version,
        content: a.content,
      })),
    }));

    const input = {
      briefId: brief.id,
      clientId: brief.clientId,
      briefTitle: brief.title,
      clientName: brief.client.name,
      deadline: brief.deadline,
      identityWorkflowEnabled: brief.identityWorkflowEnabled,
      tasks,
    };

    const manifest = buildIdentityDeliveryManifest(input);
    if (!manifest) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No identity artifacts yet. Complete Identity strategy and routes stages first.",
        },
        { status: 400 },
      );
    }

    const strategyRaw = latestArtifactContent(
      tasks,
      "IDENTITY_STRATEGY",
      "IDENTITY_STRATEGY",
    );
    const routesRaw = latestArtifactContent(
      tasks,
      "IDENTITY_ROUTING",
      "IDENTITY_ROUTES_PACK",
    );
    const strategy = strategyRaw ? stripMeta(strategyRaw) : null;
    const routesPack = routesRaw ? stripMeta(routesRaw) : null;

    const strategyMd = strategy
      ? buildStrategySummary(strategy)
      : "_No identity strategy artifact._";

    let selectedRoute: Record<string, unknown> | null = null;
    let selectedIndex: number | null = null;
    if (routesPack && Array.isArray(routesPack.routes)) {
      const idx = routesPack.founderPreferredRouteIndex;
      if (typeof idx === "number" && Number.isInteger(idx) && idx >= 0) {
        const r = routesPack.routes[idx];
        if (isRecord(r)) {
          selectedIndex = idx;
          selectedRoute = r;
        }
      }
    }
    const feedback =
      typeof routesPack?.founderRouteFeedback === "string"
        ? routesPack.founderRouteFeedback
        : null;
    const routeMd = buildSelectedRouteMarkdown(
      selectedRoute,
      selectedIndex,
      feedback,
    );

    const safeTitle = brief.title.replace(/[^\w\d-]+/g, "-").slice(0, 40);

    if (format === "zip" || format === "package") {
      const pack = await buildIdentityDeliveryZip(input);
      if (!pack) {
        return NextResponse.json(
          { ok: false, error: "Failed to build identity package." },
          { status: 500 },
        );
      }
      return new NextResponse(new Uint8Array(pack.buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${pack.filename}"`,
        },
      });
    }

    if (format === "json") {
      const body = buildIdentityFullJsonPayload(manifest, strategy, routesPack);
      const filename = `identity-package-${safeTitle}-${briefId.slice(0, 8)}.json`;
      return new NextResponse(JSON.stringify(body, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "pdf") {
      const pdfBytes = await buildIdentityDeliveryPdf(
        manifest,
        strategyMd,
        routeMd,
      );
      const filename = `identity-delivery-${safeTitle}-${briefId.slice(0, 8)}.pdf`;
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "markdown" || format === "md") {
      const body = [
        `# Identity delivery — ${brief.title}`,
        "",
        `**Client:** ${brief.client.name}  `,
        `**Exported:** ${manifest.exportedAt}  `,
        "",
        "---",
        "",
        strategyMd,
        "",
        "---",
        "",
        routeMd,
        "",
      ].join("\n");
      const filename = `identity-delivery-${safeTitle}-${briefId.slice(0, 8)}.md`;
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Invalid format. Use zip, json, pdf, or markdown.",
      },
      { status: 400 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[agenticforce:identity-export] failed:", msg);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Identity export failed. Check server logs and database connectivity.",
      },
      { status: 500 },
    );
  }
}
