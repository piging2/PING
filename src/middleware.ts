/**
 * Minimal middleware: expose the request pathname to server components,
 * and restrict the website builder route.
 *
 * The root layout reads `x-pathname` to decide whether to render the PING
 * marketing chrome. Object routes (/o/*) belong visually to the object, so
 * they render without the PING header and footer.
 *
 * /build restriction (deploy hardening, 2026-09-22): the website builder
 * (/build, /build/*) is an owner-mode surface and must not be publicly
 * reachable on deployed Previews. This block is deliberately narrow: only
 * /build and /build/* are affected. Every other route keeps its HEAD
 * behavior, including /sites/happy-place, /sites/coppersmith-plumbing,
 * /objects/*, /o/*, /node/*, /embed/*, /dev/*, /fyd, and /api/*.
 */

import { NextRequest, NextResponse } from "next/server";

function isBuildRoute(pathname: string): boolean {
  return pathname === "/build" || pathname.startsWith("/build/");
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isBuildRoute(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|fyd-media).*)"],
};
