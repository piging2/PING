# Connector intel — Payments domain (reference platform: Stripe API)

Mapped from public docs; implementation stays data-driven. Provider: Stripe.
Base: https://api.stripe.com/v1/; auth: secret key (sk_live_/sk_test_) as basic-auth
username or Bearer <redacted>; API version pinning via Stripe-Version header recommended.

## OBJECTS
Core objects: PaymentIntent, Charge, Customer, Invoice, Subscription, Price,
Product, BalanceTransaction, Payout, Refund, Dispute, Checkout Session, PaymentMethod,
Event, WebhookEndpoint. Uniform shape: id (pi_/ch_/cus_/in_/sub_...), object,
created (unix ts), livemode, metadata (free-form key-value, safe for connector
bookkeeping), expandable nested resources, list endpoints with starting_after /
ending_before cursor pagination (default limit 10, max 100).
Sources: https://github.com/ashish7802/awesome-api-skills/blob/HEAD/skills/stripe/SKILL.md ;
https://github.com/estuary/connectors/blob/HEAD/source-stripe-native/CLAUDE.md

## EVENTS
First-class event stream: /v1/events list endpoint (all account events,
retained 30 days), each with id, type (payment_intent.succeeded,
charge.refunded, invoice.payment_failed, customer.subscription.deleted, ...),
data.object snapshot, api_version, livemode, pending_webhooks count.
Reconciliation pattern: backfill via /v1/<resource> list endpoints, incremental
poll via /v1/events. Webhooks deliver the same Event objects to your endpoint.
Sources: https://github.com/estuary/connectors/blob/HEAD/source-stripe-native/CLAUDE.md
(list+events polling pattern) ; https://github.com/untadotmy/keel/blob/HEAD/stripe-integration/SKILL.md
(reconciliation job pattern, drift sources)

## CAPABILITIES
Full CRUD on customers/products/prices; payment lifecycle (create/confirm/capture/
cancel PaymentIntent, create/expire Checkout Session); refunds (full/partial);
disputes evidence submission; payouts management; subscriptions (create/cancel/
schedule, proration control, cancel_at_period_end); invoices (finalize/void/pay);
webhook endpoints CRUD (up to N endpoints per account); balance + balance
transactions reads; Sigma/reporting reads. Side-effect-free reads: balance,
list endpoints, /v1/events.
Sources: https://github.com/untadotmy/keel/blob/HEAD/stripe-integration/SKILL.md ;
https://github.com/ashish7802/awesome-api-skills/blob/HEAD/skills/stripe/SKILL.md

## AUTHORIZATION
Secret API keys (sk_live_, sk_test_) as HTTP basic auth username or Bearer
<redacted> Restricted keys with minimal permissions supported (use least privilege;
never expose secret key client-side). Publishable keys (pk_) for client-side
tokenization only. Webhook endpoints carry their own whsec_ signing secret.
OAuth (Stripe Connect) for platform accounts acting on connected accounts.
Source: https://github.com/ashish7802/awesome-api-skills/blob/HEAD/skills/stripe/SKILL.md ;
https://github.com/digital-workers-ai/os/blob/HEAD/mock/docs/02-stripe.md (auth + version pinning)

## WEBHOOKS
POST Event JSON to registered HTTPS endpoints. Verify with stripe.webhooks.constructEvent
(raw body, endpoint secret whsec_) — signature = HMAC-SHA256 over timestamp.payload,
timestamp in signature enables replay protection (reject >5 min old). Delivery:
retried with exponential backoff over hours/days on non-2xx; must acknowledge
with 2xx quickly (heavy work async). Events may redeliver — dedupe by event.id
(provider-issued unique id). Endpoint API version can differ from account default;
pin both to avoid silent shape drift. Stripe CLI (stripe listen) for local testing.
Sources: https://github.com/okf-memory/okf-agent-memory/blob/HEAD/benchmarks/data/knowledge/billing/stripe-webhooks.md ;
https://github.com/fraiseql/fraiseql/blob/HEAD/docs/architecture/webhooks.md ;
https://github.com/untadotmy/keel/blob/HEAD/stripe-integration/SKILL.md ;
https://github.com/dsb-117/brainblast/blob/HEAD/examples/stripe-privy/components/stripe.md
(API version drift risk between SDK and webhook payloads)

## POLLING
List endpoints (/v1/<resource>, /v1/events) with created[gte]/starting_after
cursors — backfill + incremental poll pattern (Estuary source-stripe-native uses
list backfill then /v1/events incremental). Events retained 30 days, so poll
cadence must be well inside that window; reconciliation job (periodic fetch and
diff vs local DB) is the documented drift-safety pattern.
Sources: https://github.com/estuary/connectors/blob/HEAD/source-stripe-native/CLAUDE.md ;
https://github.com/untadotmy/keel/blob/HEAD/stripe-integration/SKILL.md

## RATE LIMITS
Per official docs (docs.stripe.com/rate-limits): global limit live mode 100
requests/second per account, sandbox/test mode 25 requests/second; individual
API endpoints 25 requests/second unless noted; tighter buckets — Payment Intents
1000 updates per PaymentIntent/hour, Subscriptions 10 new invoices/min (20/day)
200 quantity updates/hour, Files API 20 read + 20 write/sec, Payouts 15
creates/sec + 30 concurrent per business, Connect account creation 30/sec live
(5/sec sandbox), Search API 20 read/sec. Exceeding returns 429 with
Stripe-Rate-Limited-Reason header; Stripe-Should-Retry header signals safe retry.
Separate concurrency limits (in-progress requests) exist alongside rate limits.
Sources: https://docs.stripe.com/rate-limits?locale=en-GB ; https://docs.stripe.com/docs/rate-limits ;
https://github.com/estuary/connectors/blob/HEAD/source-stripe-native/CLAUDE.md

## IDEMPOTENCY
Native, first-class: send Idempotency-Key header (<=255 chars, per account)
on POST requests. Same key + same params replays the original response with
Idempotent-Replayed: true header (retained at least 24h); same key + different
params is rejected (conflict). Concurrent duplicate in-flight requests are
serialized (second gets the first's result or a conflict). Validation failures
are NOT stored — safe to retry with the same key. Per-logical-attempt key
generation (UUID v4) is the documented pattern.
Sources: https://github.com/the-devops-daily/devops-daily/blob/HEAD/content/posts/how-stripe-avoids-double-charging-idempotency-keys.md
(documents Stripe's key scope/retention/replay semantics against the official docs) ;
https://github.com/dsb-117/brainblast/blob/HEAD/examples/stripe-privy/components/stripe.md

## EFFECTS
POSTs move money: PaymentIntent confirm/capture charges the card, refunds move
money back, payouts move funds to bank, subscription cancellation changes billing
state. All money movement is final at the network level — reversal is only via
new compensating operations (refund, reversal). Reads (GET, list, search) are
side-effect-free. Test mode is side-effect-free against real money (safe for
contract-test fixtures).
Sources: capability citations above.

## REVERSIBILITY
No un-charge: reversal only via Refund (full/partial) which creates a new
BalanceTransaction; disputes (chargebacks) initiated by cardholder are limited
to evidence submission, not self-reversal; uncaptured PaymentIntents can be
canceled (releases the authorization hold). Refunds themselves can be reversed
only in narrow cases (failed refund). Implication: payments writes are
business-irreversible; the connector contract must model money movement as
append-only events with compensating refunds.
Sources: https://github.com/untadotmy/keel/blob/HEAD/stripe-integration/SKILL.md
(cancel_at_period_end vs canceled, proration semantics)

## PROVENANCE
Every object: immutable id, created timestamp, livemode flag, balance_transaction
link (for charges/refunds), metadata map, and version-pinned API responses.
Events carry id/type/created/api_version and the full object snapshot at event
time. Idempotency-Key + Idempotent-Replayed headers give request-level replay
provenance. Stripe Sigma/audit logs provide dashboard-level audit. Sufficient for
SOURCE -> OBSERVATION -> EVIDENCE lineage including money-movement audit.
Sources: OBJECTS/EVENTS citations.
