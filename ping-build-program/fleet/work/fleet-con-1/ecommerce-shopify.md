# Connector intel — Ecommerce domain (reference platform: Shopify)

Mapped from public docs; implementation stays data-driven. Provider: Shopify.
Admin API base: https://{shop}.myshopify.com/admin/api/{version}/graphql.json ;
version in config, not code. REST Admin API is legacy/maintenance mode.

## OBJECTS
Products (+ variants, images, options), Orders (financial/fulfillment status,
line items, transactions, refunds), Customers, DraftOrders, Fulfillments,
InventoryLevels/InventoryItems, Locations, Discounts, Metafields/Metaobjects,
Shop, WebhookSubscriptions. Order identity: numeric id + name (#1001);
GraphQL global GIDs. read_orders scope returns only the last 60 days;
read_all_orders is separate and requires approval.
Sources: https://github.com/lope200007/shopify/blob/HEAD/.claude/skills/shopify-development/SKILL.md ;
https://github.com/craigdanielk/claude-starter-pack/blob/HEAD/skills/shopify-app-builder/SKILL.md

## EVENTS
Webhooks are the primary event surface: topics (orders/create, orders/updated,
products/update, inventory_levels/update, customers/create, refunds/create,
fulfillments/create...). Register only what you need. Delivery: HTTPS POST,
signed. Handler must respond 2xx within 5 seconds or Shopify retries with
exponential backoff for up to 48 hours, then disables the subscription.
Design every handler idempotent: retries and duplicate deliveries are normal
operation. Bulk operations API for large backfills (async query -> poll ->
download JSONL), not webhooks.
Sources: https://github.com/craigdanielk/claude-starter-pack/blob/HEAD/skills/shopify-app-builder/SKILL.md ;
https://github.com/0x61a/fullstack-pro-max/blob/HEAD/references/shopify-integration.md

## CAPABILITIES
GraphQL Admin API for new work (new features ship here first; fetch exactly
the fields needed). Mutations: productCreate/Update, orderCreate (draft orders),
fulfillmentOrder workflows, inventoryAdjustQuantities, discount codes,
metafield writes, customer updates. Bulk operations for large reads/writes
(async, budget-friendly). Storefront API is customer-facing (separate surface,
public token). Shopify Functions extend checkout (discounts/shipping) without
rebuilding checkout.
Sources: https://github.com/lope200007/shopify/blob/HEAD/.claude/skills/shopify-development/SKILL.md ;
https://github.com/0x61a/fullstack-pro-max/blob/HEAD/references/shopify-integration.md

## AUTHORIZATION
OAuth 2.0 authorization code flow: merchant approves comma-separated scopes
(read_products, write_orders, read_inventory...); app receives a permanent
offline access token sent as X-Shopify-Access-Token. Never share store admin
credentials with an integration: OAuth is the only legitimate pattern.
Granular scopes; request smallest set (standing rule 1). Webhook signing uses
the app's client secret (API-created subs) or the store-level secret shown in
Settings > Notifications (hand-created subs) — different values.
Sources: https://github.com/igosha/learn-skills.dev/blob/HEAD/data/skills-md/jacob-balslev/skill-graph/shopify/SKILL.md ;
https://github.com/lope200007/shopify/blob/HEAD/.claude/skills/shopify-development/SKILL.md

## WEBHOOKS
Verify HMAC on EVERY request: X-Shopify-Hmac-SHA256 = HMAC-SHA256(base64) over
the RAW unparsed body with the correct secret; use timing-safe comparison
(length-check first). Respond 200 fast, process async (queue). Retries on
timeout -> duplicates are normal: handlers idempotent by topic+id. Do not
poll what webhooks cover: polling is how you hit rate limits.
Sources: https://github.com/lope200007/shopify/blob/HEAD/.claude/skills/shopify-development/SKILL.md ;
https://github.com/craigdanielk/claude-starter-pack/blob/HEAD/skills/shopify-app-builder/SKILL.md

## POLLING
GraphQL cursor pagination (first/after) for incremental reads; REST page-based
where still used. Bulk operations for anything over a few hundred records:
submit query, poll for completion, download JSONL (async, budget-friendly).
Inventory levels and order lists are the main poll surfaces behind webhooks.
Shopify is the single source of truth for inventory: read/write through its
API, never maintain a separately-synced count (overselling bug class).
Sources: https://github.com/craigdanielk/claude-starter-pack/blob/HEAD/skills/shopify-app-builder/SKILL.md ;
https://github.com/0x61a/fullstack-pro-max/blob/HEAD/references/shopify-integration.md

## RATE LIMITS
Two systems. REST (legacy): leaky bucket, 40 requests with 2/sec leak on
standard plans (80/4 on Plus); X-Shopify-Shop-Api-Call-Limit header.
GraphQL: cost-based, NOT request-based: 1,000-point bucket; restore rate
50/sec (plan-scaled: 100/200/1000/2000 pts/sec across plans per one source);
scalars/enums 0 pts, objects 1 pt, connections sized by first/last, mutations
10 pts default; HARD CEILING: no single query may exceed 1,000 points.
Response extensions.cost carries throttleStatus (maximumAvailable,
currentlyAvailable, restoreRate) + actualQueryCost: read currentlyAvailable
and back off before zero. Nested connections multiply cost (orders(first:50) x
lineItems(first:20) ~ 1,050 pts -> rejected). THROTTLED: exponential backoff,
request fewer fields, never tight-loop retry.
Sources: https://github.com/lope200007/shopify/blob/HEAD/.claude/skills/shopify-development/SKILL.md ;
https://github.com/igosha/learn-skills.dev/blob/HEAD/data/skills-md/jacob-balslev/skill-graph/shopify/SKILL.md ;
https://github.com/ricardoviannajr/antigravity-awesome-skills/blob/HEAD/skills/shopify-apps/SKILL.md

## IDEMPOTENCY
No native idempotency-key on Admin mutations in retrieved docs. Webhook
handlers must be idempotent by (topic, resource id) — retries/duplicates are
normal. Mutation retry-safety is client-side: read-before-write (fetch by id/
name), record returned ids, reconcile on timeout; check userErrors in mutation
payloads (validation failures are separate from top-level errors; note GraphQL
returns HTTP 200 on errors — always inspect the errors key). Bulk operations
give async, checkable execution. Followup: verify current Shopify idempotency
guidance at build time.
Sources: https://github.com/craigdanielk/claude-starter-pack/blob/HEAD/skills/shopify-app-builder/SKILL.md ;
https://github.com/0x61a/fullstack-pro-max/blob/HEAD/references/shopify-integration.md

## EFFECTS
Writes are merchant-visible and customer-impacting: product/order/price changes,
fulfillments (trigger shipping + customer emails), discount codes, inventory
adjustments (overselling risk if wrong), refunds (money movement). Reads
side-effect-free. Bulk operations scale every effect. Connector contract:
fulfillment/refund/price writes behind explicit policy + approval.

## REVERSIBILITY
Most writes are correctable but not atomic-undoable: products/orders editable;
fulfillments once shipped cannot be un-shipped (return flow instead); refunds
are new money movements; inventory adjustments correctable by counter-
adjustment (history preserved); deleted products restorable from trash within
the window Shopify provides (verify at build). No universal undelete: model
as correct-forward, not rollback.

## PROVENANCE
Order/product/customer ids (numeric + GraphQL GID), created/updated timestamps,
order name (#1001) for human lineage, fulfillment event history, inventory
adjustment ledger (who/when/reason via InventoryLevel/adjustment records),
refund transactions linked to orders, webhook topic+id for event lineage,
bulk-operation ids for async jobs. Strong commercial lineage.
Sources: https://github.com/lope200007/shopify/blob/HEAD/.claude/skills/shopify-development/SKILL.md ;
https://github.com/igosha/learn-skills.dev/blob/HEAD/data/skills-md/jacob-balslev/skill-graph/shopify/SKILL.md
