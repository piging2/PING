# Effect Class 10: Financial Action

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: skill search across `/opt/hatch/skills` and
`~/workspace/skills`; `/home/nolan/ping/ping-runtime/connectors/
constitutional_capability_contract.js` and `oauth_provider.js` (Pig).

## Finding: FUTURE class with ZERO current wiring

Nothing in the runtime moves money today.

- No Stripe Link skill exists. Skill search for stripe/payment/billing
  surfaced only: `plaid` (read-only accounts/transactions) and
  `subscription-status` (read-only about Nolan's own Muse plan).
- `/home/nolan/ping`: Stripe/Square appear ONLY in declarative connector
  files. `constitutional_capability_contract.js` defines a `payments`
  capability with `processPayment`/`refundPayment`/`listPayments`/
  `getPaymentMethod` and `providers: ['stripe','square']`, but
  **`defaultProvider: null`** and NO executor anywhere calls
  `api.stripe.com`, `processPayment`, `refundPayment`, or `payment_intent`
  (grep across all .js/.ts/.py excluding node_modules hits only the contract
  file + a test fixture + a research scan config).
- `oauth_provider.js` lists stripe as a connectable OAuth provider (config
  entry only).
- Plaid skill = explicitly read-only ("You can't move money, pay a bill,
  transfer funds"). Quo (phone platform) has no agent-side billing wiring.
  No billing/subscription code in the FYD app or gateway beyond read-only
  subscription-status.

## Q1-Q8: not applicable today

No logical operation, no provider key, no query path, nothing to reconcile,
nothing to reverse. Design notes for when it gets wired (NOT survey — no
code exists to port against):

- Q1: `(payment_intent id / invoice id)` — Stripe-native identity exists.
- Q2: YES natively — Stripe supports `Idempotency-Key` on virtually all
  POSTs. This would be the ONLY class in the survey with a native provider
  key.
- Q3: YES (retrieve payment_intent/charge by id).
- Q4: probe = retrieve by id; money-moved is provider-authoritative.
- Q5: YES via refund (merchant/provider-dependent, but a real compensating
  action).
- Q6: UNKNOWN after a charge call = money may have moved; duplicate charge
  = double-billing a customer. HIGHEST consequence class in the survey.
- Q7: retry safe only after provider retrieve shows no charge for the
  operation identity AND the retry carries the same Idempotency-Key.
- Q8: HOLD on any ambiguity after a charge-affecting call — pending provider
  confirmation. Human boundary per Port Law: real financial spend routes to
  Nolan.

## Standing trigger for the port lane

Class 10 needs no port work now — but record a standing trigger: WHEN a
payments provider gets wired (the contract already names stripe/square), the
ORCA port MUST precede the first real charge. Wire the Idempotency-Key header
into the executor BEFORE any charge path can execute.

Confidence: HIGH on "zero current wiring" (exhaustive grep).
