# Connector intel — POS domain (reference platform: Square)

Mapped from public docs; implementation stays data-driven. Provider: Square.
Base: https://connect.squareup.com/v2 ; SDKs generated per language.

## OBJECTS
Orders (id, location_id, line_items, taxes, discounts, fulfillments, version —
optimistic-locking counter, state OPEN/COMPLETED/CANCELED), Payments (id,
order_id, amount_money, status APPROVED/COMPLETED/CANCELED/FAILED, card_details,
receipt_url), Refunds, Terminal checkouts/devices, Customers, Catalog
(items/variations shared with inventory), Locations, Employees, Disputes.
Payment identity: payment id + idempotency_key (client-supplied).
Sources: https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md ;
https://github.com/comexpert-mic/square-python-sdk/blob/HEAD/reference.md

## EVENTS
Webhooks v2 (GA): subscribe to payment.created/payment.updated, order.created/
updated, refund.created/updated, terminal.checkout.updated, inventory.count.
updated, etc. For OAuth-connected seller accounts, events fire on the SaaS
account's endpoint and appear in its webhook logs. Event subscriptions require
the matching OAuth scopes (e.g. PAYMENTS_READ for payment events — missing
scope = silent no-delivery, a classic misconfiguration). Polling fallback:
SearchOrders (partitioned by location, 1,000/page), ListPayments with cursors.
Sources: https://developer.squareup.com/forums/t/receiving-webhook-events-for-oauth-connected-accounts/21714 ;
https://github.com/teradata/airbyte/blob/HEAD/docs/integrations/sources/square.md

## CAPABILITIES
Orders: create/search/batch-retrieve/update (versioned)/pay. Payments:
createPayment (card on file, card nonce), cancel/complete, refunds (full/
partial), list/get. Terminal API: create terminal checkouts for in-person.
Customers CRUD, gift cards, loyalty. Disputes: accept (returns funds to
cardholder; debits seller, then bank if insufficient). Invoices via API with
payment links.
Sources: https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md ;
https://pub.dev/packages/square_connect/versions/0.2.6 ;
https://learn.microsoft.com/en-us/connectors/squarepaymentsip/

## AUTHORIZATION
OAuth 2.0 with granular scopes per surface: PAYMENTS_READ/WRITE, ORDERS_READ/
WRITE, INVENTORY_READ/WRITE, CUSTOMERS_READ/WRITE, MERCHANT_PROFILE_READ, etc.
Scope gaps cause silent feature loss (payment webhooks need PAYMENTS_READ).
Personal access tokens for single-seller dev. OAuth supports multi-seller SaaS.
Request smallest scope set (standing rule 1); money-moving scopes are the most
sensitive in this provider.
Source: https://developer.squareup.com/forums/t/receiving-webhook-events-for-oauth-connected-accounts/21714

## WEBHOOKS
v2 webhooks (v1 webhooks deprecated): HTTPS endpoints, event types per surface,
delivered to the app's endpoint for all OAuth-connected sellers. Verify
signatures per Square docs (HMAC with webhook signature key — verify current
mechanism at build time). Dedupe by event_id; ack fast; reconcile via
SearchOrders/ListPayments. Note: scope misconfiguration yields silent
non-delivery — monitor webhook logs in the developer dashboard.
Sources: https://developer.squareup.com/forums/t/receiving-webhook-events-for-oauth-connected-accounts/21714 ;
https://developer.squareup.com/docs/changelog/connect-logs/2020-05-28

## POLLING
SearchOrders (location-partitioned, page size 1,000) for backfill; ListPayments
with cursor pagination; batchRetrieveOrders for targeted fetches. The Orders
stream is the reconciliation backstop behind payment/order webhooks. Polling
cadence modest; dynamic rate limiting punishes aggressive polling.
Source: https://github.com/teradata/airbyte/blob/HEAD/docs/integrations/sources/square.md

## RATE LIMITS
Dynamic rate limiting: varies by endpoint and current API load (no fixed
published numbers). 429 Too Many Requests: back off (30s constant backoff used
by one production connector; exponential backoff with jitter recommended).
Treat every 429 as binding; keep polling modest and prefer webhooks.
Sources: https://github.com/teradata/airbyte/blob/HEAD/docs/integrations/sources/square.md ;
https://developer.squareup.com/forums/t/current-square-api-rate-limit/449 (referenced)

## IDEMPOTENCY
NATIVE: createPayment (and most mutating endpoints) accept a client-supplied
idempotency_key — Square guarantees at-most-once execution per key; reuse the
same key across retries. cancelPaymentByIdempotencyKey exists. Orders use the
version field for optimistic locking (updateOrder requires current version:
prevents lost updates). Webhook handlers dedupe by event_id. This is the
strongest retry contract among the commerce providers mapped.
Sources: https://pub.dev/packages/square_connect/versions/0.2.6
(cancelPaymentByIdempotencyKey, updateOrder version) ;
https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md

## EFFECTS
createPayment CHARGES real cards (money movement); payOrder settles orders;
refunds return money; disputes/accept moves funds to the cardholder (debits
seller, then their bank). Terminal checkouts initiate in-person charges.
Reads (search/list/get) side-effect-free. Connector contract: every
money-moving call behind explicit policy + human approval (T lane).

## REVERSIBILITY
Payments cannot be un-charged: reversal is via refundPayment (full/partial —
a new money movement, subject to its own settlement timing) or void before
capture (cancelPayment). Dispute accept is final (funds gone). Orders can be
canceled while OPEN. Model payments as append-only financial facts with
compensating refunds, never as reversible writes.

## PROVENANCE
Payment id + idempotency_key (client lineage), order_id linkage, version
counter on orders (optimistic-lock history), status timelines (payment.created/
updated webhooks), receipt_url, card fingerprints (NOT raw PANs), location_id
(where the money moved), refunds linked to original payment id, disputes with
state transitions. Full money-movement lineage available.
Sources: https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md ;
https://learn.microsoft.com/en-us/connectors/squarepaymentsip/
