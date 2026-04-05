import { NextResponse } from "next/server";
import {
  buildStudioExportJson,
  buildStudioExportMarkdown,
} from "@/server/export/studio-export";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ briefId: string }> },
) {
  const { briefId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId")?.trim();
  const format = searchParams.get("format")?.toLowerCase() ?? "json";

  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Missing clientId query parameter." },
      { status: 400 },
    );
  }

  if (format === "json") {
    const pack = await buildStudioExportJson(briefId, clientId);
    if (!pack) {
      return NextResponse.json({ ok: false, error: "Brief not found." }, {
        status: 404,
      });
    }
    return new NextResponse(pack.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${pack.filename}"`,
      },
    });
  }

  if (format === "markdown" || format === "md") {
    const pack = await buildStudioExportMarkdown(briefId, clientId);
    if (!pack) {
      return NextResponse.json({ ok: false, error: "Brief not found." }, {
        status: 404,
      });
    }
    return new NextResponse(pack.body, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${pack.filename}"`,
      },
    });
  }

  return NextResponse.json(
    { ok: false, error: "Invalid format. Use json or markdown." },
    { status: 400 },
  );
}
