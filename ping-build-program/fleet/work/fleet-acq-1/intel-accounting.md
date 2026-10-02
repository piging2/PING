# Connector intel - accounting domain (reference platform: QuickBooks Online)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
REST API at https://quickbooks.api.intuit.com/v3/company/{realmId}/. Entities: account, bill, billpayment, invoice, payment, creditmemo, customer, vendor, employee, item, purchase, journalentry, taxagency, department. Sparse update via sparse=true with Id+SyncToken. Query with SQL-like select.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop ; https://medium.com/intuitdev/new-to-intuit-developer-how-to-use-the-quickbooks-online-api-a211e1eabbc7

## EVENTS
Webhooks for entity create/update/delete/merge/void delivered to a subscribed endpoint. Verifier token validates payloads. Not all entities emit events; check the subscribed entity list.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

## CAPABILITIES
CRUD per entity (entity-specific required fields), batch endpoint for bulk ops, query language, attachable (file attachments), reports API (read-only P&L, balance sheet, etc.). Realm-scoped.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

## AUTHORIZATION
OAuth 2.0 authorization code; per-realm access tokens with refresh. Scopes include com.intuit.quickbooks.accounting. App must be authorized per company (realmId).
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

## WEBHOOKS
HTTPS endpoint subscription per realm; Intuit signs payloads with a verifier token the app sets. Delivery retries on failure; endpoint must respond promptly.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

## POLLING
Query entities ordered by MetaData.LastUpdatedTime with a stored high-water mark. Change data is also available via the CDC (change data capture) query endpoints.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

## RATE-LIMITS
Throttling limits are published in Intuit developer documentation (per-minute per-realm request quotas); exceeding returns 429. Verify current values in the docs before hard-coding.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

## IDEMPOTENCY
No idempotency-key header. Safe retry via query-before-create on natural keys (e.g. DocNumber) and sparse update with SyncToken for optimistic concurrency.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

## EFFECTS
Financial writes: invoices, bills, payments, journal entries post to the ledger with audit trail. Void vs delete semantics per entity; some entities are void-only.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

## REVERSIBILITY
Delete removes; void keeps the audit trail (preferred for posted transactions). The audit log itself is append-only. Corrections are reversing entries, not history edits.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

## PROVENANCE
Every entity carries Id (stable per realm), SyncToken (version), MetaData{CreateTime, LastUpdatedTime, CreatedByRef}. realmId scopes all identity.
Sources: https://developer.intuit.com/app/developer/qbo/docs/develop

