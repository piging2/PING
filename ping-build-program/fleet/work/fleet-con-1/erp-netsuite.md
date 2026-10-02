# Connector intel — ERP domain (reference platform: NetSuite SuiteTalk REST Web Services)

Mapped from public docs; implementation stays data-driven. Provider: NetSuite (Oracle).
Base: https://{accountId}.suitetalk.api.netsuite.com/services/rest/ (tenant-specific base URL)

## OBJECTS
REST record service: GET/POST/PATCH/DELETE /record/v1/{recordType}[/{id}] for
standard record types (customer, invoice, salesOrder, item, vendor, journalEntry,
etc.). SuiteQL: POST /query/v1/suiteql for SQL-like querying (max 100,000 rows
per query). Metadata catalog: GET /record/v1/metadata-catalog for dynamic schema
discovery of all record types, sublists, subrecords, operations. Records carry
sublists/subrecords for complex types.
Sources: https://github.com/redplanethq/core/issues/526 (docs.oracle.com chapter
cited for REST web services: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html) ;
https://docs.mulesoft.com/netsuite-rest-connector/latest/

## EVENTS
No generic "events" list API. Change detection via (1) SuiteQL polling with
dateModified/lastModified filters, (2) saved-search-based REST (suite_analytics
scope: saved searches via REST), (3) native Event Subscriptions (webhooks) in
NetSuite UI (Setup > Integration > Event Subscriptions) with per-subscription
logs showing each webhook call, payload, response code, errors, (4) custom
RESTlets/User Event Scripts pushing outbound HTTPS.
Source: https://houseblend.io/articles/pdfs/netsuite-webhooks-restlets-user-event-scripts.pdf
(compared NetSuite webhooks vs RESTlets vs user event scripts, event subscription log)

## CAPABILITIES
CRUD on most record types (REST), batch add/update/upsert/delete lists (max 100
records per request), SuiteQL read, saved-search read, metadata discovery,
custom RESTlets (bespoke logic served as REST endpoints). Upsert requires the
record type to have an external ID field.
Sources: https://docs.mulesoft.com/netsuite-rest-connector/latest/
(batch ops max 100 records, SuiteQL 100,000-row cap, upsert requires external ID)

## AUTHORIZATION
OAuth 2.0 (authorization-code grant for user-delegated, client-credentials grant
for server-to-server) for REST web services and RESTlets; legacy Token-Based
Authentication (OAuth 1.0). Scopes: rest_webservices, restlets, suite_analytics;
effective authorization = intersection of scopes AND the NetSuite user's role
(RBAC delegation). SOAP web services do NOT support OAuth 2.0 (TBA only).
Access tokens are short-lived (~60 minutes); refresh via refresh token.
Sources: https://www.houseblend.io/articles/netsuite-login-authentication-guide ;
https://www.houseblend.io/articles/netsuite-customer-portal-oauth2-integration

## WEBHOOKS
NetSuite ships a native webhook feature: Integration > Event Subscriptions —
realtime notification to external services on specific record changes; builtin
event subscription log (each call, payload, response code, errors).
Concurrency constraints: ~2 concurrent handlers on Shared accounts, ~10 on
Dedicated (per docs.oracle.com via houseblend). High-volume queues can hit this
cap. Alternative DIY path: SuiteScript User Event Scripts issuing outbound HTTPS.
Source: https://houseblend.io/articles/pdfs/netsuite-webhooks-restlets-user-event-scripts.pdf

## POLLING
SuiteQL + dateModified filters, or saved-search REST reads; batch read caps
(100 records/batch), list caps (1,000 objects per request). getIntegrationGovernanceInfo
API lets a client check available integration/concurrency headroom before bursting.
Source: https://docs.mulesoft.com/netsuite-rest-connector/latest/ ;
http://nlcorp.app.netsuite.com/core/media/media.nl?_xt=.pdf&c=NLCORP&h=1a5af77f3fdd806dea9e&id=205292151
(concurrency governance cheat sheet: getIntegrationGovernanceInfo / getAccountGovernanceInfo)

## RATE LIMITS
Governance is concurrency- + frequency-based, per account, tier-dependent
(service tier, SuiteCloud Plus licenses): concurrency pool (typical standard
account ~20 concurrent max for SOAP/REST), per-user sublimits (RESTlet: 5
concurrent executions per user/role), 60-second and 24-hour frequency windows.
Error mapping: REST record service -> HTTP 429 ("Request limit exceeded");
SOAP -> 403 / ExceededConcurrentRequestLimitFault / ExceededRequestLimitFault;
RESTlet over-limit -> HTTP 400 with SSS_REQUEST_LIMIT_EXCEEDED. Exact numeric
windows are account-specific (visible in NetSuite UI Administration > API limits),
so do not hardcode counts: detect 429/403/SSS_REQUEST_LIMIT_EXCEEDED and back off.
Sources: https://www.houseblend.io/articles/netsuite-api-governance-guide ;
https://rollout.com/integration-guides/netsuite/api-essentials

## IDEMPOTENCY
No documented native idempotency-key header for REST record service. Idempotent
writes via externalId-based upsert (record types that support external ID).
SuiteQL reads are naturally idempotent. Client must implement
check-before-create or upsert-by-external-id for safe retries.
Source: https://docs.mulesoft.com/netsuite-rest-connector/latest/
("Upsert operations require the record type to have an external ID field")

## EFFECTS
Writes create/update/delete business records with accounting consequences
(posting journal entries, transforming sales orders to invoices, inventory
adjustments). User Event Scripts and workflows can fire on record save, creating
downstream side effects inside NetSuite. Reads (record GET, SuiteQL, saved
search) are side-effect-free.
Sources: OBJECTS citations.

## REVERSIBILITY
DELETE on a record removes it; records with posted accounting effects generally
cannot be hard-deleted by API (NetSuite enforces period/record constraints);
corrections are made with reversing entries (reversing journal) rather than
deletion. Precise semantics are record-type-specific — connector must not assume
undelete. Treat ERP writes as effectively irreversible business events; the
safe pattern is compensating transactions, not rollback.
Source: N/A for a single canonical doc on restore semantics across all record
types — verified shape of the safe pattern is from the record-type constraints
documented in NetSuite record help; connector design note only. Confidence medium.

## PROVENANCE
Records carry created/lastModified audit fields and creator info; SuiteQL can
select system fields; event subscription log captures outbound payloads and
response codes; SuiteScript execution logs provide audit/error trails. Sufficient
for SOURCE -> OBSERVATION -> EVIDENCE lineage, with audit fields as the
provenance carriers.
Sources: https://houseblend.io/articles/pdfs/netsuite-webhooks-restlets-user-event-scripts.pdf ;
https://docs.mulesoft.com/netsuite-rest-connector/latest/
