/**
 * Minimal middleware: expose the request pathname to server components,
 * and disable experimental product routes from the router.
 *
 * The root layout reads `x-pathname` to decide whether to render the PING
 * marketing chrome. Object routes (/o/*) belong visually to the object, so
 * they render without the PING header and footer.
 *
 * Circle-Only Product Reset (2026-09-22): experimental FYD product routes
 * are disabled from the user-facing router. This changes routing only:
 * the route code, runtime APIs, evidence machinery, and tests are all
 * preserved. Revert by deleting DISABLED_PAGE_PREFIXES and the /o check.
 *
 * Deliberately kept live:
 * - /node/*   (practice surface open_site target)
 * - /embed/*  (chromeless embeds for third-party pages)
 * - /dev/*    (dev lab, not customer-facing)
 * - /fyd      (FYD onboarding entry)
 * - /api/*    (all runtime APIs; never page-disabled)
 */

import { NextRequest, NextResponse } from "next/server";

const DISABLED_PAGE_PREFIXES = [
  "/objects", // /objects, /objects/spatial (lane product surface)
  "/sites", // generated site previews
  "/build", // website builder (out of reset scope)
  "/portal-rail", // geometry fixture
];

function isDisabledPage(pathname: string): boolean {
  // /o and /o/[objectId] (demoted object pages). Matched exactly: no other
  // app route starts with "/o/" or equals "/o".
  if (pathname === "/o" || pathname.startsWith("/o/")) return true;
  return DISABLED_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // API routes are never page-disabled.
  if (!pathname.startsWith("/api/") && isDisabledPage(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|fyd-media).*)"],
};
