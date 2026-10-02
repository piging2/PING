import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { logEvent } from "@/lib/events";

/**
 * Kit Webhook Handler
 *
 * Receives Kit webhook events and maps them to HPP events.
 * Events flow into HPP first for logging and future analysis by PING.
 *
 * SECURITY (D1 fix):
 * - Requires HMAC-SHA256 signature verification over the RAW request body.
 *   Scheme matches the design in src/lib/kit-adapter.ts `verifyKitSignature`:
 *   header `x-kit-signature: sha256=<hex>` computed with KIT_WEBHOOK_SECRET.
 * - Fail-closed: 503 when KIT_WEBHOOK_SECRET is not configured (the route is
 *   disabled rather than left unauthenticated); 401 when the signature header
 *   is missing or invalid.
 * - Replay protection: events are appended with Kit provenance
 *   (provider/event/subscriber); duplicate deliveries are dropped by the
 *   repository idempotency check instead of creating duplicate events.
 * - The raw body is read with `request.text()` BEFORE JSON parsing so the
 *   HMAC covers the exact bytes the sender signed.
 */

// Kit event name to HPP event type mapping
const KIT_EVENT_MAPPING: Record<string, string> = {
  "subscriber.subscriber_activate": "NewsletterConfirmed",
  "subscriber.subscriber_unsubscribe": "NewsletterConfirmed", // Track unsubscribes
  "subscriber.form_subscribe": "NewsletterSignup",
  "subscriber.link_click": "EmailClicked",
  "subscriber.product_purchase": "CustomerCreated",
};

const SIGNATURE_HEADER = "x-kit-signature";

function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const provided = Buffer.from(signatureHeader.slice("sha256=".length), "utf8");
  const expectedHex = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const expected = Buffer.from(expectedHex, "utf8");
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}

export async function POST(request: NextRequest) {
  // Fail closed: without a configured secret there is nothing to verify
  // against, so the route must not accept events at all.
  const secret = process.env.KIT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Kit Webhook] KIT_WEBHOOK_SECRET not set; webhook disabled");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get(SIGNATURE_HEADER) || "";
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  try {
    const body = JSON.parse(rawBody);

    // Kit webhook structure
    const { event, subscriber } = body;

    if (!event || !subscriber) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const eventName = event.name;
    const eventType = KIT_EVENT_MAPPING[eventName];

    if (eventType) {
      // Map Kit event to HPP event, with provenance for idempotent replay handling
      await logEvent(eventType as any, {
        kitEventName: eventName,
        email: subscriber.email_address,
        subscriberId: subscriber.id,
        firstName: subscriber.first_name,
        state: subscriber.state,
        eventData: event,
      }, {
        acquisitionSource: "kit_webhook",
      }, undefined, {
        provider: "kit",
        eventType: eventName,
        providerObjectId: String(
          event.id ?? `${eventName}:${subscriber.id ?? "unknown"}`
        ),
      });
    } else {
      // Log unknown Kit events for debugging
      console.log("[Kit Webhook] Unmapped event:", eventName);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Kit webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Kit webhooks require GET endpoint for verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "Kit webhook endpoint active" });
}
