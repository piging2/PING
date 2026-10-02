# BUSINESS-CONNECTOR.md — one real business connector proven end to end

Lane CONN-BUSINESS, night shift 2026-09-23. Winner: **Google Business Profile**
(read-only, fixture-proven tonight, live path explicit NEXT).

## 1. Candidate evaluation

Scored on: legitimate API availability, OAuth scopes, rate limits, webhook
support, data quality for FYD, credential availability tonight. All business
value is judged against home-service trades (the PING Social market).

| Candidate | API availability | Auth / scopes | Rate limits | Webhooks | Data quality for FYD | Credential availability tonight | Verdict |
|---|---|---|---|---|---|---|---|
| **Google Business Profile** | Public API, documented. Approval-gated (0 QPM pre-approval, 300 QPM post). Reviews leg is producer-restricted legacy v4 (403 SERVICE_DISABLED observed on approved projects) | OAuth2, single scope `https://www.googleapis.com/auth/business.manage`, business-owner grant | 300 QPM post-approval; 429 honored | No HTTP webhooks; Cloud Pub/Sub push only, no redelivery | Listing facts (hours, phone, categories) + reviews: the identity anchor for trades; feeds review-triggered outreach directly | None tonight: no approval, no OAuth consent, no sandbox | **WINNER**: provable end to end via recorded fixtures tonight; live path needs morning queue items |
| Meta Graph API (Pages) | Public, v26.0 current | OAuth2, Page tokens; production perms need App Review (`pages_read_engagement`, `pages_read_user_content`) | Tiered, in-band headers | Yes (X-Hub-Signature-256) | Page identity fields exist; Page Reviews/Recommendations vendor-reported 501 since v22.0, unconfirmed | None tonight; App Review is weeks | Runner-up for identity verification; reviews unreliable; needs live probe |
| Yelp Fusion | Public, sanctioned path (ToS bans scraping) | API key, instant approval | In-band headers (`RateLimit-DailyLimit/Remaining/ResetTime`); trial 5k/30d, starter 300/day, paid 30k/mo | None | Business facts + up to 3 review excerpts per business: thin but real signal | Trial key could exist tomorrow; trial is evaluation-only, not commercial | Third priority: simple auth, but tier economics must be decided first |
| Square | Public + sandbox environment | OAuth2, test tokens in sandbox | Documented, generous | Yes (signature-verified) | Invoices/payments/customer directory: real business value, but POS-shaped, not trade-shaped | Sandbox provable without Nolan's real data | High optionality value: provable end to end in sandbox |
| Stripe | Public + test mode | Restricted API keys / OAuth | Documented, generous | Yes (constructEvent) | Payments/invoices: business value for shops that invoice, but narrower than GBP for FYD | Test mode needs a Stripe account (Nolan's, morning queue) | Defer: valuable but second to domain-fit connectors |
| QuickBooks | Public | OAuth2, accounting scopes (heavy) | Throttled | Yes | Invoices/expenses/P&L: real but finance-shaped; overkill for FYD v1 | None tonight; app + consent needed | Defer: value real, scope heavy, not FYD-core |
| Jobber | Partner-gated API | Partner app approval + OAuth | Modest | Yes | Jobs/quotes/invoices/visits: the IDEAL trade data shape | Partner approval is a long gate; nothing tonight | Highest domain fit; queue the partner conversation |
| Housecall Pro | Limited public API | API key, account required | Modest | Limited | Jobs/dispatch/invoices: excellent trade fit | Nothing tonight; account-gated | Same as Jobber: domain fit high, access slow |

Why GBP wins tonight: (a) it is the identity anchor every home-service FYD
needs (map listing, hours, phone, categories, reviews), (b) the API contract
is fully public and its failure modes are characterized (including the
reviews-leg degradation the ecosystem harvest documented), (c) the reviews
stream feeds an existing product concept (review-triggered outreach), and
(d) it is provable end to end without credentials via recorded fixtures,
with a live path that is a transport swap, not a redesign. Nothing tonight
requires Nolan's real account; everything credential-shaped goes to
MORNING-QUEUE.md.

## 2. Winner design: Google Business Profile connector v0.1.0

### 2.1 Contract surface mapping

Against the BCQ testkit contract (lane-bcq/testkit/contract.py) and the
connector contract (~/workspace/business-connectors/hidden_files/).

| Contract surface | GBP implementation |
|---|---|
| **connect** | `connect(CredentialRef)`; accepts the fixture credential ref in fixture mode (AUTHORIZED, labeled). Live: rejects without a vault-issued OAuth credential ref with `business.manage` scope; emits `AUTH_REQUIRED` + `GOOGLE_GBP_ACCESS_PENDING` detail. No live credential tonight; connector is DISABLED without fixture ref or authorized live ref. |
| **discover** | Fixed streams: `gbp.locations`, `gbp.reviews`. Deterministic order. Requires AUTHORIZED; returns AUTH_REQUIRED/AUTH_EXPIRED detail otherwise. |
| **checkpoint** | Opaque base64url cursor per stream, stored verbatim and echoed verbatim (M10). Locations: pageToken echo + terminal `{"done": true, "at": ts}`. Reviews: highest contiguous `(updateTime, name)` watermark; resume skips `<= watermark` (idempotent resume, proven in fixture E). |
| **read** | `read("locations")`: paginated `accounts/{id}/locations` list, pageToken echoed verbatim, quarantine-on-schema-violation (record continues, failure logged as evidence). `read("reviews:{location}")`: `/{location}/reviews` list, 90d window. `read("location:{name}")`: single GET with ETag conditional revalidation; 304 emits zero observations and only refreshes the freshness clock. |
| **normalize** | Deterministic given (raw, object_type, attempt_id, fetched_at). Sanitize-then-coerce: strip HTML/JS (script content dropped entirely, not de-tagged), redact secret-shaped substrings (BCQ canonical list + connector-local extensions), 10KB text cap with `truncated:true`, enum coercion (starRating ONE..FIVE) with quarantine on uncoercible values. Every normalized field carries the provenance envelope. |
| **refresh** | Conditional revalidation (If-None-Match, verbatim ETag echo) per location; full-refresh for locations list; reviews are watermark-incremental. `refresh` is `read` against a stored checkpoint; staleness tolerances: reviews 24h, locations 7d; past tolerance the adapter marks STALE but keeps values (contract §1.5). |
| **disconnect** | Lifecycle -> REVOKED. All fetching stops immediately. Already-ingested evidence stays in the evidence plane marked `source_revoked_at` (contract §4); projections stop using revoked-source data for new public display (visibility layer decision). |
| **health** | AUTHORIZED / DEGRADED (one leg down) / REVOKED / DISABLED. Health reports which streams are degraded and why, never a bare boolean. |

### 2.2 Declaration block (SOURCE IDENTITY / AUTH SCOPE / CAPABILITIES)

- **Source identity:** `google-business-profile`, name "Google Business
  Profile (read-only spike)", version 0.1.0. Provider id referenced by all
  provenance envelopes. ToS: Google API Terms of Service (provider_terms_uri
  recorded in manifest; ToS change is an enumerated failure mode).
- **Auth scope (least privilege):** credential_type `oauth2`,
  granted_by `business-owner` (authorizes reads about that owner's business
  only; never about other businesses; never confers business identity),
  scopes: exactly `https://www.googleapis.com/auth/business.manage`.
  consent_record: `secure-vault:google/oauth` (live); fixture ref in spike.
  Token lifecycle per M11: reuse while valid, single-flight refresh, typed
  revoked-vs-transient refresh errors; revoked -> SUSPENDED until re-consent.
  PKCE on the authorization-code flow (standing decision).
- **Capabilities (declared, never self-granted):** `read.locations`
  (provider_objects: [location], max_window 365d, realtime false),
  `read.reviews` (provider_objects: [review], max_window 90d, realtime false).
  `write` is DENIED (no elevated grant; v1 is read-only).
- **Rate budget:** 18000 calls/hour (300 QPM post-approval), burst 300/min,
  max_attempts 3, jitter full, honor Retry-After mandatory. Pre-approval the
  connector declares `calls_per_window: 0` and stays DISABLED
  (GOOGLE_GBP_ACCESS_PENDING), never probing the provider.
- **Cost:** 0 USD/call; quota cost is provider QPM; monthly cap 0 (no paid tier).

### 2.3 Object -> observation -> evidence mappings

Provider ids are link records, NEVER canonical identity. Canonical identity
is the PING business object id, assigned downstream, stable across provider
churn.

**gbp.locations -> location observation**

| Provider field | Normalized field | Confidence | Method / note |
|---|---|---|---|
| name (`accounts/{a}/locations/{l}`) | source_record_id + graded_link.provider_business_id | INFERRED (link) | name-address-phone-match; ping_business_id null until downstream resolution |
| locationName | fields.locationName | DIRECT | GBP asserts about its own listing |
| primaryPhone | fields.primaryPhone | DIRECT | as listed |
| websiteUri | fields.websiteUri | DIRECT | URL policy: max 3 redirects, SSRF guard at production transport |
| profile.description | fields.description | DIRECT | sanitized at ingestion boundary |
| primaryCategory.displayName/categoryId | fields.category / fields.categoryId | DIRECT | as listed |
| address.* | fields.addressLines/locality/administrativeArea/postalCode | DIRECT | as listed |
| metadata.placeId / mapsUri | fields.placeId / fields.mapsUri | DIRECT | Google's ids for the listing, graded link |
| open-now (computed) | not emitted v0 | DERIVED (future) | rule id to be recorded when added |

**gbp.reviews -> review observation**

| Provider field | Normalized field | Confidence | Method / note |
|---|---|---|---|
| name (`.../reviews/{r}`) | source_record_id | - | identity of the record, not the business |
| starRating (enum) | fields.starRating (number) | DIRECT | as recorded by Google; enum coerced ONE..FIVE, uncoercible quarantined |
| comment | fields.comment | INFERRED | untrusted third-party claim; sanitized, secret-redacted, 10KB cap |
| reviewer.displayName / isAnonymous | fields.reviewerDisplayName / reviewerAnonymous | INFERRED | untrusted; never used for identity |
| createTime / updateTime | fields.createTime / updateTime | DIRECT | timestamps as recorded |
| reviewReply.comment / updateTime | fields.replyComment / replyUpdateTime | DIRECT | owner reply as recorded by Google |

**Evidence mapping:** every observation carries `provenance {provider,
source_record_id, fetched_at, fetch_attempt_id, connector_version}` +
`_idempotency_key = sha256(connector|stream|object|record_version)` +
`_confidence_method`. Raw payloads are stored verbatim (bytes + content hash)
before normalization so adapters can re-run (contract §1.4). Failures emit
failure records per the lane-K taxonomy (§2.4), never silent empty successes.

### 2.4 Cursor / checkpoint semantics

- pageToken: opaque, echoed verbatim, never interpreted (M10 validators
  stored verbatim).
- Reviews watermark: highest contiguous `(updateTime, name)`; resume emits
  only records strictly greater (fixture-proven: checkpoint resume emits
  nothing new).
- ETag: stored verbatim on 200, echoed verbatim as If-None-Match; 304 = no
  change events, freshness clock refresh only.
- Cursor invalidation (provider rejects pageToken / watermark): typed
  FULL_RESYNC event, not an error; full re-read from stream start with the
  same idempotency keys (dedup absorbs re-emission).

### 2.5 Failure modes (aligned to lane-K taxonomy v1)

| Provider signal | Lane-K class | Connector behavior |
|---|---|---|
| No credential / approval pending | AUTH_REQUIRED | DISABLED; `GOOGLE_GBP_ACCESS_PENDING`; no fetch, no probe |
| 401 invalid_token/expired | AUTH_EXPIRED | One refresh attempt (M11); second failure -> SUSPENDED, operator re-consent |
| 403 SERVICE_DISABLED on reviews leg (producer-restricted legacy surface) | PERMISSION_DENIED | Reviews leg degrades to UNKNOWN; lifecycle DEGRADED; locations leg unaffected; existing evidence untouched; no retry storm |
| 403 without rate-limit headers, missing scope | PERMISSION_DENIED | Halt; surface the missing permission; dead-letter |
| 429 / quota errors / 403 with rate-limit headers | RATE_LIMITED | Honor Retry-After, jittered backoff, max 3 attempts; never loop tight |
| 5xx / DNS / connect failure | SOURCE_UNAVAILABLE | Budgeted backoff; lane-M health degrades; serve labeled-stale |
| Timeout, no conclusive response | TIMEOUT | Retry reads with backoff (idempotent); record attempt metadata |
| Malformed JSON / missing `name` / unknown starRating enum | INVALID_PAYLOAD (connector-side) or SCHEMA_CHANGED (provider-side) | Quarantine with envelope + raw ref; continue stream; schema drift halts stream for contract update |
| Script/JS/secret in review text | sanitization-rejected (contract failure mode) | Strip + redact at ingestion boundary; redaction logged as coercion |
| Oversized payload (>5MB response / >256KB record) | INVALID_PAYLOAD | Reject with recorded observation, never partially ingest |
| Pub/Sub subscription lapse (future push leg) | SOURCE_UNAVAILABLE | Poll backfill is mandatory; push never the sole record |
| Unrecognized signal | TRANSIENT | Record original_signal; capped retries; chronic -> investigate |

Retry policy is per-class (lane-K §3); the connector only assigns the class
honestly. OUTCOME_UNKNOWN follows the reconciliation path (idempotency keys,
read-back), never blind retry.

### 2.6 Provenance on every observation

Mandatory envelope: `provider`, `source_record_id`, `fetched_at`,
`fetch_attempt_id`, `connector_version` (0.1.0 semver). Confidence grade on
every field per §2.3. Raw payload ref (content hash) for re-runs. Owner
corrections layer on top as OWNER_ASSERTED observations; conflicts keep both
values marked CONFLICTING. Visibility is a downstream layer decision; the
adapter never filters for sensitivity.

## 3. Spike summary (proven tonight)

Location: [business/](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/business) (renamed from `spike/`).

- `gbp_connector.py`: read-only GBP connector implementing the BCQ Connector
  ABC (connect/discover/checkpoint/read/normalize/refresh/disconnect/health).
  Zero new dependencies (stdlib + BCQ contract types). Fixture mode tonight;
  the live path is a transport swap (`HttpTransport` -> production transport
  over `fyd/net/safe-fetch` + secret-broker credential ref) with no connector
  code change.
- `fixture_transport.py`: connector-lab fixture format (verbatim
  request/response pairs + scenario manifest header; refused invented
  responses by AssertionError).
- `fixtures/`: 6 recordings: locations paginated (A), reviews with hostile
  payload + 10KB cap + secret canary (B), reviews 403 SERVICE_DISABLED (C),
  429 with Retry-After (D), replay/304 sequences (E/F).
- `run_spike.py`: 28/28 scenarios PASS. Evidence:
  `business/evidence/run-20260924-015504.jsonl`.
- `kit_adapter.py`: testkit `--adapter` factory (`make_connector`);
  verified: isinstance Connector, discover/health/declaration all conform.

Red-team findings from the spike (all three fixed, none waived):
1. Connector-local secret-pattern extensions were defined but never applied:
   the planted canary survived sanitization in plain text. Fixed by applying
   the extension list inside `_sanitize_text`; redaction is logged as a
   coercion, never silent.
2. Replay determinism compared fetch-scoped metadata (fetched_at,
   fetch_attempt_id, linked_at) across replays. Fixed: the invariant is now
   canonical identity + provider content identity; volatile metadata is
   excluded by explicit path list, documented as an integration request for
   lane-bcq (canonical_bytes should own this exclusion).
3. `normalize()` defaulted `fetched_at` to wall-clock, making byte output
   non-deterministic. Fixed: fetched_at is an explicit caller input; the
   runner passes one timestamp per fetch attempt.

Known seams (not defects tonight; recorded for the production port):
- List-item text fields do not propagate the truncation marker upward
  (`_sanitize_fields` list branch drops the flag). Production normalizer must
  propagate or record it.
- `safe-fetch` egress gate (PING's one SSRF authority) must be the production
  transport; the spike's fixture transport is research-only. No duplication:
  production GBP reads go through `src/fyd/net/safe-fetch.ts`, not a new
  urllib client.
- Live auth rides the lane-L secret broker (capability handles, never
  tokens) + M11 token lifecycle (reuse/refresh/single-flight). Not built
  tonight.
- The reviews-leg degradation path treats 403 SERVICE_DISABLED as
  PERMISSION_DENIED per lane-K §2 (auth succeeded, surface restricted).
  If Google later documents this as an approval-tier signal, reclassify to
  AUTH_REQUIRED with GOOGLE_GBP_ACCESS_PENDING.

## 4. Next 3 connectors (priority order, marginal cost with substrate)

Marginal cost is low once the substrate exists: each new connector reuses the
contract ABC, fixture lab, failure taxonomy, provenance envelope, and
governor binding. Cost is per-provider: auth model, data shape, failure
signals, and one recording session.

1. **Square** (sandbox-provable, payments/invoices/customer directory).
   Why next: Square offers a real sandbox with test credentials, so it is
   the cheapest connector to prove END TO END against a live provider
   without touching Nolan's money. OAuth scopes are fine-grained; webhooks
   are signature-verified (M7 pattern). Business value: invoice/payment
   data for shops, customer directory as a second identity signal.
   Marginal cost: OAuth2 token lifecycle (same M11 shape as GBP), REST
   pagination cursors, ~150 lines like GBP. Morning queue: sandbox app only
   (no real account needed).
2. **Yelp Fusion** (API-key auth, in-band quota, review excerpts).
   Why next: simplest credential model in the wave (Bearer <redacted>, no OAuth dance),
   and the quota headers (`RateLimit-DailyLimit/Remaining/ResetTime`) are
   the model for in-band budget discipline every connector should copy.
   Business value: independent review signal + business facts; the canonical
   review model (`src/types/reviews.ts`) already anticipates a non-Google
   provider. Constraint: trial tier is evaluation-only per Yelp ToS; a plan
   decision (paid tier, 30k calls/mo) precedes production use. Marginal
   cost: API-key credential type in the broker, quota-header reader, ~100
   lines. Morning queue: trial key for evaluation + plan decision.
3. **Jobber** (field-service CRM: jobs, quotes, invoices, visits).
   Why third: highest DOMAIN fit for home-service trades (this is the
   software the target market actually runs on), but the longest access
   gate (partner app approval). Business value: job lifecycle + invoice
   data is the richest FYD signal after GBP listing facts. Plan: queue the
   partner conversation in the morning; design against public docs meanwhile
   (GraphQL, OAuth2, webhooks). Marginal cost: GraphQL transport variant,
   OAuth2 (same M11), ~200 lines. Housecall Pro is the fallback if
   Jobber's gate stalls (similar shape, smaller API).

Honorable mention / deferred: Meta Graph API Pages (identity verification
value high, but App Review is weeks and the reviews endpoint is
unverified-to-dead; queue the App Review application in the morning and
live-probe the reviews surface before designing); Stripe (payments, but
narrower than Square's small-business shape for this market); QuickBooks
(accounting data, heavy scopes, not FYD-core).

## 5. Kill criteria / optionality (per OWNERSHIP.md)

- Kill if: GBP API approval is denied and stays denied (reviews leg is
  already designed degraded; a full denial kills locations too, connector
  goes RETIRED, fixtures remain as regression corpus).
- Kill if: Google changes ToS to forbid this access pattern (enumerated
  failure mode `tos-change` -> SUSPENDED pending operator review).
- Kill if: the connector cannot preserve provenance or cannot be isolated
  behind the fixture transport (not the case: proven).
- Optionality test: can we replace GBP with Yelp/Square as the review
  source, add a new protocol (Pub/Sub push), rebuild the projection from
  evidence, trace every displayed fact to its fetch_attempt_id? Yes to all:
  the spike stores raw payloads verbatim with content hashes and emits
  CloudEvents-ready observations. The connector is replaceable; PING
  remains the authority.

## 6. Files

- [BUSINESS-CONNECTOR.md](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/BUSINESS-CONNECTOR.md) (this file)
- [business/gbp_connector.py](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/business/gbp_connector.py)
- [business/run_spike.py](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/business/run_spike.py) (28/28)
- [business/fixture_transport.py](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/business/fixture_transport.py)
- [business/kit_adapter.py](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/business/kit_adapter.py)
- [business/fixtures/](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/business/fixtures) (6 recordings)
- [business/evidence/](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/business/evidence) (run JSONL)
- [MORNING-QUEUE.md](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/MORNING-QUEUE.md)
- [HARVEST-REPORT-BUSINESS.md](sandbox:/home/hatch/workspace/ping-build-program/lane-conn/HARVEST-REPORT-BUSINESS.md)
