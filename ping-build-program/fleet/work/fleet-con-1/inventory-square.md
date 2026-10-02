# Connector intel — Inventory domain (reference platform: Square)

Mapped from public docs; implementation stays data-driven. Provider: Square.
Base: https://connect.squareup.com/v2 ; Inventory + Catalog APIs.

## OBJECTS
InventoryChange (types: PHYSICAL_COUNT, ADJUSTMENT, TRANSFER; with quantity,
location, occurred_at, source application), InventoryCount (current calculated
count per catalog object per location), CatalogObject (ITEM, ITEM_VARIATION,
CATEGORY, TAX, MODIFIER_LIST...; variations carry inventoryable flags),
InventoryAdjustmentGroup, custom adjustment reasons. Counts are DERIVED from
the change ledger, not stored facts — the ledger is the source of truth.
Sources: https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md ;
https://learn.microsoft.com/en-us/connectors/squarepaymentsip/

## EVENTS
Webhooks v2: inventory.count.updated (v1 inventory webhooks deprecated).
Payloads are change hints: re-fetch via batchRetrieveInventoryChanges/Counts.
Polling fallback: batchRetrieveInventoryChanges with filter criteria
(location, catalog object, occurred-at window) + cursor pagination. Event
coverage is narrower than orders/payments: verify the current event catalog at
build time.
Sources: https://developer.squareup.com/docs/changelog/connect-logs/2020-05-28 ;
https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md

## CAPABILITIES
batchChangeInventory (applies adjustments + physical counts; returns current
calculated counts for all referenced objects), batchRetrieveInventoryChanges
(historical ledger), batchRetrieveInventoryCounts (current per location),
create/delete custom adjustment reasons, Catalog batch upsert/retrieve/delete
for items and variations. Physical counts SET the count; adjustments DELTA it:
semantically different, must not be confused.
Sources: https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md ;
https://learn.microsoft.com/en-us/connectors/squarepaymentsip/

## AUTHORIZATION
OAuth 2.0 with INVENTORY_READ/INVENTORY_WRITE (+ CATALOG scopes for item
management), per-location data partitioning. Personal access tokens for
single-seller dev. Request smallest scope (standing rule 1). Inventory writes
affect sellability across every channel: treat write scopes as sensitive.
Sources: https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md

## WEBHOOKS
inventory.count.updated via v2 webhooks (v1 deprecated). Verify signatures per
current Square docs (verify mechanism at build time). Dedupe by event_id; ack
fast; reconcile against batchRetrieveInventoryChanges (the ledger, not the
cached count). Coverage narrower than commerce events: polling remains a
first-class pattern here.
Sources: https://developer.squareup.com/docs/changelog/connect-logs/2020-05-28

## POLLING
batchRetrieveInventoryChanges with occurred-at windows + cursor pagination is
the primary sync primitive (ledger replay); batchRetrieveInventoryCounts for
point-in-time snapshots per location. Watermark = occurred_at cursor over the
change ledger. Polling cadence modest; dynamic rate limiting punishes
aggression. Reconcile counts from the ledger, never trust a cached number.
Sources: https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md

## RATE LIMITS
Dynamic rate limiting: varies by endpoint and current API load; no fixed
published numbers. 429 Too Many Requests: back off (exponential backoff with
jitter recommended; one production connector uses 30s constant backoff).
Treat every 429 as binding; batch changes instead of per-item calls; prefer
webhooks + ledger replay over count polling.
Sources: https://github.com/teradata/airbyte/blob/HEAD/docs/integrations/sources/square.md

## IDEMPOTENCY
NEEDS-FOLLOWUP at build time: batchChangeInventory idempotency-key support not
confirmed in retrieved docs. Safe client pattern regardless: physical counts
are naturally idempotent (re-asserting the same count is a no-op semantically);
ADJUSTMENTs are NOT idempotent (re-applying double-counts): guard adjustments
with ledger pre-reads (check whether the change already exists for the
occurred_at window) and unique client references where the API accepts them.
Webhook handlers dedupe by event_id.
Sources: CAPABILITIES citations; flagged as verify-at-build.

## EFFECTS
Inventory writes change what can be sold everywhere: wrong counts cause
overselling (sell what is not there) or underselling (hide what is there).
Adjustments flow into order fulfillment and POS sellability in real time.
Physical counts reset truth (dangerous if the count is wrong). Reads
side-effect-free. Connector contract: adjustment writes behind policy +
approval; physical counts only from trusted sources.

## REVERSIBILITY
The change LEDGER is append-only: mistakes are corrected by compensating
changes (new adjustment or recount), never by editing history. Counts are
recomputable from the ledger at any time (replay = recovery). Catalog deletes
via batchDeleteCatalogObjects (verify restore behavior at build). Model:
correct-forward through the ledger, never rewrite.

## PROVENANCE
The ledger IS the provenance: every InventoryChange carries type, quantity,
location_id, catalog_object_id, occurred_at, source application, and actor
context. batchRetrieveInventoryChanges replays full history per object/
location. Counts are derived and traceable to their change sequence. Custom
adjustment reasons encode the business cause. Strongest provenance story in
the commerce group: nothing is overwritten, only appended.
Sources: https://github.com/mvanhorn/printing-press-library/blob/HEAD/cli-skills/pp-square/SKILL.md ;
https://learn.microsoft.com/en-us/connectors/squarepaymentsip/
