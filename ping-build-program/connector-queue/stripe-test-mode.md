# Connector: Stripe (test mode first)

## Why
Business data proof: read payment intents, invoices, customers in TEST mode to prove the ledger math without touching real money.

## Exact credential set (smallest permission set)
| Credential / scope | Why | PKCE | What breaks without it |
|---|---|---|---|
| Restricted secret key (`rk_test_...`), read-only resource scopes: payments read, invoices read, customers read | Read payment intents / invoices / customers in test mode (the demonstrated feature) | n/a (key, not OAuth) | No Stripe reads; connector DISABLED |
| Test mode only | Proves the ledger math without touching real money | n/a | Live mode requires a separate source instance + an elevated grant; never mixed |

No OAuth needed for the key path. OAuth Connect (Stripe's own authorization-code flow) is the alternative for multi-merchant later; PKCE would be yes on that path.

## What Nolan must physically do (Stripe dashboard)
1. Open dashboard.stripe.com, toggle TEST MODE on (explicit, verify the orange "Test mode" banner).
2. Go to Developers -> API keys -> create a RESTRICTED key. Grant read-only on: payments, invoices, customers. Nothing else.
3. Hand the key to the OPERATOR CONSOLE (never chat, never a file, never memory). It goes straight into lane-L broker custody.
4. Verify: the key starts with `rk_test_`. If it starts with `rk_live_`, he made it in the wrong mode: delete it and redo step 1.

## What the agent does after
The operator console feeds the key to `broker.issue()`; the connector reads test-mode payment intents/invoices/customers through the proxy path (ephemeral mode only, zeroed after use). Capability inventory is built from discover(). Nothing in live mode is reachable from this source instance.

## Personal vs dedicated account
Test mode is sandboxed per Stripe account, so a test key on his own Stripe account is safe by construction: it cannot touch live money. The real decision is the future live-mode one: live mode gets its own separate source instance, its own elevated grant, and its own custody record. Personal vs business Stripe account matters at live time; at test time the recommendation is simply: test key on whichever account he already has, test mode verified, live mode explicitly deferred.

## Handle story
Agents get an opaque `cap_` handle. The restricted key lives in broker custody (encrypted at rest, envelope encryption); the Yelp pattern also applies here: keys are entered via the operator console into custody, never through a browser form, never into agent context. See lane-conn16/OAUTH-CONNECT-FLOW.md section 2 and lane-l/SECRET-BROKER-DESIGN.md.
