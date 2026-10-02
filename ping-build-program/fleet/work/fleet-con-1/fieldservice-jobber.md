# Connector intel — Field-service domain (reference platform: Jobber)

Mapped from public docs; implementation stays data-driven. Provider: Jobber.
GraphQL API; version via X-JOBBER-GRAPHQL-VERSION header (e.g. 2025-01-20).
NOTE: this is squarely in Nolan's target market (home-service trades).

## OBJECTS
Clients (phones[] free-form numbers, emails[]), Properties (service addresses),
Jobs (title, jobType ONE_OFF, lineItems {name, quantity, unitCost}, total,
client linkage), Visits (startAt/endAt, title, assignedUserIds, completion
state), Invoices (status PAID/SENT/..., line items), Payments (amount,
paymentDate), Quotes, Users/team members, Products/Services catalog. IDs are
GraphQL global ids (base64 gid://Jobber/Job/...).
Sources: https://github.com/justinvogel/jobber-mcp/blob/HEAD/README.md ;
https://github.com/lerboi/homeservice_agent/blob/HEAD/.planning/phases/56-jobber-read-side-integration-customer-context-clients-jobs-invoices/56-RESEARCH.md

## EVENTS
Webhooks: subscribe via webhook endpoint creation with topics (CLIENT_CREATE,
CLIENT_UPDATE, JOB_UPDATE, INVOICE_UPDATE, INVOICE_PAID, VISIT_COMPLETE,
VISIT_UPDATE...). Delivery payload: {data:{webHookEvent:{topic, appId,
accountId, itemId, occurredAt}}}. At-least-once: Jobber retries on non-200.
Handler pattern: HMAC-verify, resolve itemId -> client -> phones, act, always
200 (silent 200 for unknown tenants prevents retry storms). Polling fallback:
GraphQL list queries with first/after cursors + filters (invoiceStatus etc.).
Sources: https://github.com/lerboi/homeservice_agent/blob/HEAD/.planning/phases/56-jobber-read-side-integration-customer-context-clients-jobs-invoices/56-RESEARCH.md ;
https://github.com/justinvogel/jobber-mcp/blob/HEAD/README.md

## CAPABILITIES
Clients CRUD, jobs create/close (closeAllVisits), visits create/complete,
invoices create/mark-sent, payments query, quotes, line-item management, custom
GraphQL passthrough. Read: list/get with cursor pagination, sort, filters.
Write surface is job-lifecycle-centric (create job -> schedule visits ->
complete -> invoice -> paid).
Source: https://github.com/justinvogel/jobber-mcp/blob/HEAD/README.md

## AUTHORIZATION
OAuth 2.0 (client id/secret from Jobber developer app); scopes configured in
the Developer Center UI, NOT passed as scope= param. Token refresh + revoke
supported. Webhook signing key IS the client_secret (not a separate webhook
secret): HMAC-SHA256(rawBody, client_secret), base64, header
x-jobber-hmac-sha256, timing-safe compare. Request smallest scope (standing
rule 1); client PII (phones, addresses) is sensitive.
Sources: https://github.com/lerboi/homeservice_agent/blob/HEAD/.planning/phases/56-jobber-read-side-integration-customer-context-clients-jobs-invoices/56-CONTEXT.md ;
https://github.com/justinvogel/jobber-mcp/blob/HEAD/README.md

## WEBHOOKS
Subscription verification handshake exists (simpler than Xero's: no
intent-verify branch per one implementation). Sign: x-jobber-hmac-sha256 =
base64(HMAC-SHA256(raw body, client_secret)); raw bytes only, never parse
first; timingSafeEqual. Topics route to client/job/visit/invoice resolution
(CLIENT_* -> itemId is clientId; JOB/VISIT_* -> job -> client; INVOICE_* ->
invoice -> client). Always return 200 after handling; unknown accountId ->
silent 200 (prevents retry storms). Dedupe by (topic, itemId, occurredAt).
Sources: https://github.com/lerboi/homeservice_agent/blob/HEAD/.planning/phases/56-jobber-read-side-integration-customer-context-clients-jobs-invoices/56-RESEARCH.md

## POLLING
GraphQL connections with first/after cursors, sort keys (CREATED_AT), filters
(invoiceStatus etc.). Poll cadence modest; webhooks-first for lifecycle
events. No numeric rate limits retrieved in this pass: followup at build.
Source: https://github.com/justinvogel/jobber-mcp/blob/HEAD/README.md

## RATE LIMITS
No numeric rate limits retrieved in the gathered sources. Documented shape:
GraphQL API; treat 429/5xx with exponential backoff. Followup: verify Jobber
rate-limit documentation at build time; do not invent numbers.
Sources: none with numeric limits — documented as unpublished.

## IDEMPOTENCY
No native idempotency-key documented in retrieved sources. Webhook handlers
dedupe by (topic, itemId, occurredAt). Mutation retry-safety client-side:
read-before-write, resolve by id, reconcile on timeout. Followup: verify at
build time.
Sources: EVENTS citations; flagged as verify-at-build.

## EFFECTS
Writes alter real business operations: jobs created/closed, visits scheduled/
completed (crew dispatch), invoices sent (customer billing), clients created
with PII. Reads side-effect-free. Crew/customer-visible consequences: treat
job/visit/invoice writes as operationally significant.

## REVERSIBILITY
Jobs can be closed/reopened per API semantics (verify at build); visits
completable but completion is a business fact (correct via new visit, not
un-complete); invoices sent cannot be un-sent (credit/void flow instead);
payments are financial facts. Model job lifecycle as forward-moving with
compensating actions.

## PROVENANCE
Global ids, occurredAt on webhook events, accountId (tenant isolation),
client/job/visit/invoice linkage (event -> itemId -> client -> phones),
invoice status history, payment records with dates. Client phones stored
free-form: normalize to E.164 on our side before using as keys. Sufficient
for job-lifecycle lineage.
Sources: https://github.com/lerboi/homeservice_agent/blob/HEAD/.planning/phases/56-jobber-read-side-integration-customer-context-clients-jobs-invoices/56-RESEARCH.md
