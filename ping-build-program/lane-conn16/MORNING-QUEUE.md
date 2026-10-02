# MORNING QUEUE — account / credential requests for Nolan (Agent 16)

Standing decision: nothing was connected tonight; no live credentials in
any lane. Everything below is a REQUEST for Nolan to pick from. Sibling
lane-conn/MORNING-QUEUE.md already queues: GBP approval + OAuth client,
Square sandbox app, Yelp Fusion key + plan decision, Jobber partner
conversation, Meta App Review. Those are NOT repeated here; they are
referenced where this queue touches the same provider.

Nolan picks which real account gets connected. Agents never connect
anything.

## 1. Facebook / Meta Pages (CONNECT FACEBOOK)

Needs: a Meta app (or reuse of the existing PING Social app surface) with
Facebook Login enabled, plus the PING Social Page
(https://www.facebook.com/profile.php?id=61594275542163) granted to the
connecting identity. Production permissions need App Review; see the
sibling queue item 8 for that application. Tonight's flow design
(OAUTH-CONNECT-FLOW.md) supports the full code+PKCE exchange; the
morning step is App Review submission + Nolan choosing which Page/account.

| Scope | Why needed | PKCE | What breaks without it |
|---|---|---|---|
| pages_show_list | List Pages the user manages, so the connect UI can offer the right Page | yes | Cannot enumerate Pages; connect flow cannot target a Page |
| pages_read_engagement | Read Page metadata, posts, and engagement counts (identity leg for FYD) | yes | No Page identity fields; connector degrades to handle-only |
| pages_read_user_content | Read posts/visitors content on the Page (observation source) | yes | No Page content observations; engagement context missing |

PKCE: yes on the authorization-code flow (code_challenge S256 at
facebook.com/dialog/oauth; code_verifier at the token exchange).

## 2. ATProto / Bluesky (CONNECT ATPROTO)

Needs: Nolan's Bluesky handle (or DID). No app registration: the client
is identified by a client-metadata URL PING hosts. The user authenticates
at their PDS/entryway; the server does PAR + PKCE + DPoP and verifies
sub vs iss.

| Scope | Why needed | PKCE | What breaks without it |
|---|---|---|---|
| atproto (required base) | Session validity; the auth server rejects sessions without it | yes (mandatory per spec) | No session at all; the flow is rejected |
| transition:generic | Read profile, posts, feed (approximates legacy session powers for read) | yes | Read-only observation of the account impossible |

PKCE: yes, mandatory (S256) + PAR + DPoP per the atproto OAuth spec.
No write scopes requested (no repo:*, no blob:, no rpc write).

What Nolan provides: just the handle. There is no client secret to create.

## 3. Google Drive (CONNECT OTHER SOURCE -> Google Drive)

Needs: a Google Cloud OAuth client (can share the client used for GBP;
separate consent per scope set). Nolan picks which Google account's
Drive is connected (recommend: a dedicated PING service account Drive,
not his personal Drive, to bound the blast radius).

| Scope | Why needed | PKCE | What breaks without it |
|---|---|---|---|
| https://www.googleapis.com/auth/drive.readonly | Read file metadata + content via the changes feed and files.export (the demonstrated feature: document ingestion) | yes | No Drive access at all; connector stays DISABLED |

PKCE: yes on the authorization-code flow (access_type=offline only if a
refresh token is needed for background sync; else online).

What breaks without offline: background sync stops when the access token
expires; the connector reports AUTH_EXPIRED and waits for re-consent
rather than silently going stale.

## 4. Gmail (CONNECT OTHER SOURCE -> Gmail)

Needs: same OAuth client as Drive (incremental consent adds the scope).
Nolan picks the mailbox (recommend: a dedicated PING mailbox, not his
personal inbox, for the same blast-radius reason).

| Scope | Why needed | PKCE | What breaks without it |
|---|---|---|---|
| https://www.googleapis.com/auth/gmail.readonly | Read messages + history feed (the demonstrated feature: email observation); never modifies the mailbox | yes | No Gmail access; connector stays DISABLED |

PKCE: yes. gmail.modify is NOT requested (no send, no label writes;
those need a separate demonstrated feature and an elevated grant).

Note: Gmail history cursors expire after ~1 week of inactivity (404);
the connector handles this by design (drop cursor, full re-enumeration),
so an idle week is a re-sync cost, not a breakage.

## 5. Stripe (business data proof, test mode first)

Needs: a Stripe account (Nolan's) with test mode enabled. No real money.
Restricted key (rk_) created in the dashboard with read-only resource
scopes, entered via the operator console into broker custody (no OAuth
needed for the key path; OAuth Connect is the alternative for
multi-merchant later).

| Credential / scope | Why needed | PKCE | What breaks without it |
|---|---|---|---|
| Restricted secret key, read-only (payments, invoices, customers read) | Read payment intents/invoices/customers in test mode (the demonstrated feature) | n/a (key, not OAuth) | No Stripe reads; connector DISABLED |
| Test mode only | Proves the ledger math without touching real money | n/a | Live mode requires a separate source instance + elevated grant; never mixed |

PKCE: n/a for the key path; yes if the OAuth Connect path is chosen later.

What Nolan provides: create the restricted key in test mode; hand it to
the operator console (never chat). Live mode is a separate explicit
decision.

## 6. QuickBooks (deferred unless Nolan wants it)

Needs: an Intuit developer app + OAuth consent on the QuickBooks company
file. Scopes are heavy (accounting read). Verdict from the sibling
evaluation: real value but finance-shaped and overkill for FYD v1.
Queued only so the scope table exists if Nolan asks.

| Scope | Why needed | PKCE | What breaks without it |
|---|---|---|---|
| com.intuit.quickbooks.accounting (read subset) | Read invoices/expenses (the only demonstrated feature) | yes | No QuickBooks access |

Recommendation: do not connect until a demonstrated feature needs it.

## 7. Cross-references (owned by sibling lane-conn/MORNING-QUEUE.md)

- Google Business Profile: approval + OAuth client + business.manage
  scope + reviews-leg expectation + Pub/Sub later. Sibling queue items 1-4.
- Square sandbox app: sibling queue item 5 (cheapest live end-to-end proof).
- Yelp Fusion trial key + plan decision: sibling queue item 6.
- Jobber partner conversation: sibling queue item 7.
- Meta App Review (pages_* production permissions): sibling queue item 8;
  this queue's item 1 consumes its outcome.

## What Nolan must decide in the morning

1. Which Facebook Page/account connects (item 1), and whether to file
   App Review now or run dev-mode first.
2. Which Bluesky handle connects (item 2). No secret needed.
3. Whether Drive/Gmail connect at all, and if so, dedicated PING
   accounts vs personal (items 3-4). Recommendation: dedicated.
4. Whether Stripe test mode is worth the key ceremony now (item 5).
5. QuickBooks: yes/no/defer (item 6). Recommendation: defer.

Nothing connects until Nolan answers. The connect flow
(OAUTH-CONNECT-FLOW.md) + spike are ready to run against whichever he
picks.

## Shared record lines

DOMAIN: oauth | COMPONENT: morning-queue | CLAIM: 7 queue items with
exact scopes, per-scope why/what-breaks, and PKCE yes/no; sibling
lane-conn items cross-referenced not duplicated | EVIDENCE:
MORNING-QUEUE.md (this file); lane-conn/MORNING-QUEUE.md
| CALLER: agent 16 | CALLEE: Nolan (morning) | WRITER: agent 16
| READER: Nolan, coordinator | AUTHORITY: agent 16
| CLASSIFICATION: REQUEST-QUEUE | CONFIDENCE: 0.9 | BROKEN BOUNDARY: none
| DEPENDENCIES: OAUTH-CONNECT-FLOW.md, lane-conn/MORNING-QUEUE.md
| AFFECTS AGENTS: morning connect implementer

DOMAIN: oauth | COMPONENT: morning-queue | CLAIM: Drive/Gmail should
connect via dedicated PING accounts, not Nolan's personal accounts
(blast-radius bound) | EVIDENCE: lane L RT-3 (worker-compromise blast
radius); least-privilege principle | CALLER: agent 16 | CALLEE: Nolan
| WRITER: agent 16 | READER: Nolan | AUTHORITY: agent 16
| CLASSIFICATION: RECOMMENDATION | CONFIDENCE: 0.8 | BROKEN BOUNDARY: none
| DEPENDENCIES: lane-l SECRET-BROKER-DESIGN.md | AFFECTS AGENTS: morning
connect implementer
