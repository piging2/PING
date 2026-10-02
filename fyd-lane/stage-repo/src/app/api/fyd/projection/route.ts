import { NextResponse } from "next/server";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/fyd/projection?siteId=<slug>
 *
 * Serves the PING-backed projection for a demo site: the canonical object
 * graph plus the dump meta (base digest, overlay PING event ids, graph
 * digest). This is the read seam between PING state and the website.
 *
 * The projection is produced by the PING-side dump
 * (/home/nolan/ping/tools/fyd-site-projection/dump.py), never hand-authored.
 * A missing or tampered projection is a 503, never a stale fallback.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const siteId = new URL(request.url).searchParams.get("siteId")?.trim() ?? "";
  if (!siteId) {
    return NextResponse.json(
      { ok: false, error: "siteId query parameter is required." },
      { status: 400 },
    );
  }
  try {
    const { graph, meta } = await getPingObjectGraph(siteId);
    return NextResponse.json({ ok: true, siteId, meta, graph });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Projection unavailable.";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
