# Facebook connector lane (FB-B)

Read-only Facebook Graph API connector for the PING compiler/aggregator
foundation program. Branch: `fb-connector`. Lane directory:
`~/workspace/integration/facebook/`.

## What it is

- `FacebookConnector` (`src/adapter.ts`): implements the lane-bcq
  `ConnectorAdapter` SPI — `check` / `discover` / `read` for three streams:
  `facebook.page`, `facebook.page-posts`, `facebook.post-comments`.
  No write path. No pause/hold/freeze semantics anywhere (read API only).
- `src/graph-api.ts`: the single place that knows Meta's wire shape
  (Graph API v26, field sets, paging, error-code -> lane-K failure mapping,
  bounded retry policy). New read edges slot in as `EdgeSpec`s.
- `src/manifest.ts`: kit-shaped manifest for admission (scopes adopted from
  `connector-queue/facebook-page.md`, not redesigned).
- `src/envelope.ts`: source envelope on every observation
  (`source_system=facebook`, account, object type/id/version, observed/ingested
  timestamps, principal, namespace, raw payload hash, cursor).
- `src/compiler.ts`: Facebook semantics -> PING canonical **observation
  candidates**. STOPS there: canonical events belong to the event authority
  (phase0, still converging); this lane mints none.
- `manifest.facebook.json`: registry entry (provider -> connector ->
  compiler -> capabilities -> auth type -> sync modes -> status).
  Status is honestly `DISABLED` until a live credential exists.
- `test/`: fixture-driven tests (`bun test/run.ts`), no live calls.

## Authority map (what this lane does NOT own)

| Concern | Owner | This lane's posture |
|---|---|---|
| Adapter SPI, harness, sanitize, failure codes | lane-bcq kit | consume, never fork |
| Secrets / tokens | lane-L broker | capability handles only; raw tokens never in source, config, logs, tests, events |
| Canonical events / identity / sequencing | event authority (phase0, converging) | observations + candidates only |
| Nolan-click OAuth boundary | lane-conn16 + `connector-queue/facebook-page.md` + FB-A research | consume; scopes adopted verbatim |
| Engagement automation | `~/workspace/pig-fb/` (browser) | untouched |

## Auth design

`ports.getSecretHandle('facebook-oauth2-page-token')` returns an opaque
handle passed as `connectionId` to `ports.fetchRaw`. The raw token resolves
only inside the trusted seam (production: lane-L `AuthBroker.proxyCall`;
tests: the harness `fetchRaw`, which is that seam's stand-in). Principal is
read from connector config at call time, never hardcoded, never fabricated.

## Test

```sh
cd ~/workspace/integration/facebook
bun test/run.ts        # 34 checks, fixture-driven, zero network
npx -p typescript tsc --noEmit   # strict typecheck
```

## Credential boundary: what Nolan must provide for a live read

1. **Token type**: a Facebook **Page access token** for the PING Social Page
   (`61594275542163`), obtained via Facebook Login (authorization code +
   PKCE) by a Page admin, then exchanged server-side (`/{user-id}/accounts`).
   System-user tokens are the server-side alternative.
2. **Scopes** (least privilege, no write): `pages_show_list`,
   `pages_read_engagement`, `pages_read_user_content`.
3. **How**: Meta app with Facebook Login product (App Review required for
   production use beyond app roles; dev mode suffices for the first proof
   with Nolan as an app role). Completed through the lane-conn16 OAuth
   connect flow; the resulting connection lives in lane-L vault custody and
   the connector receives only a `cap_` handle.
4. **What the connector does on first live run**: `check()` proves Page
   reachability, `discover()` returns the three streams, `read()` emits
   observations. No code change: fixtures are swapped for the live seam.

## Future (declared, not implemented)

- `facebook.conversations` (Messenger): needs `pages_messaging`; the edge
  spec exists (`CONVERSATIONS_EDGE`) and the read machinery is edge-agnostic.
- `webhook-receive` (Meta Page webhooks, X-Hub-Signature-256): polling is v1.
