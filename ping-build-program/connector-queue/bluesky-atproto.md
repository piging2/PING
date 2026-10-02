# Connector: Bluesky / ATProto

## Why
Read-only observation of Nolan's Bluesky account: profile, posts, feed. No client secret exists anywhere in this flow.

## Exact scope set (smallest permission set)
| Scope | Why | PKCE | What breaks without it |
|---|---|---|---|
| `atproto` (required base) | Session validity; the auth server rejects sessions without it | yes (mandatory per spec) | No session at all; the flow is rejected |
| `transition:generic` | Read profile, posts, feed (approximates legacy session powers for read) | yes | Read-only observation of the account impossible |

No write scopes requested: no `repo:*`, no `blob:`, no rpc write scopes.

## PKCE
Yes, mandatory S256, plus PAR (RFC 9126) plus DPoP per the atproto OAuth spec. The client_id is the client-metadata URL PING hosts. The server verifies `sub` (DID) against `iss` before accepting the session.

## What Nolan must physically do
Almost nothing. Provide the Bluesky handle (or DID). There is no app to register, no developer console, no client secret to create. He authenticates at his PDS/entryway when the connect UI redirects him there.

## What the agent does after
Server-side PAR + PKCE + DPoP flow against his PDS/entryway; verify sub vs iss; `broker.issue()` into custody; discover() inventory of profile/posts/feed capabilities. Nango path: no Bluesky/ATProto provider exists in the Nango catalog (app-password auth, not OAuth). CONNECT ATPROTO is either a custom YAML provider entry or wrapper-native; starts as unsupported-in-Nango. See lane-bcq/NANGO-EVAL.md wrapper rule 6.

## Personal vs dedicated account
The handle IS the blast radius. Connecting his personal Bluesky handle gives PING observation of his personal social graph and posts. A dedicated PING/brand handle bounds that to business content. There is no secret material at risk either way (no client secret, session-scoped tokens only), so this is purely a data-exposure decision, not a credential decision. Recommendation: dedicated handle if one exists; otherwise he accepts the personal-graph exposure.

## Handle story
Same as all connectors: agents get an opaque `cap_` handle; DPoP private keys and session tokens live only in broker custody, never in agent context, browser, events, or logs. See lane-l/SECRET-BROKER-DESIGN.md and lane-conn16/OAUTH-CONNECT-FLOW.md.
