// app/api/federation/preview/[identifier]/route.ts
//
// Verification aid: shows EXACTLY what the actor dispatcher would project
// for an identifier, by running the real Federation fetch path internally.
// Used by Lane D to review projections without any fediverse tooling.
//
// Token-gated (PING_FEDERATION_PREVIEW_TOKEN) and flag-gated. It reveals
// only what the public actor endpoint would reveal, but it stays gated
// because it is an operator tool, not a public page.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { federation } from "../../../../lib/federation/federation";

export async function GET(
  request: NextRequest,
  { params }: { params: { identifier: string } },
) {
  if (process.env.PING_FEDERATION_ENABLED !== "1") {
    return NextResponse.json({ error: "federation disabled" }, { status: 404 });
  }
  const token = process.env.PING_FEDERATION_PREVIEW_TOKEN;
  const provided = request.nextUrl.searchParams.get("key");
  if (!token || provided !== token) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const origin = process.env.FEDIFY_ORIGIN as string;
  const actorUrl = `${origin}/users/${encodeURIComponent(params.identifier)}`;
  const fedRequest = new Request(actorUrl, {
    headers: { accept: "application/activity+json" },
  });
  const res = await federation.fetch(fedRequest, undefined);
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type":
        res.headers.get("content-type") ?? "application/activity+json",
    },
  });
}
