# ECOSYSTEM HARVEST: PING/FYD Business Connectors Wave

Date: 2026-09-23
Coordinator: subagent 67f35002 (parent orchestrator)
Scope: external connector/adapter patterns worth stealing. Mechanisms over frameworks.

## SUMMARY

Eighteen mechanisms inspected across the nine pattern families. The single most
consequential harvest is not a code mechanism at all: it is the access model of
the three golden-path providers.

1. Google Business Profile API is approval-gated. Quota is 0 QPM until Google
   approves; approved projects get 300 QPM. Reviews live on the legacy v4
   mybusiness API, which is producer-restricted (Google-allowlisted) and has been
   observed returning 403 SERVICE_DISABLED on approved projects. There is no
   HTTP webhook surface; review notifications go to Google Cloud Pub/Sub only,
   and Google never redelivers a missed notification, so polling backfill is
   mandatory even with push configured.
2. Meta Graph API (current v26.0, introduced 2026-07-29) still exposes Page
   identity fields (rating_count, overall_star_rating) but a vendor source
   reports Page Reviews/Recommendations endpoints return 501 since v22.0
   (2026-01-21). Not confirmed on the official changelog surface I inspected.
   Treat Facebook-as-review-source as unverified until live-probed.
3. Yelp Fusion is API-key based, but the trial plan is explicitly
   evaluation-only, not for commercial deployment, and paid plans start at a
   daily-limit tier. Yelp ToS prohibits scraping; Fusion is the sanctioned path.

The mechanism harvest proper: Airbyte protocol lifecycle (spec/check/discover/
read) and MCP 2026-07-28 capability declarations for adapter interfaces;
golang.org/x/oauth2 ReuseTokenSource semantics for short-lived token
reuse-and-refresh; Meta X-Hub-Signature-256 raw-body HMAC verification with
respond-200-fast-then-process-async plus dedup; Stripe constructEvent timestamp
tolerance and event-id idempotency; Microsoft Graph deltaLink/nextLink change
feeds; RFC 9110 conditional requests plus RFC 5861 stale-while-revalidate for
polling efficiency and outage degradation; the Microsoft.Extensions.Http.Resilience
standard pipeline (retry with jitter, circuit breaker, timeouts, 429 handling)
for per-provider backoff budgets; CloudEvents 1.0 envelope for
provenance-preserving normalization; DOMPurify 3.3.2 for HTML sanitization; and
Crawl4AI 0.9.3's hostile-crawl boundaries (5-hop redirect cap with per-hop
destination policy, peer-IP DNS-rebinding validation, 100 MiB / 2000-page caps,
field allowlists at the trust boundary) for fetching business websites.

Research only. No code written to the repo. No accounts created, no keys
requested, no businesses contacted.

## MECHANISM RECORDS

### M1. Airbyte Protocol connector lifecycle

PROBLEM: Every provider adapter needs a machine-checkable contract for what it
needs, what it can produce, and whether it is healthy, so a scheduler can treat
all connectors uniformly.

SOURCE: Airbyte Protocol docs, airbytehq/airbyte repo,
https://github.com/airbytehq/airbyte/blob/HEAD/docs/platform/understanding-airbyte/airbyte-protocol.md
(sibling: airbyte-python-cdk, https://github.com/airbytehq/airbyte-python-cdk/blob/HEAD/CHANGELOG.md)

VERSION-SHA: live docs HEAD, last updated 6 days before inspection (2026-09-23).
Protocol is versioned with the platform; no single semver surfaced on the doc
page. Treat as current-as-inspected.

LICENSE: Airbyte platform is ELv2 for the repo; the protocol concept itself is
an interface pattern, not code to import. No license encumbrance on the pattern.

MECHANISM: Four commands. `spec` emits a ConnectorSpecification (JSON Schema of
required config, including an OAuth2Specification model with
oauthFlowOutputParameters). `check(config)` returns AirbyteConnectionStatus and
must prove the connector can reach everything it needs; on success all later
commands are expected to succeed. `discover(config)` returns an AirbyteCatalog
of streams with per-stream sync modes (full_refresh vs incremental) and JSON
schemas. `read(config, catalog, state)` emits a stream of record messages and
state-checkpoint messages. The Python CDK adds a default HTTP backoff handler
and a Transform class that coerces record values to the declared JSON schema.

FAILURE SEMANTICS: `check` failing on config (bad credential) returns a failed
status and is classified as user error, not connector error. `check` failing on
connector internals must emit a trace message instead of a status. `read` emits
typed trace/error messages; the scheduler retries per its own policy.

PING ANALOG: NONE FOUND for a connector lifecycle contract. The antifragile
execution directive in AGENTS.md demands typed failure semantics but no
connector-level spec/check/discover/read contract exists. PING's event plane
(OBSERVATION_CREATED) is downstream of ingestion, not an adapter contract.

VERDICT: ADAPT. Do not import Airbyte; steal the four-verb contract shape
(spec/check/discover/read) for FYD connector manifests, mapped onto PING's
existing event vocabulary.

### M2. MCP capability declaration + tool schemas

PROBLEM: A connector (or agent surface) must declare up front what it can do so
callers negotiate against the declaration instead of probing at runtime.

SOURCE: Model Context Protocol specification, revision 2026-07-28 (corroborated
by third-party corpus notes at
https://github.com/yantrikos/yantrikdb/blob/HEAD/packs/mcp-spec/corpus.md which
describes the 2026-07-28 request metadata requirements).

VERSION-SHA: 2026-07-28 spec revision (matches workspace memory of the current
MCP spec date).

LICENSE: MCP spec and SDKs are MIT/Apache-2.0 style open; the declaration
pattern carries no encumbrance.

MECHANISM: During initialization the server declares `capabilities: {tools:
{listChanged: bool}, resources: {...}, prompts: {...}}`. Declaring `tools`
obliges the server to answer `tools/list` with the currently available set.
Each tool carries a JSON Schema inputSchema. The 2026-07-28 revision requires
per-request `_meta` (protocolVersion, clientInfo, clientCapabilities), makes
tool lists cacheable with server-advertised `ttlMs`/`cacheScope`, and requires
deterministic tool ordering so lists are stable for caching and prompt caching.
`notifications/tools/list_changed` signals capability-set changes.

FAILURE SEMANTICS: If client and server cannot agree on a protocol version,
the client MUST disconnect. A tool call against an undeclared capability is a
protocol violation, not a runtime error to absorb.

PING ANALOG: PING already consumes the MCP 2026-07-28 spec surface (per
workspace memory); no PING-side capability-declaration contract for business
connectors exists yet.

VERDICT: ADAPT. Use the declare-then-negotiate shape (capabilities object +
listChanged notification + deterministic listing) in FYD connector manifests.
Do not bolt MCP transport onto the ingestion path.

### M3. Google Business Profile API access and OAuth model

PROBLEM: FYD's golden path needs business identity verification and reviews
from Google. The API is gated in ways that change the build order.

SOURCE: Google Business Profile APIs, official docs:
https://developers.google.com/my-business/content/prereqs (opened and read
2026-09-23) and https://developers.google.com/my-business/reference/notifications/rest/v1/NotificationSetting
and https://developers.google.com/my-business/content/notification-setup.
Corroborating field evidence:
https://github.com/canonry/canonry/blob/HEAD/skills/canonry/references/google-business-profile.md
(production test May 2026) and
https://github.com/guipmilek/google-business-profile-gbp-mcp.

VERSION-SHA: live official docs (no version string; Google docs are rolling).
Corroborating evidence dated May 2026.

LICENSE: API usage governed by Google API Terms of Service, not a code license.

MECHANISM: Access requires: Google account, Cloud project, an Organization
account, a verified-and-active-for-60+-days Google Business Profile, and a
representative business website. Then submit the GBP API contact form
("Application for Basic API Access"). Until approved, all Business Profile API
quotas sit at 0 QPM; approval moves them to 300 QPM. OAuth uses the single
scope `https://www.googleapis.com/auth/business.manage` for locations, posts,
and reviews. The reviews list endpoint lives on the legacy
`mybusiness.googleapis.com` v4 surface, which is producer-restricted: the
canonry field notes show `gcloud services enable mybusiness.googleapis.com`
returning PERMISSION_DENIED even on an approved project, and review calls
returning 403 SERVICE_DISABLED. Reviews have no newer replacement surface.

FAILURE SEMANTICS: Quota 0 reads as 403/429 quota errors, surfaced by one
integrator as a typed `GOOGLE_GBP_ACCESS_PENDING` state. A rejected
application must fix the prerequisites and re-apply; there is no sandbox and
only some calls support `validateOnly`.

PING ANALOG: NONE FOUND. Review-triggered outreach exists as a concept
(monitoring pipeline prospects' Google reviews) but its data source is
unspecified; this mechanism defines what the sanctioned source costs.

VERDICT: ADOPT the access sequence as the critical path (GBP ownership first,
because of the 60-day seasoning requirement), and design the connector so the
reviews leg degrades gracefully to UNKNOWN when the producer-restricted surface
refuses. The approval gate is the longest-lead external dependency in the wave.

### M4. Meta Graph API auth model and versioning

PROBLEM: FYD needs Facebook Page identity (verification of the business) and,
if available, reviews. Meta's permission and versioning model decides what is
reachable.

SOURCE: Meta for Developers docs:
https://developers.facebook.com/docs/graph-api/overview/ ,
https://developers.facebook.com/docs/graph-api/changelog/ (version table read
2026-09-23), https://developers.facebook.com/docs/graph-api/webhooks/getting-started/
and the Airbyte facebook-pages connector doc
https://github.com/airbytehq/airbyte/blob/HEAD/docs/integrations/sources/facebook-pages.md
(which targets Graph API v24.0). Reviews-deprecation claim from vendor docs
https://github.com/socialapi-ai/docs/blob/HEAD/connectors/facebook.mdx.

VERSION-SHA: Graph API v26.0 current (introduced 2026-07-29); v22.0 introduced
2026-01-21, available until 2027-05-20. Airbyte connector pins v24.0.

LICENSE: Platform Policy / Developer Terms, not a code license.

MECHANISM: Token ladder: user token (short-lived, exchanged to long-lived)
derives Page access tokens that do not expire; system-user tokens serve
multi-brand publishing. Production permissions (`pages_read_engagement`,
`pages_read_user_content`, `pages_show_list`, `read_insights`) require App
Review and Advanced Access; unapproved apps get "This application has not been
approved to use this API". Page identity fields (followers_count, fan_count,
rating_count, overall_star_rating) are available on the Page node. Vendor
source claims Page Recommendations/Reviews were removed in v22.0 with 501s on
review endpoints; I did not find this on the official changelog surface I
inspected, so treat as vendor-reported.

FAILURE SEMANTICS: Permission errors are deterministic (app not approved);
version deprecations follow a published schedule (v20.0 removed 2026-09-24,
v21.0 removed 2027-01-21).

PING ANALOG: NONE FOUND for Meta API access. Outreach already uses the PING
Social Page via browser automation, not the API.

VERDICT: ADAPT. Plan Page identity verification against the Page node fields
via the official API; do NOT plan on Facebook-sourced reviews until a live
probe confirms or refutes the v22.0 removal claim. Scraping Facebook for
reviews would violate Platform Policy; note the ToS constraint.

### M5. Yelp Fusion auth and rate-limit budget

PROBLEM: FYD needs Yelp business data and review excerpts within a strict
quota, with the quota communicated in-band.

SOURCE: Yelp Fusion official docs: https://docs.developer.yelp.com/docs/fusion-rate-limiting
(read via search extract 2026-09-23) and https://docs.developer.yelp.com/docs/places-faq.
OpenAPI/JSON-Schema mirror at https://github.com/api-evangelist/yelp.

VERSION-SHA: live official docs (rolling). FAQ crawled 15 hours before
inspection; rate-limit doc last updated 631 days ago but still current on the
live site.

LICENSE: Yelp API Terms of Use. Trial plan is explicitly "STRICTLY FOR
EVALUATION AND NOT FOR COMMERCIAL DEPLOYMENT". Scraping yelp.com is prohibited
by ToS; Fusion is the sanctioned path.

MECHANISM: API-key auth as `Authorization: Bearer <redacted> No OAuth dance. Two-tier
rate limiting: per-second QPS limits return HTTP 429 with
`TOO_MANY_REQUESTS_PER_SECOND`; daily quotas return per-response headers
`RateLimit-DailyLimit`, `RateLimit-Remaining`, `RateLimit-ResetTime` (ISO 8601),
plus optional per-endpoint `RateLimit-ResourceDailyLimit` /
`RateLimit-ResourceRemaining`. Trial plan: 5,000 calls over 30 days; starter
plan: 300 calls per 24h resetting midnight UTC; paid plans 30,000/month with
5,000/day cap. Reviews endpoint returns up to three review excerpts per
business (confirmed via the Microsoft independent-publisher connector doc
https://learn.microsoft.com/en-us/connectors/yelpip/).

FAILURE SEMANTICS: 429 with a typed error code for QPS; 429 on daily-limit
exhaustion with reset time in headers; quota is hard per-day, not burstable.

PING ANALOG: NONE FOUND. No Yelp integration exists.

VERDICT: ADOPT the in-band quota header pattern (read RateLimit-* headers and
budget against them) for every provider adapter, and treat Yelp as a
three-excerpt review signal source, not a full review firehose. Trial tier
cannot serve production; budget the paid tier before committing the connector
to the golden path.

### M6. Meta webhook signature verification

PROBLEM: Provider callbacks must be authenticated before any processing, and
the endpoint must survive Meta's retry behavior without double-processing.

SOURCE: Meta for Developers, official:
https://developers.facebook.com/docs/graph-api/webhooks/getting-started/ and
https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks .
Corroborating implementation notes:
https://github.com/hookdeck/webhook-skills/blob/HEAD/skills/facebook-webhooks/SKILL.md
and https://github.com/tabsir99/fb-sdk/blob/HEAD/docs/webhooks-and-stores.md.

VERSION-SHA: live official docs (rolling; crawled within 2 weeks of
inspection).

LICENSE: Platform documentation; no code license involved.

MECHANISM: Every Event Notification POST carries `X-Hub-Signature-256:
sha256=<hex>` which is HMAC-SHA256 over the RAW request body keyed by the app
secret. Verify over raw bytes before JSON parsing (Meta signs an
escaped-unicode form; a re-serialized JSON string will never match), compare
with a constant-time equality function, and fail closed on missing/malformed
headers. Subscribe handshake is a GET challenge-response on hub.mode/
hub.verify_token. Endpoint must answer 200 OK fast; heavy work happens after
the response. Notifications batch up to 1000 updates per POST and batching is
not guaranteed. On delivery failure Meta retries immediately then with
decreasing frequency for up to 36 hours; the receiver must deduplicate. One
hour of continuous failure triggers a Webhooks Disabled alert and automatic
unsubscription.

FAILURE SEMANTICS: Signature mismatch means drop, never process. Missed
notifications during an outage are redelivered for 36h, then dropped; the
receiver must reconcile via polling. Unsubscription after 1h of failures
requires manual resubscription.

PING ANALOG: NONE FOUND. No webhook ingestion exists in PING.

VERDICT: ADOPT verbatim for any Meta callback surface: raw-body HMAC,
constant-time compare, 200-fast-then-async, idempotent consumer, 36h retry
awareness, and a reconciliation poll.

### M7. Stripe webhook constructEvent pattern

PROBLEM: Same class as M6 for payment/business callbacks: authenticate, bound
replay, and make handlers idempotent.

SOURCE: Stripe official docs via integrator evidence (stripe-node Webhooks.ts
behavior documented at https://github.com/vaam-apps/vpay/blob/HEAD/docs/plans/2026-09-03-step5b-stripe-sdk.md
and audit notes at
https://github.com/mohamedghanem-dev/nextlearn-saas/blob/HEAD/docs/AUDIT-PHASE-4.md);
`stripe.webhooks.constructEvent(rawBody, signature, endpointSecret, tolerance)`.

VERSION-SHA: stripe-go v85 / stripe-node current as of 2026-09 (per citing
docs). Pattern is stable across versions.

LICENSE: Stripe SDKs are MIT; the pattern is a usage recipe.

MECHANISM: `Stripe-Signature` header carries `t=<timestamp>,v1=<hmac>` where
the HMAC covers `<timestamp>.<rawBody>`. `constructEvent` verifies the HMAC,
rejects payloads older than `tolerance` (default 300s), and returns a typed
event. Handlers dedup on `event.id` because Stripe retries deliver duplicates
and out of order; state transitions are guarded by comparing
`current_period_end`/object state so a late older event cannot downgrade newer
state. Source of truth is the object status, not the event stream.

FAILURE SEMANTICS: Invalid signature or stale timestamp means reject without
processing. Duplicate/out-of-order events are absorbed by idempotency keys.
Never disable verification to "fix" a mismatch; the usual cause is verifying a
re-serialized body instead of raw bytes.

PING ANALOG: NONE FOUND. PING takes no payments.

VERDICT: PATTERN_ONLY. No Stripe integration is planned; keep the
timestamp-bound signature plus event-id idempotency plus status-as-truth
pattern in the webhook design notes for any provider callback.

### M8. Google Business Profile Pub/Sub notifications

PROBLEM: Google offers no HTTP webhooks for Business Profile events. FYD still
needs near-real-time review signals.

SOURCE: Official:
https://developers.google.com/my-business/content/notification-setup and
https://developers.google.com/my-business/reference/notifications/rest/v1/NotificationSetting .
Implementation walkthrough:
https://github.com/tuanphan17/google-ai-review-responder/blob/HEAD/README.md.
Push-vs-poll caution from https://github.com/socialapi-ai/docs/blob/HEAD/connectors/google.mdx.

VERSION-SHA: live official docs (rolling).

LICENSE: Google API Terms of Service.

MECHANISM: One NotificationSetting per account points at a Cloud Pub/Sub
topic; the account grants `mybusiness-api-pubsub@system.gserviceaccount.com`
the Pub/Sub Publisher role on the topic. Notification types include
NEW_REVIEW, UPDATED_REVIEW, plus location updates, media, Q&A, duplicates,
Voice-of-Merchant changes. Delivery is Pub/Sub push (or pull) to the
integrator's endpoint, authenticated via service-account OIDC. Critical
property reported by an integrator: Google never redelivers a missed
notification, so a delivery gap is permanent and scheduled polling remains the
backfill path.

FAILURE SEMANTICS: Push lowers latency but does not replace polling. If the
push subscription lapses, events are silently lost; the poller is the source
of completeness.

PING ANALOG: NONE FOUND. Closest is the review-triggered outreach concept,
which assumes a review data source without specifying push vs poll.

VERDICT: ADOPT. Design the Google leg as poll-primary with Pub/Sub push as a
latency optimization, and never treat a notification as the sole record of a
review. Requires a Google Cloud project and topic, which is an external
blocker until then.

### M9. Microsoft Graph delta queries

PROBLEM: Polling full collections to detect changes wastes quota and misses
deletions. FYD needs incremental change feeds where providers offer them.

SOURCE: Microsoft Learn, official:
https://learn.microsoft.com/uk-ua/graph/delta-query-messages (read 2026-09-23).

VERSION-SHA: Graph v1.0 surface (rolling docs).

LICENSE: Documentation; API under Microsoft terms.

MECHANISM: First request to `<collection>/delta` returns the current set plus
`@odata.nextLink` for paging; the final page returns `@odata.deltaLink`.
Storing the deltaLink and re-requesting it returns only adds, updates, and
deletes since last sync, with deletions marked by `@removed: {reason:
"deleted"}` tombstones. Each item carries `@odata.etag` for per-item
fingerprinting. The token encodes the sync watermark; the server owns the
watermark format.

FAILURE SEMANTICS: An expired or invalid delta token forces a full
resynchronization (the documented recovery is to restart from the initial
delta request). Tombstones mean deletes are first-class, not inferred from
absence.

PING ANALOG: NONE FOUND. PING's observation pipeline is append-oriented; no
delta-token watermarking exists.

VERDICT: ADAPT. Wherever a provider offers a delta/change feed (or even a
`updated_since` cursor), store the watermark opaquely and treat token
invalidation as a typed FULL_RESYNC event, not an error. GBP and Yelp do not
offer delta feeds, so this stays a design pattern for future providers.

### M10. HTTP conditional requests and stale-while-revalidate

PROBLEM: Polling provider endpoints and business websites must be cheap when
nothing changed, and FYD must keep serving data when a provider is down.

SOURCE: RFC 9110 (HTTP Semantics), Section 13.1.2 If-None-Match, verified live
at https://www.rfc-editor.org/rfc/rfc9110.html (crawled 2 hours before
inspection). RFC 5861 stale-while-revalidate/stale-if-error, corroborated by
implementations at https://github.com/expo/best-before and
https://github.com/nxtedition/nxt-undici/commit/bd53ed43413b80bd12ce6f54dfe66275a141044c.

VERSION-SHA: RFC 9110 (June 2022, current HTTP semantics); RFC 5861 (May 2010,
current for these directives).

LICENSE: IETF/IRTF standards, freely implementable.

MECHANISM: Store the provider's `ETag` (opaque version) and `Last-Modified`;
revalidate with `If-None-Match` (takes precedence over `If-Modified-Since` when
both present) and accept `304 Not Modified` to refresh the freshness clock
without a body. For outage degradation, `Cache-Control: stale-while-revalidate`
serves the stale copy immediately while revalidating in the background, and
`stale-if-error` serves stale on origin 5xx. Freshness, revalidation, and
stale-serving are distinct states with explicit transitions.

FAILURE SEMANTICS: A 304 means "your copy is still good", not "nothing
happened"; do not emit change events on 304. Serving stale must be labeled as
stale (graceful unknown), never presented as fresh. Validators must be stored
verbatim; echoing a mangled Last-Modified breaks revalidation on strict
servers.

PING ANALOG: NONE FOUND as an HTTP caching layer. The "graceful unknown" half
matches PING's typed gap states conceptually but is not implemented for
provider data.

VERDICT: ADOPT. Every poller stores validators and revalidates; every
provider-backed read path serves labeled-stale on 5xx/timeout instead of
failing the whole surface. This is the cheapest reliability win in the wave.

### M11. Short-lived token reuse and refresh

PROBLEM: Provider OAuth tokens expire (Google ~1h). Every request path needs a
valid token without hammering the token endpoint or racing refreshes.

SOURCE: golang.org/x/oauth2 package docs (TokenSource interface,
ReuseTokenSource, Config.TokenSource), observed via pkg.go.dev mirrors, e.g.
https://pkg.go.dev/arhat.dev/nikaya/third_party/v1_17/golang.org/x/oauth2 .

VERSION-SHA: UNVERIFIED as a module version (the inspected mirrors are old
vendored copies). The documented semantics (interface + reuse + auto-refresh)
are long-stable upstream API.

LICENSE: BSD-3-Clause (golang.org/x/oauth2).

MECHANISM: `TokenSource` is the single interface: `Token() (*Token, error)`,
required safe for concurrent use. `ReuseTokenSource(t, src)` returns the cached
token while `Valid()` (non-nil, has access token, not expired); when invalid it
obtains a fresh one from the wrapped source exactly once even under
concurrency, then caches it. `Config.TokenSource(ctx, t)` wraps a token with
automatic refresh. The pattern separates storage (where the token lives) from
refresh (how a new one is minted) from use (an http.Transport that injects the
Authorization header). Refresh tokens themselves are never used as access
tokens and never logged.

FAILURE SEMANTICS: Refresh failure surfaces as a typed error from `Token()`,
not as a 401 deep in business logic; the transport layer can then mark the
credential revoked and stop retrying. An expired-without-refresh-token token is
a terminal credential state requiring user re-consent.

PING ANALOG: Partial. The Secure Vault exists for credential storage (per
system context) but no token-lifecycle layer (reuse/refresh/concurrency)
exists.

VERDICT: ADOPT. Build the provider-token layer on exactly this shape:
concurrency-safe source, cached-while-valid, single-flight refresh, typed
revoked-vs-transient errors. Language-agnostic; reimplement the semantics in
the PING stack, do not import the Go package for its own sake.

### M12. Standard resilience pipeline (retry, breaker, timeout, 429)

PROBLEM: Per-provider backoff budgets must be declared once and applied
uniformly, with jitter and fast-fail, instead of hand-rolled per-call-site
loops.

SOURCE: Microsoft.Extensions.Http.Resilience, verified research at
https://github.com/jnroesch/juggerhub/blob/HEAD/specs/028-network-resilience/research.md
(facts verified against nuget.org and Microsoft Learn on 2026-07-24).

VERSION-SHA: Microsoft.Extensions.Http.Resilience major 10, latest observed
10.8.0 (2026-07-24). Polly v8 underneath.

LICENSE: MIT (dotnet/extensions, Polly).

MECHANISM: One named pipeline per provider, five strategies outermost-first:
(1) rate limiter (queue 0, 1000 concurrent permits); (2) total timeout 30s;
(3) retry: 3 attempts, exponential backoff with jitter, base delay 2s; (4)
circuit breaker: 10% failure ratio, minimum throughput 100, 30s sampling, 5s
break; (5) per-attempt timeout 10s. Retry and breaker both handle HTTP
5xx, 408, 429, HttpRequestException, and timeout rejections. Half-open probing
is built in. Configuration binds from a config section, so budgets are data,
not code. Resilience4j (Java, Apache-2.0) offers the same composition
(RateLimiterConfig: limitForPeriod/limitRefreshPeriod/timeoutDuration) as an
alternative for JVM stacks.

FAILURE SEMANTICS: Open circuit fails fast with a typed rejection instead of
queuing doomed calls; the breaker half-opens after the break duration to probe
recovery. Retry budgets are bounded (3 attempts), so a hard-down provider
escalates to the breaker, then to stale-serving (M10), never to an unbounded
retry storm.

PING ANALOG: NONE FOUND as implemented machinery. AGENTS.md's antifragile
directive demands bounded retries and failure classification but no pipeline
implements it.

VERDICT: ADOPT. One named resilience pipeline per provider in config, with the
retry-then-breaker-then-timeout ordering and jitter. This is the mechanism
that turns 429s and outages from incidents into budgeted events.

### M13. CloudEvents envelope for normalization

PROBLEM: Provider JSON (Google review, Yelp business, Page node) must become
typed canonical models without losing where each fact came from.

SOURCE: CNCF CloudEvents specification v1.0, corroborated by SDK and adopter
docs, e.g. https://github.com/deveel/hermodr/blob/HEAD/docs/concepts/cloudevents.md.

VERSION-SHA: 1.0 (current; specversion always "1.0").

LICENSE: Apache-2.0 (spec and SDKs).

MECHANISM: Fixed envelope, schema-agnostic payload. Required attributes: `id`
(unique per occurrence), `source` (URI identifying the context, e.g. the
provider plus account), `specversion`, `type` (e.g.
`com.ping.connector.gbp.review.received.v1`). Optional: `time`, `subject`,
`datacontenttype`, `dataschema` (URI of the JSON Schema the data conforms to),
plus extension attributes (correlationid, causationid). The normalizer maps
provider JSON to the canonical model, keeps the raw payload reference, and
emits the CloudEvent; downstream consumers trust the envelope for provenance
and the dataschema URI for validation.

FAILURE SEMANTICS: A record that fails schema validation is quarantined with
its envelope and raw payload intact, never silently coerced or dropped; the
envelope makes the quarantine auditable.

PING ANALOG: Partial. PING's event plane already emits OBSERVATION_CREATED
with provenance sidecars in the tandem pipeline; no fixed envelope standard is
enforced. This would standardize what exists.

VERDICT: ADOPT the envelope for connector-emitted events. It is the
provenance-preserving layer the normalization family asked for, and it composes
with PING's existing event vocabulary instead of replacing it.

### M14. Record coercion to declared JSON Schema

PROBLEM: Providers change field types without notice (a rating arrives as "5"
instead of 5). Strict validation either drops good data or lets bad data
through.

SOURCE: Airbyte Python CDK, `Transform` class, per
https://github.com/airbytehq/airbyte-python-cdk/blob/HEAD/CHANGELOG.md entry
0.1.24 ("Added Transform class to use for mutating record value types so they
adhere to jsonschema definition").

VERSION-SHA: CDK changelog entry 0.1.24; repo HEAD current as of 2026-09-23.

LICENSE: MIT (airbyte-python-cdk).

MECHANISM: Before emitting a record, run it through the stream's declared JSON
Schema and coerce scalar types to the declared types (string "5" to number 5
where the schema says number), rather than rejecting the record. Coercion is
deterministic and logged; anything that cannot be coerced is quarantined, not
silently dropped.

FAILURE SEMANTICS: Coercion failures are typed and counted per stream; a spike
in coercion rate is the early warning that a provider changed its shape.

PING ANALOG: NONE FOUND.

VERDICT: PATTERN_ONLY. Fold the coerce-then-quarantine rule into the FYD
normalizer design; do not import the CDK.

### M15. DOMPurify HTML sanitization

PROBLEM: Provider data (review text, business descriptions, website content)
can carry HTML/JS that must never execute in FYD surfaces.

SOURCE: DOMPurify, cure53/DOMPurify, vendored README at
https://github.com/texttechnologylab/unified-dynamic-annotation-visualizer/blob/HEAD/src/main/resources/static/packages/dompurify-3.3.2/package/README.md.

VERSION-SHA: 3.3.2 (per the inspected vendored README). Snyk notes fixes
through 3.4.7 for older-branch CVEs; pin at or above the latest 3.x at
adoption time.

LICENSE: Apache-2.0 / MPL-2.0 dual.

MECHANISM: DOM-only sanitizer: parse the dirty string with the browser's own
parser, strip everything not on the allowlist, serialize back. Profiles
(`USE_PROFILES: {html: true}`) restrict to HTML only (no SVG/MathML). Hooks
allow custom policy (e.g. force `rel=noopener`, strip `target`). Tolerant of
malformed input by construction since it uses the real parser.

FAILURE SEMANTICS: On parse failure or hostile input it returns sanitized or
empty output, never the raw input. It is a sanitizer, not a validator: output
is safe to inject but may differ from input.

PING ANALOG: NONE FOUND.

VERDICT: ADAPT. Sanitize at the ingestion boundary (connector output), not at
render time, so stored canonical data is already safe. Keep the library pinned
and tracked for CVEs given its security-critical role.

### M16. Hostile-crawl boundaries (Crawl4AI 0.9.3)

PROBLEM: Fetching a business's own website (web-presence leg) means fetching
untrusted URLs, following redirects, and parsing documents. Each step is an
SSRF / disk / XSS vector.

SOURCE: Crawl4AI, unclecode/crawl4ai, release notes
https://github.com/unclecode/crawl4ai/blob/HEAD/docs/blog/release-v0.9.3.md.

VERSION-SHA: 0.9.3 (release notes inspected 2026-09-23).

LICENSE: Apache-2.0.

MECHANISM: Six concrete boundaries, each learned from a CVE: (1) redirects
resolved by hand, one hop at a time, destination policy consulted before each
hop, capped at 5 hops; (2) the peer IP of the response actually read is
validated, closing DNS rebinding (the URL check alone only proves the name
resolved somewhere allowed); (3) downloads stop at `max_pdf_bytes` (100 MiB
default) enforced on the running byte total, not the caller-supplied
Content-Length; (4) parsing stops at `max_pdf_pages` (2000); (5) untrusted
request bodies cannot raise their own caps and image-writing fields are
filtered at the trust boundary; (6) an egress policy (non-globally-routable IPs
blocked) is installed into every fetch path, including non-browser ones.
Wall-clock bound (300s) on the Docker server config.

FAILURE SEMANTICS: A fetch that hits a boundary aborts with a typed reason
(redirect-cap, egress-denied, size-cap) rather than a generic network error, so
the scheduler can distinguish "hostile/evasive site" from "site down".

PING ANALOG: NONE FOUND. No website-fetching guardrails exist.

VERDICT: ADOPT as the fetch policy for the web-presence leg: 5-hop redirect
cap with per-hop checks, peer-IP validation, byte and page caps, untrusted
inputs cannot raise caps, egress deny-list for non-routable addresses. This is
the highest-leverage anti-abuse mechanism in the harvest.

### M17. Resilient webhook consumer shape (cross-source)

PROBLEM: Webhook endpoints die under provider retry storms when handlers do
work synchronously or throw after responding.

SOURCE: Synthesized from M6 (Meta official retry/disable semantics) and
https://github.com/tabsir99/fb-sdk/blob/HEAD/docs/webhooks-and-stores.md.

VERSION-SHA: N/A (design pattern, sources above).

LICENSE: N/A.

MECHANISM: Handler takes a minimal request/response shape (framework
agnostic). Order: verify signature on raw body, respond 200 immediately,
then normalize, then dispatch each event to handlers and stores, settling all
work before resolving; per-event failures go to an onError sink and never
escape the handler because the HTTP response is already gone. Keep the raw
payload on unknown event shapes (`event.raw`) so unmodeled provider additions
do not crash the consumer.

FAILURE SEMANTICS: A crashing event handler degrades to a logged error, not a
failed delivery (which would trigger provider retries and amplification).
Unknown shapes are preserved, not dropped.

PING ANALOG: NONE FOUND.

VERDICT: PATTERN_ONLY. Encode as the standard webhook handler skeleton when
the first callback surface is built.

### M18. Google review notification types (event taxonomy)

PROBLEM: Review events need a stable taxonomy so pollers, push consumers, and
reply-moderation share one vocabulary.

SOURCE:
https://developers.google.com/my-business/reference/notifications/rest/v1/NotificationSetting
plus integrator taxonomy at
https://github.com/socialapi-ai/docs/blob/HEAD/connectors/google.mdx.

VERSION-SHA: live official docs (rolling); taxonomy corroborated by two
independent integrators.

LICENSE: Documentation.

MECHANISM: NotificationType enum covers NEW_REVIEW, UPDATED_REVIEW (reviewer
edits, reply approvals, reply rejections distinguished by a `change` field),
plus location-level changes (customer media, Google updates pending,
Voice-of-Merchant, duplicates). The same taxonomy drives both the Pub/Sub
consumer and the polling backfill, so push and poll produce identical event
types.

FAILURE SEMANTICS: An unknown notification type is carried as opaque with its
raw payload, not rejected, so Google can add types without breaking the
consumer.

PING ANALOG: Partial. Review-triggered outreach already keys on review rating
thresholds; this gives it the event taxonomy to key on.

VERDICT: ADAPT. Use Google's change taxonomy as the canonical review-event
vocabulary across push and poll paths.

## PRIORITY SHORTLIST (top 5, highest leverage for FYD)

1. M3, Google Business Profile access model. It is the critical path, not a
   mechanism: the 60-day verified-GBP seasoning requirement, the approval form,
   and the producer-restricted legacy reviews surface decide what FYD can
   legally and technically get from Google. Start the GBP ownership clock
   before anything else.

2. M11, short-lived token reuse and refresh. Every provider leg (Google,
   Meta, Yelp, future) rides on this one lifecycle shape. Build it once,
   correctly, with single-flight refresh and typed revoked-vs-transient
   errors.

3. M6 + M8, provider callback ingestion. Meta's raw-body HMAC verification
   with 200-fast-then-async and dedup, plus Google's Pub/Sub push with
   polling as the completeness backstop. This is the entire inbound-event
   architecture.

4. M12 + M10, backoff budgets and graceful degradation. One named resilience
   pipeline per provider (retry with jitter, breaker, timeouts, 429 handling)
   feeding into labeled-stale serving on outage. This is what keeps FYD alive
   when a provider is not.

5. M16, hostile-crawl boundaries. The web-presence leg fetches untrusted URLs
   by definition; the 5-hop redirect cap, peer-IP validation, byte/page caps,
   and egress deny-list are the difference between a connector and a
   liability.

## EXACT REMAINING EXTERNAL BLOCKERS

These are actions only Nolan or an authorized human can take. Nothing below
was worked around.

1. Google Cloud project + GBP API approval. Requires: a Google account that
   owns/manages a Google Business Profile verified and active for 60+ days,
   a representative business website on that profile, submission of Google's
   "Application for Basic API Access" form, and waiting for approval. Until
   then every Business Profile API quota is 0 QPM.

2. Google OAuth client + consent. After approval: OAuth 2.0 client ID/secret,
   consent screen requesting `https://www.googleapis.com/auth/business.manage`,
   and a minted refresh token stored in the vault. Reviews additionally need
   the producer-restricted legacy v4 surface; approval may not grant it
   (observed 403 SERVICE_DISABLED on approved projects), so plan for the
   reviews leg to stay degraded.

3. Google Cloud Pub/Sub topic for notifications. Requires the Cloud project
   from blocker 1, a topic granting `mybusiness-api-pubsub@system.gserviceaccount.com`
   the Publisher role, and a push subscription to an HTTPS endpoint.

4. Meta app + App Review. Requires: a Meta app with an app secret, Advanced
   Access via App Review for `pages_read_engagement`,
   `pages_read_user_content`, `pages_show_list` (production use), and Page
   access tokens for target Pages. Separately: verify by live probe whether
   Page Reviews/Recommendations endpoints still function on current Graph API
   versions (vendor-reported 501 since v22.0, not officially confirmed).

5. Meta webhook endpoint. Requires a public HTTPS endpoint URL and the verify
   token to complete the subscription handshake.

6. Yelp app + API key. Requires a Yelp developer app (approval is usually
   instant) and a decision on plan tier: trial is evaluation-only per Yelp's
   FAQ, not for commercial deployment; production needs a paid plan
   (30,000 calls/month default, 5,000/day cap).

7. Credential scoping decision. The Secure Vault exists, but per-connector
   credential scoping (which token lives where, rotation cadence, revocation
   handling) needs Nolan's sign-off before the M11 lifecycle layer is built
   against it.

## NEXT HIGHEST-VALUE PACKET

Design the FYD connector manifest schema (the M1/M2 four-verb contract plus
capability declarations: auth needs, rate budget, data shape, freshness),
expressed as JSON Schema, with the M13 CloudEvents envelope as the emitted
event shape. That packet needs zero new research: every mechanism it depends
on is harvested above. The packet after that is the OAuth bootstrap runbook
(M11 + blockers 1, 2, 4, 6), which is gated on Nolan clearing the external
blockers.

## LEDGER OF SOURCES INSPECTED (16)

Searches (14):
1. Airbyte CDK source streams incremental sync capability
2. MCP tools/list capability declaration 2026 spec
3. Airbyte protocol ConnectorSpecification OAuth2Specification spec/check/discover/read
4. Google Business Profile API reviews list OAuth scopes
5. Yelp Fusion API reviews endpoint auth and rate limits
6. Meta webhooks X-Hub-Signature-256 verification docs
7. Stripe webhook signature verification constructEvent
8. Facebook Graph API Page ratings reviews version fields
9. resilience4j RateLimiter token bucket configuration
10. DOMPurify README sanitize XSS version
11. Microsoft Graph delta query ETag last-modified
12. CloudEvents CNCF spec 1.0 envelope
13. Crawl4AI SSRF protection hostile crawl boundaries
14. golang oauth2 TokenSource reuse refresh caching
15. GBP Notifications API PubSub review notification topic
16. Polly .NET resilience circuit breaker docs
17. Graph API changelog v22 Page ratings reviews deprecation
18. Yelp Fusion API rate limit daily requests official docs
19. RFC 9110 conditional requests / RFC 5861 stale-while-revalidate
(counted as issued queries; several searches returned multiple usable sources)

Page opens (2):
1. https://developers.google.com/my-business/content/prereqs (official, read)
2. https://developers.facebook.com/docs/graph-api/changelog/ (official version table read)
