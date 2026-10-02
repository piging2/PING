// app/.well-known/webfinger/route.ts
//
// Explicit WebFinger route. Fedify also serves WebFinger through the
// middleware path; this route exists as a stable, flag-aware integration
// point for verification (the `fedify webfinger` CLI) and for clients that
// do not send the Accept headers the middleware matcher requires.
//
// Both paths delegate to the SAME Federation instance, so they cannot
// diverge. When the feature flag is off, this route returns 404.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { federation } from "../../../lib/federation/federation";

export async function GET(request: NextRequest) {
  if (process.env.PING_FEDERATION_ENABLED !== "1") {
    return NextResponse.json({ error: "federation disabled" }, { status: 404 });
  }
  const origin = process.env.FEDIFY_ORIGIN as string;
  const url = new URL("/.well-known/webfinger", origin);
  url.search = request.nextUrl.search;
  const fedRequest = new Request(url.toString(), {
    headers: { accept: "application/jrd+json" },
  });
  return federation.fetch(fedRequest, undefined);
}
