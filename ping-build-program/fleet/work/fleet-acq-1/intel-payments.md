# Connector intel - payments domain (reference platform: Stripe)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
REST at https://api.stripe.com/v1/. Core: PaymentIntent, Charge, Customer, Invoice, Subscription, Price, Product, PaymentMethod, Refund, Dispute, BalanceTransaction. Every object has id, object, created, livemode, metadata{}.
Sources: https://docs.stripe.com/api ; https://docs.stripe.com/rate-limits

## EVENTS
Event objects (evt_*) for every state change: payment_intent.succeeded, charge.refunded, invoice.paid, customer.subscription.deleted, etc. Listed via /v1/events with type filters.
Sources: https://docs.stripe.com/api/events ; https://docs.stripe.com/rate-limits

## CAPABILITIES
Create/confirm/capture PaymentIntents, charges, refunds, invoices, subscriptions, customers, payouts, disputes evidence, Sigma queries. Test clocks for time travel in test mode.
Sources: https://docs.stripe.com/api ; https://docs.stripe.com/rate-limits

## AUTHORIZATION
Secret key (sk_live_/sk_test_) per account; restricted keys with granular permissions; OAuth for Connect platforms. Publishable key is client-safe and payment-only.
Sources: https://docs.stripe.com/security/guide ; https://docs.stripe.com/rate-limits

## WEBHOOKS
HTTPS endpoints receive signed Event payloads; verify with Stripe-Signature header and endpoint secret (tolerance on timestamp). Retries with exponential backoff for days on non-2xx.
Sources: https://docs.stripe.com/webhooks ; https://docs.stripe.com/rate-limits

## POLLING
List endpoints with limit + starting_after cursors; created filters for time windows. /v1/events polling is the fallback when webhooks are unavailable.
Sources: https://docs.stripe.com/api ; https://docs.stripe.com/rate-limits

## RATE-LIMITS
Documented rate limits (see the rate-limits page; live-mode defaults with burst allowances). Exceeding returns 429. Verify current values in the docs before hard-coding.
Sources: https://docs.stripe.com/rate-limits

## IDEMPOTENCY
Native Idempotency-Key header on POSTs: same key + same params returns the original response without re-executing. Keys are scoped per account and retained 24h.
Sources: https://docs.stripe.com/api/idempotent_requests ; https://docs.stripe.com/rate-limits

## EFFECTS
Money movement: charges, captures, refunds, payouts, subscription billing. Side effects: webhook events, invoice emails, dispute windows. Reads are side-effect-free.
Sources: https://docs.stripe.com/api ; https://docs.stripe.com/rate-limits

## REVERSIBILITY
Charges reversible via refunds (full/partial); authorizations voidable before capture. Refunds and captured payments cannot be 'un-refunded'. Disputes have evidence deadlines.
Sources: https://docs.stripe.com/api ; https://docs.stripe.com/rate-limits

## PROVENANCE
Every object has id + created timestamp; BalanceTransaction links money movement; Event objects carry the full before/after via previous_attributes on relevant types; metadata{} is client-set.
Sources: https://docs.stripe.com/api ; https://docs.stripe.com/rate-limits

