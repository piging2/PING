# HARVEST-REPORT-BUSINESS.md — business connector harvest (CONN-BUSINESS)

Date: 2026-09-23 (night shift). Worker: CONN-BUSINESS (respawn).

## PROBLEM

Prove ONE real business connector end to end: provider data -> observation
-> evidence with provenance, through the BCQ contract surface, so the FYD
golden path gains a second acquisition leg (business-provider data) beside
website extraction. Prioritize home-service business value, not logo count.

## PING ALREADY HAS

- `~/workspace/business-connectors/hidden_files/`: connector-contract.md v1.0
  (declaration, normalization, hostile-input rules, lifecycle, failure
  contract, governor), connector-manifest-schema.md v1.0 (machine-readable
  manifest, CloudEvents envelope), ecosystem-harvest.md (18 mechanisms,
  M1-M18), archaeology.md (repo forensics).
- BCQ testkit: `lane-bcq/testkit/contract.py` (Connector ABC, ErrorClass,
  Confidence, Provenance, SECRET_PATTERNS, canonical_bytes), harness.py,
  run.py (`--adapter` entry), fake_connector.py.
- Lane-K: FAILURE-TAXONOMY.md v1 (13 classes, per-class retry policy).
- PING repo: `src/types/oauth.ts` names `google-business-profile` as an OAuth
  provider authority and `src/lib/infrastructure/controller.ts` lists Google
  Business Profile in its service registry; `src/types/reviews.ts` holds a
  canonical Review model whose `ReviewProvider.google` anticipates a GBP
  adapter. There is NO GBP API client, NO business-OAuth token lifecycle, NO
  provider read adapter anywhere in the repo (verified read-only via Pig,
  2026-09-23). The OAuth enum is authority plumbing, not a duplicate.
- `src/fyd/net/safe-fetch.ts` is the one SSRF gate production transports
  must use.

## EXTERNAL CANDIDATES (evaluated)

Eight providers evaluated on: API availability, OAuth scopes, rate limits,
webhooks, FYD data quality, credential availability. Full table in
BUSINESS-CONNECTOR.md §1.

- Google Business Profile: approval-gated public API, one OAuth scope,
  300 QPM, Pub/Sub push (no redelivery), listing facts + reviews. Highest
  home-service value. **WINNER.**
- Meta Graph API Pages: App Review gate (weeks), reviews endpoint
  vendor-reported dead. Identity value; deferred pending probe.
- Yelp Fusion: API key, in-band quota headers, 3 review excerpts max, trial
  is evaluation-only. Priority 2 after Square.
- Square: sandbox with test credentials, OAuth, webhooks. Priority 1 next:
  cheapest live end-to-end proof.
- Stripe: test mode needs an account; narrower than Square for this market.
  Deferred.
- QuickBooks: heavy accounting scopes; not FYD-core. Deferred.
- Jobber / Housecall Pro: ideal trade data shape (jobs/quotes/invoices),
  partner/account gated. Priority 3; longest access gate.

## LICENSES

- Google Business Profile API: Google API Terms of Service (ToS change is
  an enumerated connector failure mode; no code license encumbrance).
- Mechanisms reused (M1/M2/M6/M8/M10/M11/M13/M14/M18): interface patterns
  and protocol shapes from specs and docs; nothing vendored, no license
  encumbrance on patterns.
- Spike code: zero new dependencies (stdlib + BCQ contract types). Nothing
  to license-check because nothing was imported.

## TESTED

- Fixture suite `business/run_spike.py`: **28/28 PASS** after repairing
  three prior-worker failures (see BUSINESS-CONNECTOR.md §3).
- Scenarios: paginated locations read + provenance/confidence grading (A);
  reviews sanitization, secret-canary redaction, 10KB truncation marker (B);
  reviews-leg 403 SERVICE_DISABLED -> DEGRADED with locations unaffected (C);
  429 + Retry-After bounded backoff, no retry storm (D); replay idempotency,
  checkpoint resume emits nothing new (E); ETag 304 = no change events (F);
  normalize determinism (G).
- Evidence: `business/evidence/run-20260924-015504.jsonl`.
- Testkit ABC conformance: `business/kit_adapter.py` (`make_connector`)
  verified against the Connector ABC (discover/health/declaration). Full
  harness run awaits BCQ-TESTKIT generalizing the fake-specific suite
  (it calls `read("w1")`/`read("widget_timeout")` and fake credential refs);
  precise wiring instructions are in the module docstring.

## WINNER

Google Business Profile, read-only v0.1.0. Full design in
BUSINESS-CONNECTOR.md §2: contract surface mapping, declaration block
(single OAuth scope, business-owner grant, PKCE), object->observation->
evidence mappings with confidence grades, opaque cursor/checkpoint
semantics, lane-K-aligned failure modes, provenance on every observation.

## ADOPT / ADAPT / REJECT

- ADOPT: the GBP access sequence as the critical path (60-day seasoning
  clock starts in the morning); the four-verb lifecycle + capability
  declaration shape; CloudEvents envelope for emitted events; M11 token
  lifecycle shape for the live port; lane-K failure classes verbatim.
- ADAPT: reviews-leg degradation (degrade to UNKNOWN, never fail the
  connector); ETag conditional revalidation (M10); coerce-then-quarantine
  (M14); connector-local secret-pattern extensions on top of the BCQ
  canonical list (red-team proven).
- REJECT: vendoring any SDK for v0 (the mechanism fits in ~650 lines
  stdlib); probing the provider pre-approval (connector stays DISABLED);
  Facebook-sourced reviews (endpoint status unverified; ToS risk);
  Airbyte/Nango as runtime dependencies (patterns only; PING retains
  authority).

## CODE WE DO NOT NEED TO WRITE

- An SDK wrapper: the GBP REST surface needs ~150 lines of connector code,
  not a client library.
- A second event authority or observation store: observations flow into
  PING's existing event plane.
- A new secret store: lane-L broker + Secure Vault own custody; the
  connector holds a credential ref.
- A new HTTP egress primitive: production transport uses
  `src/fyd/net/safe-fetch.ts`.
- A webhook receiver tonight: GBP push is a later leg (Pub/Sub), and
  polling is the completeness backstop anyway.

## MINIMAL PING WRAPPER

`business/kit_adapter.py::make_connector` is the wrapper: returns a
BCQ-`Connector` that the contract test kit can drive. Production port =
swap `FixtureTransport` for an `HttpTransport` over `safe-fetch` with a
secret-broker credential ref; connector code unchanged. Integration
requests filed (in BUSINESS-CONNECTOR.md §3): lane-bcq should own the
volatile-field exclusion in `canonical_bytes`; lane-R owns the fixture
format as the connector-lab standard.

## FAILURE TEST

The three repaired failures are the failure test: (1) a sanitization gap
that let a planted secret through (now redacted + logged), (2) replay
determinism over-defined to include fetch metadata (now an explicit
volatile-field contract), (3) wall-clock leaking into normalize output
(now an explicit caller input). Each was a real defect or real test bug,
each fixed, each re-proven by the 28/28 run. Kill criteria + optionality
test recorded in BUSINESS-CONNECTOR.md §5.

## PRODUCT CAPABILITY UNLOCKED

A sanctioned, provenance-graded source of business listing facts (hours,
phone, categories, website) and reviews for home-service trades: the data
leg that feeds (a) FYD business-object enrichment, (b) review-triggered
outreach (existing concept, now with a specified source), and (c) the
owner-correction loop (provider DIRECT vs owner OWNER_ASSERTED, conflicts
kept, never silently merged).

## BYTES-DEPENDENCY COST

- New runtime dependencies: 0.
- New authorities/databases/frameworks: 0.
- Spike: ~950 lines Python (connector 650, transport 100, runner 230,
  adapter 40), all research-side; production port is a TypeScript adapter
  behind the BCQ interface, not a vendored copy.
- Fixtures: 6 recordings, ~40KB total; reusable as the lane-R regression
  corpus.
