# Connector intel — CRM domain (reference platform: HubSpot CRM API)

Mapped from public docs; implementation stays data-driven. Provider: HubSpot.
Base: https://api.hubapi.com (per community/third-party summaries of official docs)

## OBJECTS
Uniform shape: every object under /crm/v3/objects/{objectType} supports the same
basic/search/batch/association operations. Standard objects: contacts, companies,
deals, tickets, line_items, products, quotes, calls, emails, feedback_submissions.
Custom objects (2-<n> or p_<name>) appear alongside standard ones.
- PK: hs_object_id (system property); createdate, lastmodifieddate.
- Properties are opt-in on reads (properties=...); defaults include email/firstname for contacts.
- Dedup keys: contacts dedup on email, companies on domain; deals/tickets have no dedup.
- Associations between objects via association-type IDs (e.g. 341 = deal_to_company).
Sources: https://github.com/anthropics/claude-tag-plugins/blob/HEAD/hubspot/skills/hubspot-api/SKILL.md ;
https://github.com/panodata/omniload/blob/HEAD/docs/supported-sources/hubspot.md ;
https://github.com/bruin-data/bruin/blob/HEAD/docs/ingestion/hubspot.md

## EVENTS
No generic "events" API; change events surface two ways: (1) Webhooks subscriptions
(object creation/deletion/property change per object type), (2) engagements as CRM
objects (calls, emails, meetings, notes, tasks) + marketing email events streams.
PING ingests as OBSERVATION, never as HubSpot-shaped truth.
Sources: https://github.com/airbytehq/airbyte/blob/HEAD/docs/integrations/sources/hubspot.md ;
https://github.com/madviking/webinar/blob/HEAD/session2/integration_layer_example_starting_documentation/connectors/hubspot/work_estimate.md

## CAPABILITIES
Read one, list with pagination (after cursor), batch read (POST .../batch/read),
create (POST), upsert by unique property (PUT with ?idProperty=email),
partial update (PATCH), archive-delete (DELETE), batch create/update/archive,
search (POST .../search with filterGroups), property schema discovery
(/crm/v3/properties/{objectType}), pipelines + stages, owners, associations CRUD,
workflows enrollment (separate Marketing/Workflows scopes). Everything behind
granular OAuth scopes.
Sources: same as OBJECTS.

## AUTHORIZATION
OAuth 2.0 for public (marketplace) apps with granular scopes
(e.g. crm.objects.contacts.read, crm.objects.custom.read); private apps use
long-lived access tokens. Legacy API keys deprecated/removed. Token's effective
authorization = intersection of scopes and portal permissions.
Source: https://github.com/teradata/airbyte/blob/HEAD/docs/integrations/sources/hubspot.md
(Airbyte HubSpot source documents OAuth vs Private App auth and scope additions)

## WEBHOOKS
Webhooks API v3 subscriptions (POST .../webhooks/v3/{appId}/subscriptions);
up to 1000 subscriptions per app. Delivery: batches up to 100 events per POST,
up to 10 concurrent deliveries, target must respond within 5 seconds, retries up
to 10 times over ~24h with jitter; non-2xx/timeout/connection failure retry.
Signature validation: X-HubSpot-Signature-v3 + X-HubSpot-Request-Timestamp,
HMAC-SHA256 over method+URI+body; reject requests older than 5 minutes
(replay protection). Webhook deliveries do NOT count against API rate limits.
Source: https://github.com/madviking/webinar/blob/HEAD/session2/integration_layer_example_starting_documentation/connectors/hubspot/work_estimate.md

## POLLING
Incremental sync via hs_lastmodifieddate as merge key (Airbyte streams use
PK=hs_object_id, incremental key hs_lastmodifieddate, merge strategy).
Cursor pagination via `after` on list endpoints; search API for property filters.
CDC-style gap-free polling needs webhooks + periodic reconciliation.
Sources: https://github.com/panodata/omniload/blob/HEAD/docs/supported-sources/hubspot.md ;
https://github.com/bruin-data/bruin/blob/HEAD/docs/ingestion/hubspot.md

## RATE LIMITS
Burst (per 10s, per app): Free/Starter 100, Professional/Enterprise 190,
marketplace OAuth apps 110 per installed account; API Limit Increase add-on
raises private apps to 250 (max 2 add-ons). Daily (per account, shared across
apps): Free/Starter 250,000; Professional 625,000; Enterprise 1,000,000.
CRM Search API: 5 req/s per account, result-window caps. Exceeding returns 429.
Sources: https://github.com/teradata/airbyte/blob/HEAD/docs/integrations/sources/hubspot.md
(quoting https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines) ;
https://www.chift.eu/blog/best-practices-for-a-smooth-hubspot-api-integration ;
https://community.hubspot.com/t5/Developer-Announcements/Increasing-our-API-limits/m-p/1044822/highlight/true?profile.language=de

## IDEMPOTENCY
No native idempotency-key header on the CRM API. Achieved via unique-property
upsert (PUT /crm/v3/objects/contacts/{email}?idProperty=email) and dedup keys
(contacts: email, companies: domain); deals/tickets have no dedup so creates are
not naturally idempotent — client must check-before-create. No Idempotent-Replayed
equivalent; safe-retry must be built on the connector side (upsert-first pattern).
Source: https://github.com/anthropics/claude-tag-plugins/blob/HEAD/hubspot/skills/hubspot-api/SKILL.md
(dedup-key documentation)

## EFFECTS
Write operations: create/update/archive records, manage associations, enroll
contacts in workflows (can send emails), create engagements. Side effects beyond
the record: workflow triggers, webhook emissions, notification sends, dedup
conflicts. Reads are side-effect-free.
Sources: OBJECTS citations.

## REVERSIBILITY
DELETE is soft: record goes to the recycle bin, marked archived, restorable via
the HubSpot UI within 90 days (restores properties, associations, supported
activities). After 90 days it is unrecoverable without an external backup. There
is NO public API endpoint to restore/unarchive a record (confirmed by HubSpot
Community manager citing API docs). Contacts additionally support permanent
(GDPR-style) delete, which is irreversible. Implication for PING: connector must
not claim programmatic undelete capability.
Sources: https://knowledge.hubspot.com/records/delete-crm-records?_ga=2.24816563.866181865.1621536754-1563886631.1621536754 ;
https://community.hubspot.com/t5/APIs-Integrations/Contacts-API-is-it-possible-to-unarchive-a-contact-using-API/m-p/694953/highlight/true ;
https://github.com/anthropics/claude-tag-plugins/blob/HEAD/hubspot/skills/hubspot-api/SKILL.md

## PROVENANCE
Every record carries createdate/lastmodifieddate; property-level history
available via propertiesWithHistory on reads (per-version values with timestamps);
hs_object_id is stable; associations carry type + category; archived flag
distinguishes deleted. Owner attribution via hubspot_owner_id. Webhook events
carry objectId, propertyName, propertyValue, timestamp. Sufficient to build
SOURCE -> OBSERVATION -> EVIDENCE lineage.
Sources: OBJECTS citations.
