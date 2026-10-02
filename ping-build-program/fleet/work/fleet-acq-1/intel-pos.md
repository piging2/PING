# Connector intel - pos domain (reference platform: Square)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Payments, Orders (line items, taxes, discounts, fulfillments), Customers, Catalog (items, variations, pricing), Locations, Invoices, Refunds, Inventory. REST at https://connect.squareup.com/v2/. Money in minor units.
Sources: https://developer.squareup.com/docs/payments-api/overview ; https://developer.squareup.com/docs/orders-api/what-it-does

## EVENTS
Webhooks: payment.created/updated, order.created/updated, refund.created/updated, inventory.count.updated, customer.created. Payment data nested under data.object.payment.
Sources: https://developer.squareup.com/docs/payments-api/webhooks ; https://developer.squareup.com/docs/webhooks/overview

## CAPABILITIES
Take payments, manage orders, refunds, invoices, catalog sync, customer profiles, inventory counts, gift cards, loyalty. Sandbox for testing.
Sources: https://developer.squareup.com/docs

## AUTHORIZATION
Personal access tokens for single-merchant; OAuth 2.0 (authorization code grant, scopes like PAYMENTS_WRITE) for multi-merchant. Sandbox vs production credentials.
Sources: https://developer.squareup.com/docs/oauth-api/overview

## WEBHOOKS
Subscriptions configured in Developer Dashboard with notification URL. x-square-hmacsha256-signature (HMAC-SHA256 of raw body + URL with signature key). Verify before parsing. Fulfill only on COMPLETED payments.
Sources: https://developer.squareup.com/docs/webhooks/overview

## POLLING
List payments/orders with begin_time/end_time filters and cursors. Webhook-first, poll for reconciliation.
Sources: https://developer.squareup.com/docs/payments-api/overview

## RATE-LIMITS
Rate limits per API documented by Square; 429 on excess with backoff. Verify current values in the docs.
Sources: https://developer.squareup.com/docs

## IDEMPOTENCY
idempotency_key REQUIRED on payment/order creation; Square dedups within 24h. Safe retry = reuse the same key.
Sources: https://developer.squareup.com/docs/payments-api/overview

## EFFECTS
Charging cards (money movement), refunds, order state changes, inventory decrements, invoice sending. Reads are side-effect-free.
Sources: https://developer.squareup.com/docs/payments-api/overview

## REVERSIBILITY
Payments refundable (partial/full); completed charges not reversible except by refund. Inventory counts correctable; catalog edits versioned in change log.
Sources: https://developer.squareup.com/docs

## PROVENANCE
Payment/order IDs stable; event_id on webhooks for dedup; version fields on objects (optimistic concurrency); location_id scopes every transaction.
Sources: https://developer.squareup.com/docs/webhooks/overview

