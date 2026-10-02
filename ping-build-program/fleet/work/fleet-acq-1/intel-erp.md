# Connector intel - erp domain (reference platform: NetSuite)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
REST API at https://{accountId}.suitetalk.api.netsuite.com/services/rest/ exposes record types (customer, salesOrder, invoice, item, vendor, employee, custom records) under /record/v1/{recordType}. OpenAPI-documented; SuiteTalk SOAP is the legacy surface.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## EVENTS
No native webhook/event-stream API. Change events are produced via RESTlets plus User Event scripts, or polled through record search / SuiteAnalytics.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## CAPABILITIES
CRUD on standard and custom records, record search, SuiteQL queries, sublist manipulation, file cabinet access. Everything is account-scoped by role permissions.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## AUTHORIZATION
OAuth 2.0 authorization-code flow for integrations; token-based authentication (TBA) is the legacy machine pattern. Effective access = integration role permissions.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## WEBHOOKS
No first-party webhook delivery. The documented pattern is a RESTlet endpoint invoked by a User Event script on record change, pushing to the connector.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## POLLING
Incremental sync via record search filtered on lastModifiedDate, or SuiteQL ordered by lastModifiedDate with pagination. High-water mark persisted by the connector.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## RATE-LIMITS
API governance limits apply per account (concurrency and throughput governors). Exact values depend on account tier and are published in NetSuite docs; not restated here.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## IDEMPOTENCY
No idempotency-key header. externalId on records enables upsert-style dedup for supported types; otherwise the connector must check-before-create.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## EFFECTS
Financial record writes (orders, invoices, journals) carry accounting side effects and an immutable audit trail. Reads are side-effect-free.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## REVERSIBILITY
Records support void or delete per type; the system audit trail (System Notes) is append-only and never removed. Corrections are new transactions, not edits of history.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

## PROVENANCE
internalId is the stable PK; externalId is the client key. System Notes record who changed what and when; lastModifiedDate drives incremental sync.
Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html

