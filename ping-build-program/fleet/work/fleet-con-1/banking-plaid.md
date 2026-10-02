# Connector intel — Banking domain (reference platform: Plaid API)

Mapped from public docs; implementation stays data-driven. Provider: Plaid
(read-only banking data aggregator — NO write capability by design).
Base: https://production.plaid.com (sandbox: https://sandbox.plaid.com,
development: https://development.plaid.com).

## OBJECTS
Core resources: Item (a connected bank login — the sync unit), Account
(checking/savings/credit/loan/investment with balances, mask, subtype),
Transaction (merchant, amount, date, pending/posted, personal_finance_category
taxonomy, location), Identity (account holder names/addresses), Liabilities
(credit/loan/mortgage/student), Holdings/Securities (investments), Institution
(bank metadata). All reads are POST endpoints with access_token in the body.
Sources: https://github.com/tmhsdigital/plaid-developer-tools/blob/HEAD/skills/plaid-api-reference/SKILL.md ;
https://github.com/ashish7802/awesome-api-skills/blob/HEAD/skills/plaid/SKILL.md ;
https://github.com/zacharyr0th/next-starter/blob/HEAD/.claude/agents/docs/plaid-expert-ref.md

## EVENTS
Webhook types (webhook_type + webhook_code in POST body): TRANSACTIONS —
SYNC_UPDATES_AVAILABLE, INITIAL_UPDATE, HISTORICAL_UPDATE, DEFAULT_UPDATE,
TRANSACTIONS_REMOVED; ITEM — ERROR (ITEM_LOGIN_REQUIRED, ITEM_LOCKED),
PENDING_EXPIRATION, USER_PERMISSION_REVOKED, WEBHOOK_UPDATE_ACKNOWLEDGED; plus
AUTH, IDENTITY, HOLDINGS, INVESTMENTS types. Webhooks are notifications only
(webhook delivery NOT guaranteed — always pair with periodic sync); the actual
data comes from /transactions/sync. Verify via HMAC-SHA256 with the webhook
verification key from /webhook_verification_key/get.
Sources: https://github.com/liberusoftware/accounting-laravel/blob/HEAD/docs/PLAID_INTEGRATION.md ;
https://github.com/lifekit-hq/finance-sentry/blob/HEAD/specs/001-bank-account-sync/research.md
("Webhooks are not guaranteed delivery; always implement periodic sync as reconciliation layer")

## CAPABILITIES
Read-only by design: /link/token/create (initiate connect), public->access token
exchange, /transactions/sync (cursor-based incremental; use exclusively, not
legacy /transactions/get), /accounts/get, /accounts/balance/get (live balance
query), /identity/get, /liabilities/get, /investments/holdings/get,
/institutions/search, /item/remove (disconnect — the one destructive op).
No money movement, no profile writes. This makes Plaid the SAFEST connector
family for the contract test kit: effects and reversibility are N-A by provider
design, not by missing docs.
Sources: https://github.com/tmhsdigital/plaid-developer-tools/blob/HEAD/skills/plaid-api-reference/SKILL.md ;
https://github.com/ashish7802/awesome-api-skills/blob/HEAD/skills/plaid/SKILL.md

## AUTHORIZATION
Three credentials, three tiers: (1) client credentials — PLAID-CLIENT-ID +
PLAID-SECRET headers (for /link/token/create, /institutions/search, /sandbox/*);
(2) access token — permanent per-Item token in request body (for data endpoints;
treat like a password, encrypt at rest); (3) webhook verification — JWK from
/webhook_verification_key/get for inbound webhook validation. Connect flow:
server creates link token (short-lived) -> user completes Plaid Link UI
(client) -> public token returned -> server exchanges for access token.
Secrets must never reach the client (standing rule 1).
Sources: https://github.com/tmhsdigital/plaid-developer-tools/blob/HEAD/skills/plaid-api-reference/SKILL.md ;
https://github.com/ashish7802/awesome-api-skills/blob/HEAD/skills/plaid/SKILL.md

## WEBHOOKS
Webhook endpoint receives {webhook_type, webhook_code, item_id, error?}.
TRANSACTIONS/SYNC_UPDATES_AVAILABLE -> run /transactions/sync for that item.
ITEM/ERROR with ITEM_LOGIN_REQUIRED -> mark item requires_reauth (user must
re-run Link in update mode). Webhooks may arrive out of order; dedupe + order
tolerance required. HTTPS endpoint with HMAC-SHA256 signature verification.
Source: https://github.com/liberusoftware/accounting-laravel/blob/HEAD/docs/PLAID_INTEGRATION.md ;
https://github.com/doublegate/subpilot-app (to-dos/tech-plaid-integration.md via search result:
webhook handler checklist — verify signatures, idempotency, retry logic)

## POLLING
/transactions/sync with cursor: request {access_token, cursor, count};
response {added[], modified[], removed[], next_cursor, has_more}. Persist cursor
after each successful sync; paginate while has_more. Initial sync can cover up
to 24 months of history; institutions refresh 1-4x/day. Polling is supported but
webhooks-first is the documented guidance (transactions endpoints are heavily
rate-limited to protect banking infrastructure). Recommended production pattern:
webhooks trigger sync + periodic (e.g. daily) reconciliation sync as fallback.
Sources: https://github.com/tmhsdigital/plaid-developer-tools/blob/HEAD/skills/plaid-api-reference/SKILL.md ;
https://github.com/zacharyr0th/next-starter/blob/HEAD/.claude/agents/docs/plaid-expert-ref.md ;
https://github.com/ashish7802/awesome-api-skills/blob/HEAD/skills/plaid/SKILL.md

## RATE LIMITS
Per-endpoint, per-item caps documented in the Plaid developer skill summary:
 /transactions/sync and /transactions/get — 15 requests/min per item;
/transactions/refresh — 2 requests/day per item; /accounts/balance/get —
institution-dependent (live query); most other endpoints no published limit.
Guidance: fetch asynchronously, trigger off webhooks rather than polling,
implement exponential backoff on 429, advisory locks to prevent concurrent
syncs for the same item. Exact published numbers vary by Plaid plan — re-verify
against current Plaid rate-limits docs at implementation time.
Source: https://github.com/tmhsdigital/plaid-developer-tools/blob/HEAD/skills/plaid-api-reference/SKILL.md
(rates table); https://github.com/zacharyr0th/next-starter/blob/HEAD/.claude/agents/docs/plaid-expert-ref.md

## IDEMPOTENCY
Provider has no idempotency-key concept (read-only API; nothing to make safe).
Sync safety comes from the cursor contract: re-requesting with the same cursor
replays the same delta window (added/modified/removed are stable for a given
cursor until advanced). Client-side dedupe by transaction_id + pending tracking
still required because the same transaction can appear in added then modified.
N-A as a provider feature; connector pattern documented.
Source: POLLING citations.

## EFFECTS
N-A BY PROVIDER DESIGN: Plaid exposes read-only banking data. The only
destructive operation is /item/remove (disconnects the Item and invalidates the
access token — affects the connector's own state, not the bank). No money
movement, no record writes at the institution. PING-side writes (storing synced
transactions) are the only effects, owned by PING's own event authority.
Source: CAPABILITIES citations.

## REVERSIBILITY
N-A BY PROVIDER DESIGN: nothing is written to the bank, so there is nothing to
reverse. Item removal is reversed by re-running Plaid Link (new Item, new
access token). Sync-cursor advancement is recoverable by restarting sync from an
earlier cursor (or cursor "now" to skip history).
Source: CAPABILITIES/POLLING citations.

## PROVENANCE
Transactions carry transaction_id (stable), pending_transaction_id linkage,
account_id, date/posted timestamps, pending flag, and Plaid's category
taxonomy; sync responses carry cursors that encode the sync position.
Webhooks carry item_id + event type + timestamps. Removed[] in sync responses
is the tombstone channel. Sufficient for SOURCE -> OBSERVATION -> EVIDENCE
lineage with explicit add/modify/remove semantics — the cleanest provenance
shape of the five domains.
Sources: https://github.com/zacharyr0th/next-starter/blob/HEAD/.claude/agents/docs/plaid-expert-ref.md ;
https://github.com/tmhsdigital/plaid-developer-tools/blob/HEAD/skills/plaid-api-reference/SKILL.md
