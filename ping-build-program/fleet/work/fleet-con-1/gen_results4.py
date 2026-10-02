import json, os

OUT = os.path.expanduser("~/workspace/ping-build-program/fleet/results/connector")
W = "~/workspace/ping-build-program/fleet/work/fleet-con-1"

note = {
  "advertising": ("Meta Marketing API", W+"/ads-meta.md", "https://developers.facebook.com/docs/marketing-apis/"),
  "analytics": ("Google Analytics 4", W+"/analytics-ga4.md", "https://developers.google.com/analytics/devguides/reporting/data/v1/quotas"),
  "pos": ("Square", W+"/pos-square.md", "https://developer.squareup.com/reference/square"),
  "ecommerce": ("Shopify", W+"/ecommerce-shopify.md", "https://shopify.dev/docs/api/admin-graphql"),
  "inventory": ("Square Inventory", W+"/inventory-square.md", "https://developer.squareup.com/reference/square/inventory-api"),
  "field-service": ("Jobber", W+"/fieldservice-jobber.md", "https://developer.jobber.com/"),
}

M = {}
def s(mid, dom, aspect, verdict, conf, followup, text):
    M[mid] = (dom, aspect, verdict, conf, followup, text)

s("CON-0151","advertising","idempotency","NEEDS-FOLLOWUP",0.6,"Verify current Meta idempotency guidance at build time.",
 "No native idempotency-key on campaign/ad creation in retrieved docs. Client-side: name-based pre-checks (list campaigns/adsets by name before create), record returned ids, reconcile on timeout before re-POST. Batch API executes sub-requests in order with per-op results: use dependent references instead of separate calls to avoid partial creation.")
s("CON-0152","advertising","effects","PROVEN",0.9,None,
 "Writes spend REAL MONEY: campaigns deliver and charge the ad account; audiences target real people; automated rules pause/adjust budgets on their own; lead forms collect PII. A misconfigured campaign can burn budget in minutes. Reads (insights, delivery estimates) side-effect-free. All spend-bearing writes behind explicit policy + human approval (T lane), with client-side budget caps.")
s("CON-0153","advertising","reversibility","NEEDS-FOLLOWUP",0.65,"Verify object-restore availability in current Meta docs at build time.",
 "Campaigns/ad sets/ads can be paused or deleted: delivery stops, but SPEND IS NOT RECOVERABLE. Deleted objects generally not restorable (recreate from recorded spec). Audience changes reversible by editing targeting. Lead data collected cannot be un-collected. Model: delivery is stoppable, money is sunk.")
s("CON-0154","advertising","provenance","PROVEN",0.9,None,
 "Global ids for account/campaign/adset/ad/creative; effective_status + configured_status; Insights time series (spend, impressions, actions) as the financial audit trail; activity audit logs (who changed what, when); ad creative object_story linkage (dark posts accumulate engagement on one post id); lead ids with form + campaign attribution. Strong money-movement lineage.")
s("CON-0155","analytics","objects","PROVEN",0.9,None,
 "GA4 Data API: report rows keyed by dimensions (date, country, deviceCategory, pagePath...) x metrics (activeUsers, sessions, screenPageViews...); metadata via getMetadata; per-request caps: max 9 dimensions, 10 metrics, 4 date ranges. Admin API: Accounts, Properties (properties/{id}), DataStreams, CustomDimensions/Metrics, Audiences, Conversion events. Report identity = property id + query spec + date range (no stable row ids: reports are computed).")
s("CON-0156","analytics","events","PROVEN",0.9,None,
 "NO native webhooks or push for GA4 Data API: change detection is poll-only (scheduled runReport/batchRunReports windows; runRealtimeReport for last 30 min, a subset of processed data). Data latency: most data within 24h; full processing (attribution, session stitching, conversions) up to 48h: query dates at least 48h in the past for stable numbers.")
s("CON-0157","analytics","capabilities","PROVEN",0.9,None,
 "runReport, runPivotReport, batchRunReports/batchRunPivotReports, runRealtimeReport, runFunnelReport (v1alpha), getMetadata, checkCompatibility, createAudienceExports, runAccessReport. Admin API: property/account/data-stream/audience/conversion management. NO write path for analytics data itself: Data API is read-only. Sampling, privacy thresholding, high-cardinality '(other)' aggregation apply to large queries.")
s("CON-0158","analytics","authorization","PROVEN",0.85,None,
 "OAuth 2.0 with analytics.readonly (sensitive scope) for reporting; Admin API needs broader scopes. Service accounts supported directly: add the service-account email as a property viewer (preferred over token vault for reporting-only workloads). Property creation requires Administrator on the GA account. Request smallest scope (standing rule 1).")
s("CON-0159","analytics","webhooks","N-A",0.95,None,
 "N-A BY PROVIDER DESIGN: GA4 exposes no webhooks/push for reports. All change detection is scheduled polling (runReport windows, realtime report for recent activity). Do not design around push; design idempotent windowed pulls.")
s("CON-0160","analytics","polling","PROVEN",0.9,None,
 "Scheduled windowed pulls: runReport with explicit dateRanges (e.g. 7daysAgo to 2daysAgo for stable processed data), limit/offset pagination (this surface does NOT use pageToken; that is the Admin API pattern), returnPropertyQuota=true to read budget. Incremental pattern: watermark = last fully-processed date, not row cursors (rows are computed). Historical data immutable once processed: no tombstones.")
s("CON-0161","analytics","rate-limits","PROVEN",0.95,None,
 "Official quota table (Core, standard property): 200,000 tokens/day/property, 40,000 tokens/hour/property, 14,000 tokens/project/property/hour, 10 concurrent requests/property, 10 server errors/project/property/hour (Analytics 360: 2,000,000 / 400,000 / 140,000 / 50 / 50). Tokens charged by query complexity, not row count. 429 = RESOURCE_EXHAUSTED: back off and re-read budget. CRITICAL: 500/503 retries count against the server-errors quota: cap retries (unbounded retry locks the property out). Branch on error.status, never error.message.")
s("CON-0162","analytics","idempotency","N-A",0.95,None,
 "N-A BY PROVIDER DESIGN for the Data API: read-only, so retries are safe (no idempotency needed). Admin API has no idempotency key at all: do not carry the read-only retry assumption into Admin writes; guard with read-before-write checks.")
s("CON-0163","analytics","effects","PROVEN",0.85,None,
 "Data API read-only: side-effect-free. Admin API writes (create property, audiences, conversions) alter GA configuration: no money movement, no external human impact, but misconfiguration corrupts measurement. Quota burn is the main operational cost of polling.")
s("CON-0164","analytics","reversibility","PROVEN",0.85,None,
 "Reports are computed views: nothing to reverse. Admin config changes (audiences, custom dimensions, conversions) editable/deletable via Admin API. Historical analytics data cannot be rewritten through the API (immutability is the provider's design).")
s("CON-0165","analytics","provenance","PROVEN",0.85,None,
 "propertyQuota block in responses (consumed/remaining per day/hour/concurrent) gives quota lineage; report requests fully specified by (property id, dimensions, metrics, date ranges, filters): re-runnable and deterministic modulo processing latency and sampling. getMetadata versions the schema. No row-level ids: lineage at the query level. Record sampling/thresholding flags alongside any persisted number.")
s("CON-0166","pos","objects","PROVEN",0.9,None,
 "Square: Orders (id, location_id, line_items, taxes, discounts, fulfillments, version optimistic-lock counter, state OPEN/COMPLETED/CANCELED), Payments (id, order_id, amount_money, status APPROVED/COMPLETED/CANCELED/FAILED, receipt_url), Refunds, Terminal checkouts/devices, Customers, Catalog, Locations, Employees, Disputes. Payment identity: payment id + client-supplied idempotency_key.")
s("CON-0167","pos","events","PROVEN",0.9,None,
 "Webhooks v2 (GA): payment.created/updated, order.created/updated, refund.created/updated, terminal.checkout.updated, inventory.count.updated. For OAuth-connected sellers, events fire on the SaaS account endpoint + webhook logs. Scope gaps cause SILENT non-delivery (payment webhooks need PAYMENTS_READ): monitor webhook logs. Polling fallback: SearchOrders (location-partitioned, 1,000/page), ListPayments with cursors.")
s("CON-0168","pos","capabilities","PROVEN",0.9,None,
 "Orders: create/search/batch-retrieve/versioned-update/pay. Payments: createPayment (card on file/nonce), cancel/complete, refunds (full/partial), list/get. Terminal API for in-person checkouts. Customers CRUD, gift cards, loyalty. Disputes: accept returns funds to cardholder (debits seller, then bank). Invoices via API with payment links.")
s("CON-0169","pos","authorization","PROVEN",0.9,None,
 "OAuth 2.0 with granular scopes: PAYMENTS_READ/WRITE, ORDERS_READ/WRITE, INVENTORY_READ/WRITE, CUSTOMERS_READ/WRITE, MERCHANT_PROFILE_READ. Scope gaps cause silent feature loss (webhooks need matching read scopes). Personal access tokens for single-seller dev. Request smallest scope; money-moving scopes are the most sensitive in this provider.")
s("CON-0170","pos","webhooks","PROVEN",0.85,"Verify current Square webhook signature mechanism at build time.",
 "v2 webhooks (v1 deprecated): HTTPS endpoints, per-surface event types, delivered for all OAuth-connected sellers. Verify signatures per Square docs. Dedupe by event_id; ack fast; reconcile via SearchOrders/ListPayments. Scope misconfiguration yields silent non-delivery: monitor developer-dashboard webhook logs.")
s("CON-0171","pos","polling","PROVEN",0.85,None,
 "SearchOrders (location-partitioned, page size 1,000) for backfill; ListPayments with cursor pagination; batchRetrieveOrders for targeted fetches. Orders stream is the reconciliation backstop behind payment/order webhooks. Polling cadence modest; dynamic rate limiting punishes aggressive polling.")
s("CON-0172","pos","rate-limits","PROVEN",0.8,None,
 "Dynamic rate limiting: varies by endpoint and current API load; no fixed published numbers. 429 Too Many Requests: back off (exponential backoff with jitter recommended). Treat every 429 as binding; keep polling modest and prefer webhooks.")
s("CON-0173","pos","idempotency","PROVEN",0.9,None,
 "NATIVE: createPayment (and most mutating endpoints) accept client-supplied idempotency_key: Square guarantees at-most-once execution per key; reuse the same key across retries. cancelPaymentByIdempotencyKey exists. Orders use the version field for optimistic locking (updateOrder requires current version: prevents lost updates). Webhook handlers dedupe by event_id. Strongest retry contract among the commerce providers mapped.")
s("CON-0174","pos","effects","PROVEN",0.9,None,
 "createPayment CHARGES real cards (money movement); payOrder settles orders; refunds return money; disputes/accept moves funds to the cardholder (debits seller, then their bank). Terminal checkouts initiate in-person charges. Reads side-effect-free. Every money-moving call behind explicit policy + human approval (T lane).")
s("CON-0175","pos","reversibility","PROVEN",0.85,None,
 "Payments cannot be un-charged: reversal is via refundPayment (full/partial: a new money movement with its own settlement timing) or void before capture (cancelPayment). Dispute accept is final (funds gone). Orders cancellable while OPEN. Model payments as append-only financial facts with compensating refunds, never as reversible writes.")
s("CON-0176","pos","provenance","PROVEN",0.9,None,
 "Payment id + idempotency_key (client lineage), order_id linkage, version counter on orders (optimistic-lock history), status timelines via payment.created/updated webhooks, receipt_url, card fingerprints (not raw PANs), location_id (where money moved), refunds linked to original payment id, disputes with state transitions. Full money-movement lineage.")
s("CON-0177","ecommerce","objects","PROVEN",0.9,None,
 "Shopify: Products (+ variants, images, options), Orders (financial/fulfillment status, line items, transactions, refunds), Customers, DraftOrders, Fulfillments, InventoryLevels/InventoryItems, Locations, Discounts, Metafields/Metaobjects, Shop, WebhookSubscriptions. Order identity: numeric id + name (#1001); GraphQL global GIDs. read_orders returns only last 60 days; read_all_orders separate + approval.")
s("CON-0178","ecommerce","events","PROVEN",0.9,None,
 "Webhooks are the primary event surface: orders/create, orders/updated, products/update, inventory_levels/update, customers/create, refunds/create, fulfillments/create... Register only what you need. Respond 2xx within 5 seconds or Shopify retries with exponential backoff up to 48 hours, then disables the subscription. Every handler idempotent: retries/duplicates are normal operation. Bulk operations API for large backfills (async -> poll -> JSONL).")
s("CON-0179","ecommerce","capabilities","PROVEN",0.9,None,
 "GraphQL Admin API for new work (new features ship here first). Mutations: productCreate/Update, draft-order orderCreate, fulfillmentOrder workflows, inventoryAdjustQuantities, discount codes, metafield writes, customer updates. Bulk operations for large reads/writes (async, budget-friendly). Storefront API is customer-facing (separate surface). Shopify Functions extend checkout without rebuilding it.")
s("CON-0180","ecommerce","authorization","PROVEN",0.9,None,
 "OAuth 2.0 authorization code flow: merchant approves comma-separated scopes (read_products, write_orders...); app gets a permanent offline access token sent as X-Shopify-Access-Token. Never share store admin credentials: OAuth is the only legitimate pattern. Webhook signing: app client secret (API-created subs) vs store-level secret in Settings > Notifications (hand-created subs): different values.")
s("CON-0181","ecommerce","webhooks","PROVEN",0.9,None,
 "Verify HMAC on EVERY request: X-Shopify-Hmac-SHA256 = HMAC-SHA256(base64) over the RAW unparsed body with the correct secret; timing-safe comparison (length-check first). Respond 200 fast, process async (queue). Retries on timeout -> duplicates normal: handlers idempotent by topic+id. Do not poll what webhooks cover: polling is how you hit rate limits.")
s("CON-0182","ecommerce","polling","PROVEN",0.85,None,
 "GraphQL cursor pagination (first/after) for incremental reads; bulk operations for anything over a few hundred records (submit query, poll completion, download JSONL: async, budget-friendly). Inventory levels and order lists are the main poll surfaces behind webhooks. Shopify is the single source of truth for inventory: never maintain a separately-synced count (overselling bug class).")
s("CON-0183","ecommerce","rate-limits","PROVEN",0.9,None,
 "Two systems. REST (legacy): leaky bucket, 40 requests with 2/sec leak standard (80/4 Plus); X-Shopify-Shop-Api-Call-Limit header. GraphQL: cost-based, 1,000-point bucket, restore 50/sec (plan-scaled); scalars/enums 0 pts, objects 1 pt, connections sized by first/last, mutations 10 pts default; HARD CEILING: no single query may exceed 1,000 points. Response extensions.cost carries throttleStatus + actualQueryCost: back off before zero. Nested connections multiply cost. THROTTLED: exponential backoff, fewer fields, never tight-loop retry.")
s("CON-0184","ecommerce","idempotency","NEEDS-FOLLOWUP",0.65,"Verify current Shopify idempotency guidance at build time.",
 "No native idempotency-key on Admin mutations in retrieved docs. Webhook handlers idempotent by (topic, resource id). Mutation retry-safety client-side: read-before-write, record returned ids, reconcile on timeout; check userErrors in mutation payloads (validation failures separate from top-level errors; GraphQL returns HTTP 200 on errors: always inspect the errors key). Bulk operations give async, checkable execution.")
s("CON-0185","ecommerce","effects","PROVEN",0.85,None,
 "Writes are merchant-visible and customer-impacting: product/order/price changes, fulfillments (trigger shipping + customer emails), discount codes, inventory adjustments (overselling risk), refunds (money movement). Reads side-effect-free. Bulk operations scale every effect. Fulfillment/refund/price writes behind explicit policy + approval.")
s("CON-0186","ecommerce","reversibility","NEEDS-FOLLOWUP",0.6,"Verify delete/trash restore windows in current Shopify docs at build time.",
 "Most writes correctable but not atomic-undoable: products/orders editable; shipped fulfillments cannot be un-shipped (return flow instead); refunds are new money movements; inventory adjustments correctable by counter-adjustment (history preserved). No universal undelete: model as correct-forward, not rollback.")
s("CON-0187","ecommerce","provenance","PROVEN",0.85,None,
 "Order/product/customer ids (numeric + GraphQL GID), created/updated timestamps, order name (#1001) for human lineage, fulfillment event history, inventory adjustment ledger (who/when/reason), refund transactions linked to orders, webhook topic+id for event lineage, bulk-operation ids for async jobs. Strong commercial lineage.")
s("CON-0188","inventory","objects","PROVEN",0.9,None,
 "Square: InventoryChange (PHYSICAL_COUNT, ADJUSTMENT, TRANSFER; quantity, location, occurred_at, source application), InventoryCount (current calculated count per catalog object per location), CatalogObject (ITEM, ITEM_VARIATION, CATEGORY, TAX...), InventoryAdjustmentGroup, custom adjustment reasons. Counts are DERIVED from the change ledger: the ledger is the source of truth.")
s("CON-0189","inventory","events","PROVEN",0.8,"Verify the current Square event catalog at build time.",
 "Webhooks v2: inventory.count.updated (v1 inventory webhooks deprecated). Payloads are change hints: re-fetch via batchRetrieveInventoryChanges/Counts. Polling fallback: batchRetrieveInventoryChanges with filter criteria (location, catalog object, occurred-at window) + cursor pagination. Event coverage narrower than orders/payments.")
s("CON-0190","inventory","capabilities","PROVEN",0.9,None,
 "batchChangeInventory (adjustments + physical counts; returns current calculated counts), batchRetrieveInventoryChanges (historical ledger), batchRetrieveInventoryCounts (current per location), create/delete custom adjustment reasons, Catalog batch upsert/retrieve/delete. Physical counts SET the count; adjustments DELTA it: semantically different, must not be confused.")
s("CON-0191","inventory","authorization","PROVEN",0.85,None,
 "OAuth 2.0 with INVENTORY_READ/INVENTORY_WRITE (+ CATALOG scopes for item management), per-location data partitioning. Personal access tokens for single-seller dev. Request smallest scope (standing rule 1). Inventory writes affect sellability across every channel: treat write scopes as sensitive.")
s("CON-0192","inventory","webhooks","PROVEN",0.8,"Verify current Square webhook signature mechanism at build time.",
 "inventory.count.updated via v2 webhooks (v1 deprecated). Verify signatures per current docs. Dedupe by event_id; ack fast; reconcile against batchRetrieveInventoryChanges (the ledger, not the cached count). Coverage narrower than commerce events: polling remains first-class here.")
s("CON-0193","inventory","polling","PROVEN",0.85,None,
 "batchRetrieveInventoryChanges with occurred-at windows + cursor pagination is the primary sync primitive (ledger replay); batchRetrieveInventoryCounts for point-in-time snapshots per location. Watermark = occurred_at cursor over the change ledger. Polling cadence modest; dynamic rate limiting punishes aggression. Reconcile counts from the ledger, never trust a cached number.")
s("CON-0194","inventory","rate-limits","PROVEN",0.8,None,
 "Dynamic rate limiting: varies by endpoint and current API load; no fixed published numbers. 429: back off (exponential backoff with jitter recommended). Treat every 429 as binding; batch changes instead of per-item calls; prefer webhooks + ledger replay over count polling.")
s("CON-0195","inventory","idempotency","NEEDS-FOLLOWUP",0.6,"Verify batchChangeInventory idempotency-key support in current Square docs at build time.",
 "Idempotency-key support on batchChangeInventory NOT confirmed in retrieved docs. Safe client pattern: physical counts are naturally idempotent (re-asserting the same count is a no-op); ADJUSTMENTs are NOT (re-applying double-counts): guard adjustments with ledger pre-reads (check whether the change already exists for the occurred_at window) and unique client references where accepted. Webhook handlers dedupe by event_id.")
s("CON-0196","inventory","effects","PROVEN",0.85,None,
 "Inventory writes change what can be sold everywhere: wrong counts cause overselling or underselling. Adjustments flow into order fulfillment and POS sellability in real time. Physical counts reset truth (dangerous if wrong). Reads side-effect-free. Adjustment writes behind policy + approval; physical counts only from trusted sources.")
s("CON-0197","inventory","reversibility","PROVEN",0.85,None,
 "The change LEDGER is append-only: mistakes corrected by compensating changes (new adjustment or recount), never by editing history. Counts recomputable from the ledger at any time (replay = recovery). Catalog deletes via batchDeleteCatalogObjects (verify restore behavior at build). Model: correct-forward through the ledger, never rewrite.")
s("CON-0198","inventory","provenance","PROVEN",0.9,None,
 "The ledger IS the provenance: every InventoryChange carries type, quantity, location_id, catalog_object_id, occurred_at, source application, actor context. batchRetrieveInventoryChanges replays full history per object/location. Counts derived and traceable to their change sequence. Custom adjustment reasons encode the business cause. Strongest provenance story in the commerce group: nothing overwritten, only appended.")
s("CON-0199","field-service","objects","PROVEN",0.85,None,
 "Jobber GraphQL: Clients (phones[] free-form, emails[]), Properties (service addresses), Jobs (title, jobType ONE_OFF, lineItems {name, quantity, unitCost}, total, client linkage), Visits (startAt/endAt, title, assignedUserIds, completion), Invoices (status PAID/SENT), Payments (amount, paymentDate), Quotes, Users, Products/Services catalog. IDs are global base64 gids. Version via X-JOBBER-GRAPHQL-VERSION header.")
s("CON-0200","field-service","events","PROVEN",0.85,None,
 "Webhooks: subscribe with topics (CLIENT_CREATE/UPDATE, JOB_UPDATE, INVOICE_UPDATE/PAID, VISIT_COMPLETE/UPDATE). Payload {data:{webHookEvent:{topic, appId, accountId, itemId, occurredAt}}}. At-least-once: retries on non-200; always return 200 (silent 200 for unknown tenants prevents retry storms). Handler: HMAC-verify (x-jobber-hmac-sha256 = base64 HMAC-SHA256(raw body, client_secret)), resolve itemId -> client -> phones, act. Polling fallback: GraphQL connections with first/after cursors + filters.")

n=0
for mid,(dom,aspect,verdict,conf,fol,text) in sorted(M.items()):
    prov, notefile, keyurl = note[dom]
    rec = {"mission_id":mid,"verdict":verdict,
           "summary":f"[{prov}] {aspect}: "+text,
           "evidence_files":[notefile,keyurl],
           "confidence":conf,"followup":fol}
    json.dump(rec, open(f"{OUT}/{mid}.json","w"), indent=2)
    n+=1
print("wrote",n)
