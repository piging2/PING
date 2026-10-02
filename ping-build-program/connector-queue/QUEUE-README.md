# CONNECTOR QUEUE — morning decision package

Nothing below connects anything. No live credentials were created tonight.
Nolan picks which real account gets connected; agents never connect anything.
Standing decision from the wave: fixtures and recorded responses only.

## Index

| # | Provider | File | Scopes (exact) | PKCE | Nolan's morning action | Agent's next step | Risk notes |
|---|---|---|---|---|---|---|---|
| 1 | Google Business Profile | gbp.md | `https://www.googleapis.com/auth/business.manage` | yes | Dedicated PING Google account; Cloud project + API enablement + OAuth consent screen + OAuth client; submit "Application for Basic API Access"; profile must be verified 60+ days with representative website | 7-step connect flow; wire nango-gbp-provider.yaml if Nango adopted; morning probe of reviews leg | Longest lead item; 0 QPM until Google approves. Reviews leg may 403 SERVICE_DISABLED even after approval (designed degradation to UNKNOWN). Personal account binds personal identity to customer business data; dedicated recommended. |
| 2 | Facebook Page | facebook-page.md | `pages_show_list`, `pages_read_engagement`, `pages_read_user_content` | yes | Identity that admins the PING Social Page; Meta app + Facebook Login; request the 3 scopes; decide App Review now vs dev-mode first; probe Page Reviews/Recommendations endpoints (vendor-reported 501 since Graph v22.0) | 7-step connect flow; discover() inventory of page metadata/posts/engagement | FB forces a personal identity behind apps/Pages; use a dedicated business identity. Dev mode covers first proof (app roles only). |
| 3 | Bluesky / ATProto | bluesky-atproto.md | `atproto`, `transition:generic` | yes + PAR + DPoP (mandatory) | Provide handle (or DID). Nothing else; no console, no secret | Server-side PAR+PKCE+DPoP; verify sub vs iss; custody; discover(). Nango has no ATProto provider: wrapper-native or custom YAML | Handle IS the blast radius: personal handle exposes personal social graph. No secret material at risk either way. |
| 4 | Google Drive | google-drive.md | `https://www.googleapis.com/auth/drive.readonly` | yes | Dedicated PING Drive account; reuse GBP OAuth client; consent to drive.readonly; decide online vs offline (background sync needs offline) | Incremental consent; PKCE exchange; custody; changes-feed ingestion | Strongest dedicated-account recommendation in the queue: personal Drive exposes personal files to the observation pipeline. |
| 5 | Gmail | gmail.md | `https://www.googleapis.com/auth/gmail.readonly` | yes | Dedicated PING mailbox; incremental consent on shared client | Incremental consent; custody; history-feed observation; cursor re-sync handles idle weeks | Personal inbox exposes email metadata of everything; dedicated strongly recommended. gmail.modify is never requested. |
| 6 | Stripe test mode | stripe-test-mode.md | Restricted key `rk_test_...` (payments/invoices/customers read-only) | n/a (key path; yes if OAuth later) | Test mode ON (verify banner); create restricted key in dashboard; hand it to the OPERATOR CONSOLE (never chat); verify `rk_test_` prefix | Console feeds key to broker.issue(); test-mode reads only; inventory via discover() | Test mode is sandboxed by construction; live mode is a separate source instance + elevated grant, never mixed. |
| 7 | QuickBooks | quickbooks-deferred.md | `com.intuit.quickbooks.accounting` (read subset) | yes | DEFERRED: no action unless Nolan asks | Nothing until a demonstrated feature needs it | Finance-shaped heavy scopes; overkill for FYD v1. If ever: sandbox company first, never the real file. |

## The decisions Nolan actually has to make

1. Which Google account owns the GBP work (dedicated PING account recommended) and whether to start the Basic API Access clock now.
2. Which Facebook identity connects the PING Social Page, and whether to file App Review now or run dev-mode first.
3. Which Bluesky handle connects (no secret needed).
4. Whether Drive/Gmail connect at all, and if so: dedicated PING accounts vs personal. Recommendation: dedicated.
5. Whether Stripe test mode is worth the key ceremony now.
6. QuickBooks: yes/no/defer. Recommendation: defer.
7. Nango vendor veto gate (lane-bcq/NANGO-EVAL.md): approve self-hosted Auth+Proxy for the production hot path? Experimentation is authorized now; production wiring waits for Nolan.

## Handle story (consistent across the queue)

Every one-pager above cites the same custody contract, verified against the design docs:

- **BCQ testkit** (lane-bcq/CONTRACT-TEST-KIT.md): `connect()` must accept only an opaque `CredentialRef`, never a raw secret. Normalization redacts secret-shaped values. The harness scans every observation, checkpoint, and log line for secret-shaped values and fails the suite on any hit.
- **Lane-L broker** (lane-l/SECRET-BROKER-DESIGN.md): handle format `cap_` + 256-bit CSPRNG base64url; the broker stores `sha256(handle)` -> record and never stores the handle value; TTL hard ceiling 900s; two resolution modes (proxy: server-side auth injection, Nango pattern; ephemeral: material zeroed after use). The Nango env key is held by the broker as a capability; `getConnection` is never exposed; proxy-only surface.
- **Connect flow** (lane-conn16/OAUTH-CONNECT-FLOW.md step 6): `broker.issue()` returns the opaque `cap_` handle; the callback handler keeps no copy; the handle value is never stored server-side (only its sha256). Step 7: the registry never reads the handle; lane M register() creates the SourceRecord with the connection as the opaque handle.
- **Nango wrapper** (lane-bcq/NANGO-EVAL.md): two keys with strict separation; RUNTIME key scopes are `environment:proxy`, `environment:connections:list`, `environment:connections:read`, `environment:connect_sessions:write`; NEVER `environment:connections:read_credentials` at runtime (verified 403 in Nango code). Nango connection IDs are never canonical references; the binding table (handle -> business -> nango connection) lives in PING storage.

Net: agents get opaque handles, never tokens. Consistent across all four sources; no contradictions found.

## Canary / secret sweep

Swept: this directory, lane-conn16/MORNING-QUEUE.md, lane-conn16/OAUTH-CONNECT-FLOW.md, lane-conn/MORNING-QUEUE.md, lane-bcq/NANGO-EVAL.md, lane-l/SECRET-BROKER-DESIGN.md, lane-bcq/CONTRACT-TEST-KIT.md. Patterns: `sk_live_/sk_test_/rk_` real keys, `ghp_/gho_`, `xoxb-/xoxp-`, `ya29.`, `Bearer` tokens, AWS keys, NANGO_ENCRYPTION_KEY assignments.

Result: CLEAN. Zero real secret-shaped values found. The only canary-pattern hits anywhere in the lanes are the deliberate planted canaries in lane-conn16/spike/connect_flow_spike.py (the `sk_live_CANARY_*` and `rt_CANARY_*` fixtures) and the spike's own containment regex that scans for them: those are the testkit's fixtures, self-scanned by the spike, exactly as designed. New files in this package contain only scope strings, placeholder markers (`<PLACEHOLDER ...>`), and key PREFIX names (`rk_test_`); no material.

## Source docs this package was built from

- lane-conn16/OAUTH-CONNECT-FLOW.md (7-step state machine, PKCE-S256 mandatory, PAR+DPoP for ATProto)
- lane-conn16/MORNING-QUEUE.md (FB Page scopes, Bluesky, Drive/Gmail, Stripe test ceremony, QuickBooks defer)
- lane-conn/MORNING-QUEUE.md (GBP approval clock, OAuth client, reviews-leg expectation, Pub/Sub later)
- lane-bcq/NANGO-EVAL.md (Auth+Proxy verdict, scoped keys, proxy-only pattern, GBP YAML-addable)
