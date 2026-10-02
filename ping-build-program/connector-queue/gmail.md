# Connector: Gmail

## Why
Email observation: read messages + history feed. Never modifies the mailbox.

## Exact scope set (smallest permission set)
| Scope | Why | PKCE | What breaks without it |
|---|---|---|---|
| `https://www.googleapis.com/auth/gmail.readonly` | Read messages + history feed (the demonstrated feature) | yes | No Gmail access; connector stays DISABLED |

`gmail.modify` is NOT requested: no send, no label writes. Those need a separate demonstrated feature and an elevated grant.

## PKCE
Yes. Authorization-code flow with PKCE. Same shared OAuth client as Drive/GBP (incremental consent adds the scope).

## What Nolan must physically do (Google Cloud Console)
1. Pick the mailbox. Recommendation: a dedicated PING mailbox, not his personal inbox.
2. Consent to `gmail.readonly` (incremental consent on the existing client).

Note: Gmail history cursors expire after about a week of inactivity (404); the connector handles this by design (drop cursor, full re-enumeration), so an idle week is a re-sync cost, not a breakage.

## What the agent does after
Incremental consent; server-side PKCE exchange; `broker.issue()` into custody; discover() inventory; history-feed observation begins. Cursor handling is Airbyte-style: the opaque resume cursor lives PING-side, never in Nango.

## Personal vs dedicated account
Same blast-radius argument as Drive, stronger. A personal inbox exposes email metadata of everything (banks, health, family, business of others). `gmail.readonly` is read-only but it reads everything. A dedicated PING mailbox bounds observation to business mail only. Recommendation: dedicated PING mailbox. Personal selection must be an explicit recorded risk acceptance.

## Handle story
Agents get an opaque `cap_` handle from the lane-L broker; the connector worker resolves it per fetch run (or per batch), scoped to tenant + source, TTL capped at 900s. See lane-l/SECRET-BROKER-DESIGN.md section 5.
