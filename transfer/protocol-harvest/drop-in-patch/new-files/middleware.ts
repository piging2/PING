// middleware.ts
//
// Federation middleware hookup. Flag-aware: when PING_FEDERATION_ENABLED is
// not "1", every request passes straight through to the site and federation
// behaves as if it did not exist.
//
// MERGE NOTE: if this repo already has a middleware.ts, do NOT create a
// second one. Merge instead: wrap the existing middleware export with the
// fedifyWith(federation)(existingMiddleware) pattern shown in the Fedify
// docs, keeping the flag check below. There must be exactly one middleware.
//
// Next.js 16: prefer proxy.ts over middleware.ts. If you rename this file
// to proxy.ts, remove `runtime: "nodejs"` from the exported config, because
// Proxy always runs on the Node.js runtime.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fedifyWith } from "@fedify/next";
import { federation } from "./lib/federation/federation";

const fedifyMiddleware = fedifyWith(federation)();

export default function middleware(request: NextRequest) {
  if (process.env.PING_FEDERATION_ENABLED !== "1") {
    return NextResponse.next();
  }
  return fedifyMiddleware(request);
}

export const config = {
  runtime: "nodejs",
  matcher: [
    {
      source: "/:path*",
      has: [
        {
          type: "header",
          key: "Accept",
          value: ".*application\\/((jrd|activity|ld)\\+json|xrd\\+xml).*",
        },
      ],
    },
    {
      source: "/:path*",
      has: [
        {
          type: "header",
          key: "content-type",
          value: ".*application\\/((jrd|activity|ld)\\+json|xrd\\+xml).*",
        },
      ],
    },
    { source: "/.well-known/nodeinfo" },
    { source: "/.well-known/x-nodeinfo2" },
  ],
};
