# Connector intel - crm domain (reference platform: HubSpot)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Uniform /crm/v3/objects/{objectType} surface: contacts, companies, deals, tickets, line_items, products, quotes, calls, emails, custom objects. PK hs_object_id; properties opt-in on reads; dedup keys email (contacts) / domain (companies).
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## EVENTS
No generic events API. Change events via Webhooks subscriptions (object create/delete/property change); engagements (calls, emails, meetings, notes, tasks) are CRM objects.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## CAPABILITIES
Read, list (after cursor), batch read, create, upsert by unique property (?idProperty=), PATCH, archive-delete, batch operations, search with filterGroups, property schema discovery, associations, pipelines/stages, owners. Granular OAuth scopes.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## AUTHORIZATION
OAuth 2.0 for public apps with granular scopes; private apps use long-lived tokens. Legacy API keys removed. Effective auth = scopes intersected with portal permissions.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## WEBHOOKS
Webhooks API v3 subscriptions per app (up to 1000). Batched delivery, 5s response requirement, retries with backoff; HMAC-SHA256 signature (X-HubSpot-Signature-v3) with timestamp replay protection. Deliveries do not count against API limits.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## POLLING
Incremental sync on hs_lastmodifieddate; cursor pagination via after; search API for property filters. Webhooks plus periodic reconciliation for gap-free CDC.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## RATE-LIMITS
Burst per 10s per app by tier; daily per-account caps; CRM Search API 5 req/s per account. Exceeding returns 429. Exact tier values are published in the usage guidelines; verify current numbers there.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## IDEMPOTENCY
No idempotency-key header. Upsert by unique property and dedup keys (contacts email, companies domain) give idempotent writes; deals/tickets need check-before-create.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## EFFECTS
Create/update/archive records, associations, workflow enrollment (can send emails), engagements. Side effects: workflow triggers, webhook emissions, notifications. Reads are side-effect-free.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## REVERSIBILITY
DELETE is soft: recycle bin, restorable via UI within 90 days; no public API unarchive. GDPR-style permanent delete for contacts is irreversible.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

## PROVENANCE
createdate/lastmodifieddate on every record; propertiesWithHistory for per-version values; hs_object_id stable; archived flag; hubspot_owner_id attribution; webhook payloads carry objectId/propertyName/propertyValue/timestamp.
Sources: https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines

