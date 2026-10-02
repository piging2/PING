import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { applyGuideDownloadTag, findSubscriberByEmail } from "@/lib/kit";
import { logEvent } from "@/lib/events";

/**
 * Resource download handler.
 *
 * SECURITY (D2 fix):
 * - AUTH: requires `Authorization: Bearer <RESOURCE_DOWNLOAD_TOKEN>`.
 *   Fail-closed: 503 when the token is not configured, 401 when the header
 *   is missing or does not match (timing-safe comparison). This stops
 *   unauthenticated third parties from tagging arbitrary Kit subscribers.
 * - EMAIL VALIDATION: the email must be syntactically valid before any Kit
 *   lookup/tag call is made.
 * - URL ALLOWLIST: `resourceUrl` is no longer reflected blindly. It must be
 *   an absolute URL whose host is allowlisted via RESOURCE_DOWNLOAD_ALLOWED_HOSTS
 *   (comma-separated), or — when that env var is unset — the request's own
 *   host. Anything else is rejected with 400. This closes the open redirect.
 */

const TOKEN_ENV_VAR = "RESOURCE_DOWNLOAD_TOKEN";
const ALLOWED_HOSTS_ENV_VAR = "RESOURCE_DOWNLOAD_ALLOWED_HOSTS";

function isValidEmail(email: string): boolean {
  if (typeof email !== "string" || email.length === 0 || email.length > 254) {
    return false;
  }
  // Pragmatic format check: local@domain.tld, no whitespace, single @.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isUrlAllowlisted(resourceUrl: string, request: NextRequest): boolean {
  let parsed: URL;
  try {
    parsed = new URL(resourceUrl);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (parsed.protocol === "http:" && !isLoopback) {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }
  const configured = (process.env[ALLOWED_HOSTS_ENV_VAR] || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length > 0) {
    return configured.includes(host);
  }
  // Default: only the site's own host may serve downloads.
  return host === new URL(request.url).hostname.toLowerCase();
}

function bearerTokenValid(request: NextRequest, expected: string): boolean {
  const header = request.headers.get("authorization") || "";
  const prefix = "bearer ";
  if (!header.toLowerCase().startsWith(prefix)) {
    return false;
  }
  const provided = Buffer.from(header.slice(prefix.length).trim(), "utf8");
  const want = Buffer.from(expected, "utf8");
  if (provided.length !== want.length) {
    return false;
  }
  return timingSafeEqual(provided, want);
}

export async function POST(request: NextRequest) {
  // Fail closed: without a configured token there is no way to authenticate.
  const token = process.env[TOKEN_ENV_VAR];
  if (!token) {
    console.error("[Resource Download] RESOURCE_DOWNLOAD_TOKEN not set; route disabled");
    return NextResponse.json(
      { error: "Resource download not configured" },
      { status: 503 }
    );
  }
  if (!bearerTokenValid(request, token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, resourceTitle, resourceUrl } = body;

    // Validate input
    if (!email || !resourceTitle) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }
    if (resourceUrl !== undefined && !isUrlAllowlisted(resourceUrl, request)) {
      return NextResponse.json(
        { error: "resourceUrl is not allowlisted" },
        { status: 400 }
      );
    }

    // Apply "Downloaded Guide" tag
    try {
      const subscriber = await findSubscriberByEmail(email);
      if (subscriber?.id) {
        await applyGuideDownloadTag(subscriber.id);
      }
    } catch (kitError) {
      console.error("Kit tagging failed (non-critical):", kitError);
    }

    // Log HPP event
    const url = new URL(request.url);
    logEvent("GuideDownloaded", {
      email,
      resourceTitle,
      resourceUrl,
    }, {
      acquisitionSource: "resource_download",
      landingPage: request.url,
      referrer: request.headers.get("referer") || undefined,
      utmSource: url.searchParams.get("utm_source") || undefined,
      utmMedium: url.searchParams.get("utm_medium") || undefined,
      utmCampaign: url.searchParams.get("utm_campaign") || undefined,
      utmContent: url.searchParams.get("utm_content") || undefined,
      utmTerm: url.searchParams.get("utm_term") || undefined,
    });

    return NextResponse.json({
      success: true,
      downloadUrl: resourceUrl,
    });
  } catch (error) {
    console.error("Resource download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
