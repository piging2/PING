# Connector: QuickBooks (DEFERRED unless Nolan asks)

## Status
DEFERRED. Verdict from the sibling evaluation: real value but finance-shaped and overkill for FYD v1. This one-pager exists so the scope table and the morning decision are ready if Nolan asks. Do not connect until a demonstrated feature needs it.

## Exact scope set (smallest permission set, if ever connected)
| Scope | Why | PKCE | What breaks without it |
|---|---|---|---|
| `com.intuit.quickbooks.accounting` (read subset only) | Read invoices/expenses (the only demonstrated feature) | yes | No QuickBooks access |

No write scopes. Accounting scopes are heavy; they are requested only for the demonstrated feature.

## PKCE
Yes, if connected. Authorization-code flow with PKCE per current OAuth guidance.

## What Nolan must physically do (Intuit developer portal, only if he says yes)
1. In developer.intuit.com: create an Intuit developer app.
2. Connect it to a QuickBooks sandbox company (never the real company file first).
3. Consent with the accounting read scope above.

## What the agent does after
Nothing, until Nolan says yes. If yes: the standard 7-step connect flow, `broker.issue()` into custody, discover() inventory of invoices/expenses streams.

## Personal vs dedicated account
A QuickBooks company file is inherently the business's own books; the relevant choice is sandbox company vs real company file. Rule: sandbox first, always. A sandbox company keeps test reads off real financials. If Nolan ever approves the real file, that is a separate elevated decision with its own custody record and audit trail.

## Handle story
Same as all connectors: agents get an opaque `cap_` handle; the refresh token never reaches agent context. See lane-l/SECRET-BROKER-DESIGN.md.
