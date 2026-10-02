# Connector: Facebook Page

## Why
Page identity leg (page metadata, posts, engagement counts) for FYD identity, plus Page content observations. First-choice channel for prospect outreach also runs through this Page.

## Exact scope set (smallest permission set)
| Scope | Why | PKCE | What breaks without it |
|---|---|---|---|
| `pages_show_list` | List Pages the user manages so the connect UI can offer the right Page | yes | Cannot enumerate Pages; the connect flow cannot target a Page |
| `pages_read_engagement` | Read Page metadata, posts, engagement counts (identity leg) | yes | No Page identity fields; connector degrades to handle-only |
| `pages_read_user_content` | Read posts/visitor content on the Page (observation source) | yes | No Page content observations; engagement context missing |

No write scopes. No speculative scopes.

## PKCE
Yes. Authorization-code flow: code_challenge S256 at facebook.com/dialog/oauth, code_verifier at the token exchange (graph.facebook.com). Per lane-conn16/OAUTH-CONNECT-FLOW.md.

## What Nolan must physically do (Meta for Developers console)
1. Pick the Facebook identity that will connect. It must be an admin of the target Page. Target: the PING Social Page (https://www.facebook.com/profile.php?id=61594275542163).
2. In developers.facebook.com: create a Meta app (or reuse the existing PING Social app surface), add the Facebook Login product.
3. Request the three scopes above on the app. For production (anyone beyond app roles), file App Review for `pages_read_engagement`, `pages_read_user_content`, `pages_show_list`.
4. Timing decision: App Review now, or run dev-mode first. Dev mode works only for people with a role on the app (admin, developer, tester), which is enough for the first proof; production permission needs the review submitted.
5. Also queue the live probe: whether Page Reviews/Recommendations endpoints still function (vendor-reported 501 since Graph API v22.0, unconfirmed).

## What the agent does after
Run the 7-step connect flow: server-side PKCE code exchange, callback state verification, `broker.issue()` into lane-L custody, then discover() builds the capability inventory (streams: page metadata, posts, engagement counts). Nango path: the `facebook` provider already exists in the Nango catalog (auth_mode OAUTH2, proxy graph.facebook.com); the scopes are passed at connect time.

## Personal vs dedicated account
Facebook forces a personal identity behind every app and Page admin role; a Page cannot own an app by itself. A dedicated business Facebook identity (Nolan-controlled, business-only) keeps the PING Social app and Page grants off his personal account's friend/message surface. Personal vs dedicated does not change which scopes grant; it changes whose account gets restricted if Meta flags automation-adjacent activity. Recommendation: dedicated business identity with Page admin rights.

## Handle story
Agents get an opaque `cap_` handle from the lane-L broker. The broker stores sha256(handle) only; the handle value is never stored server-side. Callback handler returns status + inventory to the browser, never tokens. See lane-conn16/OAUTH-CONNECT-FLOW.md steps 5-7.
