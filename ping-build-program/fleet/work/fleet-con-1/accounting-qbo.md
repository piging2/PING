# Connector intel — Accounting domain (reference platform: QuickBooks Online API)

Mapped from public docs; implementation stays data-driven. Provider: Intuit QBO.
API surface: /v3/company/{realmId}/{entity}[/{id}], query endpoint, CDC endpoint, batch endpoint.

## OBJECTS
Entities: Customer, Invoice, Item, Payment, Bill, Vendor, Account (chart of
accounts), CreditMemo, RefundReceipt, PurchaseOrder, JournalEntry, TaxAgency;
report objects (ProfitAndLoss, BalanceSheet, A/R aging). Every entity wraps in
{Entity: {...}, "SyncToken": "...", "MetaData": {CreateTime, LastUpdatedTime}}.
Full and sparse updates supported; some entities carry business-rule constraints
documented per entity in Intuit's API reference.
Sources: https://www.getknit.dev/blog/quickbooks-online-api-integration-guide-in-depth ;
https://github.com/dksingh1997/parlel/blob/HEAD/docs/quickbooks.md (entity
wrapping + SyncToken/MetaData behavior in a faithful API-surface emulator)

## EVENTS
Two complementary mechanisms: (1) Event Notifications (webhooks) for
create/update/delete/void/merge on ~two dozen entities (Customer, Invoice,
Payment, Bill, Item, Account, ...); (2) Change Data Capture (CDC):
GET /v3/company/{realmId}/cdc?entities=Invoice,Customer&changedSince=<ts> —
returns entities changed in the last 30 days, up to 1000 objects per request;
intended for hourly/daily scheduled syncs, initial loads, and reconnect catch-up.
Webhook payloads carry entity type + operation + company ID only; the record is
fetched via a follow-up API call. Note: Intuit is migrating webhook payloads to
CloudEvents format; all apps required to migrate by 2026-07-31; old and new
formats supported during transition.
Sources: https://www.getknit.dev/blog/quickbooks-online-api-integration-guide-in-depth ;
https://medium.com/@rechadsalma123/quickbooks-api-integration-guide-for-developers-fdbf7fe2a5a2 ;
https://github.com/linehaul-ai/linehaulai-claude-marketplace/blob/HEAD/plugins/quickbooks-api-integration/commands/quickbooks.md
(CDC endpoint syntax + webhooks-vs-CDC decision matrix)

## CAPABILITIES
Create/read/update/delete per entity, query language endpoint
(GET ?query=SELECT * FROM Invoice WHERE ...), batch (up to 10 payloads per
batch request), sparse update, CDC, reports, change-data endpoints. Only
OAuth2-authorized companies receive webhooks.
Sources: same as OBJECTS/EVENTS.

## AUTHORIZATION
OAuth 2.0 (Intuit identity platform): app in Intuit Developer Portal with
Client ID/Secret; scopes like com.intuit.quickbooks.accounting; authorization-code
flow to user consent, code exchanged at /token for access + refresh tokens.
Access tokens expire after 60 minutes (some docs say 1 hour); refresh tokens
rotate (~100-day window, each refresh may return a new refresh token — persist
the latest). Request the SMALLEST scope set needed (standing rule 1).
Sources: https://www.getknit.dev/blog/quickbooks-online-api-integration-guide-in-depth ;
https://github.com/wyre-ai/msp-claude-plugins/blob/HEAD/msp-claude-plugins/quickbooks/quickbooks-online/README.md
(token lifetimes, scope control)

## WEBHOOKS
Register endpoint URL + entity/event subscriptions in the Intuit Developer
Portal. Intuit POSTs event notifications (entity type, operation, company ID —
payload excludes the changed data; follow-up fetch required). Validate payload
with the verifier token from the portal. Must respond within 1 second (process
async). Webhooks do NOT backfill history and are not a guaranteed gap-free feed;
standard pattern is webhooks + CDC backup.
Sources: https://www.getknit.dev/blog/quickbooks-online-api-integration-guide-in-depth ;
https://medium.com/@rechadsalma123/quickbooks-api-integration-guide-for-developers-fdbf7fe2a5a2

## POLLING
CDC endpoint is the polling surface (changedSince cursor, 30-day window, up to
1000 objects/request). Query endpoint with MetaData.LastUpdatedTime filters as
secondary option. Webhooks are primary for real-time; CDC is the reconciliation
layer. Combined webhooks + CDC is the documented reference pattern.
Source: https://github.com/linehaul-ai/linehaulai-claude-marketplace/blob/HEAD/plugins/quickbooks-api-integration/commands/quickbooks.md

## RATE LIMITS
Per Intuit best-practices doc: production throttling per realm (company) file —
10 concurrent requests per second per realmId; 500 requests per minute per
realmId; batch endpoint separately metered: 40 batch requests/min per realmId,
10 payloads per batch request. Exceeding returns HTTP 429 (or 403 with throttling
error); respect Retry-After; exponential backoff. Report endpoints metered
separately. Tiered, metered API pricing exists under Intuit's App Partner Program
(call volume carries direct cost — relevant to lane BCQ cost questions).
Sources: http://help.developer.intuit.com/s/article/QuickBooks-Online-API-Best-Practices (official) ;
https://www.scalekit.com/blog/quickbooks-mcp-vs-api (429 + metered pricing) ;
https://medium.com/intuitdev/new-to-intuit-developer-how-to-use-the-quickbooks-online-api-a211e1eabbc7

## IDEMPOTENCY
Native support: unique `request-id` as URL query parameter gives idempotency —
the API stores the first response and replays it for repeat submissions of the
same request-id (playback feature for outages); without a request-id, a repeat
submission creates a duplicate transaction with a new ID. Writes also carry
SyncToken optimistic locking: every update must send the current SyncToken or
the write is rejected (concurrency-safe, not retry-safe — combine SyncToken with
request-id for safe retries).
Source: http://help.developer.intuit.com/s/article/QuickBooks-Online-API-Best-Practices (official) ;
https://www.scalekit.com/blog/quickbooks-mcp-vs-api (SyncToken optimistic locking per write)

## EFFECTS
Writes post financial facts: invoices create receivables, payments apply to
invoices (reversing a payment un-applies and restores the invoice balance),
refunds create RefundReceipts, void/delete changes balances. Deletes of payments
trigger balance restoration. Reads/query/reports/CDC are side-effect-free.
Sources: https://github.com/valentinospada/quickbooks-invoice-sync/blob/HEAD/README.md
(two-way sync semantics: delete/void reversal behavior, refund sync, idempotency
via SyncEvent.dedupeKey, timeout-recovery pattern — probe before re-write)

## REVERSIBILITY
Invoices: voidable (before payment) or deletable; payments: deletable/voidable
with balance restoration; RefundReceipts reversible on delete/void. Corrections
after close generally require new correcting transactions, not edits. 90-day
window applies to recycle of deleted records in some UIs; API-visible entities
carry full audit trails. Nothing here is a true rollback — all reversal is via
compensating financial transactions, which is the accounting-correct pattern.
Source: same as EFFECTS.

## PROVENANCE
Every entity carries MetaData (CreateTime, LastUpdatedTime, CreatedByRef,
LastModifiedByRef), SyncToken revision chain, and the entity's Id. Webhooks carry
entity name + operation + realm + event time. CDC responses include the change
set for diffing. Audit trail is first-class: sufficient for SOURCE ->
OBSERVATION -> EVIDENCE lineage with per-entity revision history.
Sources: OBJECTS citations.
