# Connector intel - banking domain (reference platform: Plaid)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Item (institution connection), Account (account_id, balances, type), Transaction (transaction_id, pending flag), plus Auth, Identity, Investments, Liabilities products. /transactions/sync returns added/modified/removed with cursors.
Sources: https://development.plaid.com ; https://plaid.com/docs/

## EVENTS
Webhooks: TRANSACTIONS_SYNC_UPDATE (new sync data), DEFAULT_UPDATE, INITIAL_UPDATE, HOLDINGS_UPDATE, plus ITEM_ERROR and per-product events. Payloads carry item_id and environment.
Sources: https://development.plaid.com ; https://plaid.com/docs/

## CAPABILITIES
Link token create, public token exchange, accounts/balances, transactions sync, auth numbers, identity, investments, liabilities. Product-gated: enable per product.
Sources: https://development.plaid.com ; https://plaid.com/docs/

## AUTHORIZATION
Plaid Link (OAuth or credential flow) yields public_token, exchanged server-side for access_token. API calls use client_id + secret (or client assertion) with the access_token.
Sources: https://development.plaid.com ; https://plaid.com/docs/

## WEBHOOKS
HTTPS webhook URL per client; Plaid signs with a verification key (JWT). Respond 200 quickly; Plaid retries failed deliveries. Webhook codes per product documented in the API reference.
Sources: https://development.plaid.com ; https://plaid.com/docs/

## POLLING
transactions/sync with cursor: first call cursor empty, then persist returned cursor; has_more drives pagination. Balances via /accounts/balance/get (realtime pull).
Sources: https://development.plaid.com ; https://plaid.com/docs/

## RATE-LIMITS
Per-endpoint, per-item rate limits published in Plaid docs (e.g. transactions endpoints have tighter caps). Exceeding returns RATE_LIMIT_EXCEEDED. Verify current values in the docs.
Sources: https://development.plaid.com ; https://plaid.com/docs/

## IDEMPOTENCY
transactions/sync cursors make sync idempotent (replay same cursor = same delta). No generic idempotency-key; transaction_id is stable for dedup of added items.
Sources: https://development.plaid.com ; https://plaid.com/docs/

## EFFECTS
Read-only products have no write effects. Transfer (money movement) products create ledger entries with authorization holds; those are the only mutating effects.
Sources: https://development.plaid.com ; https://plaid.com/docs/

## REVERSIBILITY
Data products are read-only: nothing to reverse. Item connections can be removed (/item/remove), revoking the access_token.
Sources: https://development.plaid.com ; https://plaid.com/docs/

## PROVENANCE
account_id and transaction_id are stable; pending flag marks unsettled; transactions/sync removed[] marks deleted. Balances carry as-of timestamps.
Sources: https://development.plaid.com ; https://plaid.com/docs/

