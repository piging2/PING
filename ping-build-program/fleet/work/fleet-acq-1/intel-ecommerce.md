# Connector intel - ecommerce domain (reference platform: Shopify)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Products, Variants, Orders (financial_fulfillment_status), Customers, DraftOrders, Inventory levels, Fulfillments, Refunds, Discounts. Admin REST at /admin/api/{version}/ plus GraphQL. Order risk, metafields for custom data.
Sources: https://shopify.dev/docs/api ; https://shopify.dev/docs/api/admin-rest

## EVENTS
Shopify webhooks: orders/create, orders/updated, products/update, inventory_levels/update, fulfillments/create, refunds/create, customers/create. EventBridge / PubSub delivery options.
Sources: https://shopify.dev/docs/api/webhooks

## CAPABILITIES
Product/order/customer CRUD, draft orders, fulfillments, refunds, discounts, inventory adjustment, storefront via Storefront API, checkout via Checkout API.
Sources: https://shopify.dev/docs/api

## AUTHORIZATION
OAuth 2.0 with granular access scopes (read_products, write_orders). Custom apps get Admin API tokens. Webhook HMAC with client secret.
Sources: https://shopify.dev/docs/api/authentication

## WEBHOOKS
HTTPS endpoints subscribed per topic. X-Shopify-Hmac-Sha256 header validation (HMAC-SHA256 of raw body with client secret). Retries with backoff on failure.
Sources: https://shopify.dev/docs/api/webhooks

## POLLING
REST with since_id / updated_at_min filters and cursor pagination. GraphQL bulk operations for large exports. Track last sync timestamp client-side.
Sources: https://shopify.dev/docs/api/usage

## RATE-LIMITS
Leaky-bucket rate limits (REST: 2 req/sec with 40 bucket; GraphQL: cost-based points). 429 with Retry-After. Verify current values in the docs.
Sources: https://shopify.dev/docs/api/usage/rate-limits

## IDEMPOTENCY
No idempotency-key on most writes. Draft orders give safe composition before completion. Check-before-create by SKU/handle; orders naturally unique per checkout.
Sources: https://shopify.dev/docs/api

## EFFECTS
Creating orders/discounts/refunds (money movement), inventory adjustments, product publishing, customer creation. Reads are side-effect-free.
Sources: https://shopify.dev/docs/api

## REVERSIBILITY
Orders cancellable; refunds reversible only by new charges; inventory adjustments are audited, not undone; deleted products restorable from trash briefly.
Sources: https://shopify.dev/docs/api/admin-rest

## PROVENANCE
IDs stable per object; admin_graphql_api_id gives global identity; updated_at versions changes; webhook payloads carry shop domain + topic + timestamps.
Sources: https://shopify.dev/docs/api/webhooks

