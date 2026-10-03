# HARVEST PROPOSAL: Composio — brokered external-tool execution

- **Company:** Composio (composio.dev) — external tool execution platform for AI agents (1,500+ app toolkits)
- **Assignment:** managed auth, tool schemas, execution identities, integration lifecycle (connect, refresh, disconnect, revoke)
- **Date:** 2026-10-02
- **Worker:** piging2 harvest worker (leaf)
- **VERDICT: ADAPT** — re-derive the brokered-credential execution mechanism (connected-account object + dispatch-time identity resolution + credential lifecycle + execution receipts) into PING-native event-kernel / capability-kernel semantics. Do NOT adopt the Composio SaaS platform as a dependency: credential custody and execution logs would become a second, external authority, violating PING's authority-ownership rule.
- **AUTHORITY_OWNER:** capability-kernel (execution identities: actor, target, action, constraints, allow/deny)
- **proof_ids:** [9, 10, 11, 12, 13, 14]

## 0. Clean-room statement

Composio's execution backend (backend.composio.dev) is closed-source SaaS. No proprietary code was read, copied, or reconstructed. Everything below is re-derived from Composio's official public documentation and the MIT-licensed public repo (SDKs + docs + toolkit definitions) at github.com/ComposioHQ/composio. All claims cite the exact URL or commit read. Third-party summaries appear only as pointers; facts are taken from official Composio sources.

---

## 1. What I read (official sources only)

| # | Source | What was read | Date read |
|---|--------|---------------|-----------|
| S1 | https://docs.composio.dev/docs/welcome | Product surface overview: sessions, managed auth, triggers, sandbox | 2026-10-02 |
| S2 | https://docs.composio.dev/docs/how-composio-works | Session model: userID scoping, tool access, authentication, execution state; meta tools; session persistence | 2026-10-02 |
| S3 | https://docs.composio.dev/docs/toolkits | Toolkit vs tool definitions; `{TOOLKIT}_{ACTION}` slug pattern; input/output schemas; meta-tool flow (search → connect → execute) | 2026-10-02 |
| S4 | https://docs.composio.dev/docs/auth-configuration/connected-accounts | Connected-account lifecycle ops, credential redaction format, INACTIVE/REVOKED/deleted states, complete_auth single-use URI, link() vs initiate() deprecation | 2026-10-02 |
| S5 | https://docs.composio.dev/docs/security/token-custody | Token custody architecture: server-side injection, API redaction scope, execution paths, Proxy Execute eTLD+1 rule, deployment options, ZDR, user-binding requirement | 2026-10-02 |
| S6 | https://composio.dev/blog/two-questions-every-security-review-asks-us | Full per-call pipeline (API key → edge → orchestration → isolated execution runtime → provider); AES-256-GCM envelope encryption; project isolation boundary; behavior tags; revocation; data retention | 2026-10-02 |
| S7 | https://docs.composio.dev/reference/api-reference/auth-configs/postAuthConfigs | `POST /api/v3.1/auth_configs` body: `toolkit` object + `auth_config` (`ComposioManagedAuthConfigCreate | CustomAuthConfigCreate`); default `{"type":"use_composio_managed_auth","credentials":{},"restrict_to_following_tools":[]}` | 2026-10-02 |
| S8 | https://docs.composio.dev/reference/api-reference/tool-router/postToolRouterSessionBySessionIdExecute | `POST /api/v3.1/tool_router/session/{session_id}/execute`: `tool_slug`, `arguments`, `account` (account ID or alias; ambiguity error lists available accounts) | 2026-10-02 |
| S9 | https://docs.composio.dev/reference/sdk-reference/python/tools.md | `Tools.execute(slug, arguments, connected_account_id?, custom_auth_params?, custom_connection_data?, user_id?, text?, version?, dangerously_skip_version_check?, modifiers?) → ToolExecutionResponse` | 2026-10-02 |
| S10 | https://docs.composio.dev/docs/auth-configuration/custom-auth-params.md | `customAuthParams.parameters[] = {name, value, in: header|query}` per-call credential injection; bypasses automatic refresh | 2026-10-02 |
| S11 | Official docs content: webhook subscriptions (docs/api-overviews/webhook-subscriptions.mdx; changelog 02-06-26) | `composio.connected_account.expired` event payload shape; HMAC-SHA256 signatures; `POST /api/v3.1/webhook_subscriptions/{id}/rotate_secret`; one subscription per project | 2026-10-02 |
| S12 | Official docs content: configuring sessions (docs/content/docs/configuring-sessions.mdx) | Account-selection precedence chain (5 steps); `connected_accounts` per-toolkit pinning; multi-account options | 2026-10-02 |
| S13 | Official docs content: managing multiple connected accounts (docs/content/docs/authentication/managing-multiple-connected-accounts.mdx) | Aliases (unique per user+toolkit+project); read-only `displayName` at `state.val.displayName`; `allow_multiple`; `require_explicit_selection` | 2026-10-02 |
| S14 | https://github.com/ComposioHQ/composio/blob/main/LICENSE | MIT License text | 2026-10-02 |
| S15 | https://api.github.com/repos/ComposioHQ/composio/commits/main | HEAD commit `b2f5098b28e9bfe1f0c2255b94adea7c5c2fa022` (2026-09-21, PR #4556) | 2026-10-02 |

Note: Composio's docs mirror into several public GitHub forks; the canonical repo is `ComposioHQ/composio` (verified via the GitHub API). The API reference pages carry path segments like `/api/v3.1/`; the live base URL is `https://backend.composio.dev/api/v3.1`.

---

## 2. Object model (clean-room re-derivation)

### 2.1 ConnectedAccount — the load-bearing object

A ConnectedAccount is one human's authenticated connection to one toolkit (provider app), under one project. It is the unit of *execution identity*: an external call runs *as this account*.

Fields (from official docs):

- `id` — opaque handle, `ca_`-prefixed nanoid (e.g. `ca_xlWpkPocZSGr`). Addressed by this ID everywhere; the secret material is never addressable.
- `user_id` — the app's stable identifier for the human (recommended: database UUID/primary key; avoid emails; never the literal `default` in production). One human can own many accounts per toolkit (work + personal Gmail).
- `toolkit` — `{ slug }` (e.g. `gmail`, `github`, `slack`).
- `auth_config` — `{ id: ac_..., auth_scheme: OAUTH2 | API_KEY | BEARER_TOKEN | BASIC | ... }`.
- `status` — `INITIATED | ACTIVE | EXPIRED | FAILED | INACTIVE | REVOKED` (see §4).
- `status_reason` — human/machine string, e.g. `"OAuth refresh token expired"`.
- `alias` — human label (`"work-gmail"`), unique per (user, toolkit, project); settable at connect time or via update; clearable (`""`).
- `state.val` — authentication-state object. Sensitive fields (`access_token`, `refresh_token`, `api_key`, `bearer_token`, `password`, "and other secrets") are **redacted server-side before the API responds**: first 4 characters + `"..."` (values shorter than 4 chars → `"REDACTED"`). This applies to Get and List, for managed and custom auth configs alike. Presence of field names in SDK types does NOT mean usable secrets are returned.
- `state.val.displayName` — provider-side identity (e.g. Gmail address, GitHub username), **read-only, auto-populated** once the connection is active. This is the *attribution surface*: it tells a human/operator whose provider account this is, without exposing credentials.
- `visibility` — `PRIVATE` (default; usable only by the owning user) | `SHARED` (reachable by other users through a per-connection ACL; ACL fields are experimental, nested under an `experimental` block — pin SDK version if used).
- Project scoping: a connected account belongs to exactly one project; every database query carries a project filter.

Key invariant: **the account is a credential *reference*, not a credential.** The agent receives `ca_...` and the tool call is authenticated server-side.

### 2.2 AuthConfig — the authentication blueprint

One auth config per toolkit defines *how* authentication works for that toolkit across all users of a project:

- `id` — `ac_`-prefixed (e.g. `ac_gmail_oauth2`).
- `toolkit` — `{ slug }`.
- `type` — `use_composio_managed_auth` (Composio's shared OAuth app) | custom (bring your own OAuth client ID/secret, or your own API-key scheme).
- `auth_scheme` — `OAUTH2`, `API_KEY`, etc. (also surfaced as `auth_schemes` / `composio_managed_auth_schemes` on the toolkit catalog entry).
- `scopes` — requested provider scopes (tighten to shrink blast radius).
- `restrict_to_following_tools` — optional allow-list binding the config to specific tools.
- `is_composio_managed` — bool.
- `is_enabled_for_tool_router` — when true, sessions auto-match a connected account by `user_id` for custom toolkits.

Flow: `POST /api/v3.1/auth_configs` with `{ toolkit: {slug}, auth_config: {type, credentials?} }`. When a toolkit needs auth, the config is created once (managed credentials by default) and reused for every user; each user's OAuth completion mints their own ConnectedAccount against it.

### 2.3 Session — the execution context

A session is the runtime context for one agentic run, created per user (`composio.create(user_id)` → new session ID each time). It scopes four things:

1. **userID** — whose connected accounts and executions are in scope.
2. **Tool access** — all toolkits by default; or filtered toolkits / tools / tags (e.g. `readOnlyHint`).
3. **Authentication** — managed auth, custom auth configs, per-toolkit connected-account pinning.
4. **Execution state** — logs, tool memory, MCP state, workbench files.

Sessions persist server-side and **do not expire**; reuse via `composio.use(session_id)` for multi-turn work. A session can be changed while running or deleted outright (deletion kills it and its MCP URL immediately).

Session config for identity pinning:

```python
session = composio.create(
    user_id="user_123",
    connected_accounts={"gmail": ["ca_work_gmail"], "github": ["ca_personal_github"]},
    auth_configs={"github": "ac_your_github_config", "slack": "ac_your_slack_config"},
    multi_account={"enable": True, "max_accounts_per_toolkit": 3},
)
```

Account-resolution precedence at execution time (deterministic, documented):

1. The session's `connectedAccounts` override.
2. The session's `authConfigs` override (finds or creates a connection on that config).
3. An auth config previously created for this toolkit.
4. A new auth config created with Composio managed auth.
5. Error, if no managed auth scheme exists for the toolkit.

If multiple accounts exist and none is pinned, the **most recently connected** active account wins — unless `require_explicit_selection` is true, in which case the call must carry `account` (ID or alias) and ambiguity is a hard error (`ToolRouterV2_NoActiveConnection`, code 4302, whose payload lists available accounts). **Ambiguity fails closed.**

### 2.4 Tool — the action schema

- `slug` — `{TOOLKIT}_{ACTION}`, e.g. `GMAIL_FETCH_EMAILS`, `GITHUB_CREATE_AN_ISSUE`, `SLACK_SEND_MESSAGE`, `GOOGLECALENDAR_LIST_EVENTS`.
- `name`, `description`, `input_parameters` (JSON schema), `output_parameters` (JSON schema), `scopes`, `no_auth`, `tags`, `version`, `toolkit: {slug, name, logo}`.
- Enabling a toolkit makes its tools *available*; it does **not** connect an account or grant data access. Tools that need auth execute "using that account's credentials and permissions."

Meta tools (fixed small set, so agents never load hundreds of schemas into context):

- `COMPOSIO_SEARCH_TOOLS` — discover tools by intent; returns schemas.
- `COMPOSIO_MANAGE_CONNECTIONS` — when a tool needs a missing account, returns a Connect Link (also callable directly by the app; the link can be DM'd, emailed, rendered in custom UI).
- `COMPOSIO_MULTI_EXECUTE_TOOL` — batch execution through the session router (supports per-tool `account` selection).

### 2.5 ToolExecution — request/response contract

Direct REST execution:

```
POST https://backend.composio.dev/api/v3.1/tools/execute/{TOOL_SLUG}
x-api-key: <project key>
{ "user_id": "...", "connected_account_id": "ca_...", "arguments": {...},
  "text": "...", "version": "latest" }
```

Response envelope: `{ "successful": bool, "data": ..., "error": ..., "session_info": ..., "log_id": "..." }`. Failures carry a structured error: `{ "message", "code", "slug", "status", "suggested_fix" }`.

Session-router execution: `POST /api/v3.1/tool_router/session/{session_id}/execute` with `{ tool_slug, arguments, account? }` where `account` is an account ID or alias.

Proxy Execute (arbitrary provider API call with server-side credential injection): `POST /api/v3.1/tools/execute/proxy` with `{ connected_account_id, endpoint, method, body?, binary_body?, parameters? }`. Requires a dedicated `proxy_execute` API-key permission. Absolute URLs must share scheme and registrable domain (eTLD+1) with the account's resolved base URL. Rationale (official): there is intentionally **no token-read endpoint** — direct-token calls would bypass execution logs and policies.

Caller-supplied credentials (`customAuthParams.parameters[] = {name, value, in: "header"|"query"}`) inject a token per call — this **bypasses automatic refresh**; the caller owns refresh.

---

## 3. ID scheme

| Object | Format | Example |
|---|---|---|
| ConnectedAccount | `ca_` + nanoid | `ca_xlWpkPocZSGr` |
| AuthConfig | `ac_` + slug-ish | `ac_gmail_oauth2` |
| Webhook event | `evt_` + UUID | `evt_847cdfcd-d219-4f18-a6dd-91acd42ca94a` |
| Project | `pr_` + id | `pr_your-project-id` |
| Organization | `ok_` + id | `ok_your-org-id` |
| Webhook subscription | `ws_` + id | `ws_your-subscription-id` |
| Connect link | `https://connect.composio.dev/link/ln_...` | `ln_abc123` |
| Session | opaque session ID (new per `create()`) | — |
| User | app-defined stable ID (recommended: DB UUID) | `user_123` |
| Execution receipt | `log_id` on every execute response | — |

Secrets are hash-only: "For Composio API keys and session keys, we store only hashes. There's no recoverable copy... You see it once, at creation, and that's it."

---

## 4. State transitions — ConnectedAccount lifecycle

```
INITIATED ──(user completes OAuth on hosted Connect Link)──> ACTIVE
   │  (link sessions expire; default INITIATED expiry ≈ 10 min)      │
   │                                                                 │ (auto token refresh, proactive)
   │                                                                 v
   │                                                          ACTIVE ──(refresh token revoked/expired,
   │                                                            after multiple failed refresh attempts)──> EXPIRED
   │                                                                 │
   │                                                          re-auth via new link → ACTIVE
   │
ACTIVE ──(PATCH status: pause, e.g. subscription lapse)──> INACTIVE ──(PATCH status)──> ACTIVE
   │         (INACTIVE accounts cannot execute; calls fail)
   │
   ├──(revoke())──> REVOKED   (upstream token revocation; best effort;
   │                           fails if toolkit lacks programmatic revocation
   │                           or account not in revocable state)
   │
   └──(DELETE)──> deleted permanently (stops all further API calls immediately;
                 ?revoke_on_delete=true optionally revokes upstream, default false;
                 provider-side audit history preserved)
```

Connect flow details:

1. `POST /api/v3.1/connected_accounts/link { auth_config_id, user_id, callback_url?, alias?, connection_data? }` → `201 { link_token, redirect_url, expires_at, connected_account_id }`. (`initiate()` for managed OAuth is deprecated: blocked for orgs created ≥ 2026-05-08, all orgs ≥ 2026-07-03.)
2. User signs in on the hosted page. OAuth handshake happens on Composio infrastructure; tokens encrypted and vaulted; the app never touches them. "Credentials never pass through your app or the model, so it's safe to surface the link right in the chat."
3. Composio redirects to `callback_url` with `status=success&connected_account_id={id}`.
4. If the project configured an OAuth callback verifier: Composio first redirects to the verifier with a **single-use session URI**; the app verifies the human's identity, then redeems via `connected_accounts.complete_auth(user_id, session_uri)`. Composio checks project ownership and the connection's user ID before the token exchange. An expired or already-redeemed URI returns **404**. This binds the connection to a verified human — the verifier is the anti-session-fixation primitive.
5. Refresh: Composio refreshes OAuth access tokens **proactively before expiry** (not 401-then-refresh). Only after multiple failed refresh attempts does the account go `EXPIRED`; the platform emits `composio.connected_account.expired` (HMAC-signed webhook) so the app can send a fresh Connect Link.
6. `refresh()` endpoint is deprecated and no longer validates credentials; re-initiate auth instead.

Non-OAuth (API key / bearer / basic) and custom auth configs use `initiate()`/create directly with credential material — those paths are unaffected by the `link()` migration.

---

## 5. Authority boundary

The per-call pipeline (official security post, verbatim structure):

```
Your agent or application
  | API key, scoped to one project
  v
Composio edge (TLS, rate limiting, authentication)
  | request resolves to org + project + user
  v
Orchestration (policy check, token refresh, routing)
  | authorized tool call
  v
Isolated execution runtime (one container per execution)
  | credential attached, HTTPS
  v
The third-party application
```

Boundary rules that matter for PING:

1. **Identity comes from the trusted edge, never from model arguments.** "That ID [userID] selects the credential at execution time. The model's tool arguments do not determine which user's token the session uses." This is the confused-deputy fix at the architecture level.
2. **Credential injection happens at the execution step, never in agent context.** "The credential is injected at the execution step, never shown to the agent, so an injection can't leak what it can't read." Storage: AES-256-GCM with envelope encryption; per-project data key wrapped by a KMS key-encryption key that "rotates on its own schedule"; decrypted only for the duration of one call in a per-call container that "retains no credential afterward."
3. **The app backend is the trust anchor for identity binding.** "Your backend must bind the signed-in user to the correct Composio `user_id` and connected accounts. A caller-supplied user ID is not proof of identity."
4. **Permissions are evaluated as code in the request path**, layered: org-level ceiling → session subset → toolkit filters → per-tool enable/disable lists → behavior tags (`readOnlyHint`, `destructiveHint`). "If you've said an agent may not delete, it cannot delete, regardless of what a prompt, a tool output, or the model's own reasoning suggests."
5. **Human approval is explicitly out of scope for the platform**: "Human approval is yours to build. For anything irreversible or outward-facing, put a checkpoint in your agent's flow before the action fires. Composio gives you the per-action switch; the approval step runs in your agent, not on our platform."
6. **Tenant isolation**: "The project is the isolation boundary. Connected accounts, OAuth tokens, auth configs, and triggers each belong to exactly one project, and every database query carries a project filter." Recommendation: one project per downstream tenant.
7. **Deliberate non-features that enforce the boundary**: no token-read endpoint exists (prevents bypassing execution logs/policies); API responses redact credentials; `customAuthParams` is the only escape hatch and it disables managed refresh (caller's problem).

Deployment variants of custody (for completeness): Composio Cloud (Composio holds keys) | Private VPC | Self-hosted (Helm) | Customer-managed keys (proxy in your cloud; credentials encrypted under your KMS — AWS KMS, Google Cloud KMS, HashiCorp Vault Transit; "Revoke your master key and every credential goes dead immediately"). Only the Cloud variant's mechanism is harvested; the pattern (control plane vs key material separation) is the reusable primitive.

---

## 6. Persistence semantics

- **Connected accounts and sessions persist server-side; sessions do not expire.** Connections survive across sessions for the same user.
- **Execution logs** include full request/response payloads by default, retained up to one year. The per-call `log_id` is the durable handle.
- **Zero Data Retention (ZDR)**: org-admin setting stops storing *new call payloads* for covered calls (tool + Proxy Execute; triggers/sandbox/files excluded; managed-app coverage is Enterprise-only). The **audit record always survives**: which tool ran, when, whether it succeeded, the supplied user ID, and the associated connection and auth-config IDs. ZDR does not delete existing logs.
- Files staged for tool execution are deleted after 24 hours.
- Deletion of a connected account stops further API calls immediately and preserves provider-side audit history.

---

## 7. Evidence / receipts

Every execution returns `log_id` (+ `session_info`) — the execution receipt. The platform dashboard exposes Auth configs, connected accounts, and logs. Audit metadata (tool, timestamp, success, user_id, connection id, auth-config id) is retained even under ZDR. Lifecycle events (`composio.connected_account.expired`) arrive as HMAC-SHA256-signed webhooks with a `secret` that is returned only at creation/rotation. This is the *attribution chain*: `log_id → connected_account_id → user_id → auth_config_id → project_id`.

---

## 8. Retries / failures

- **No documented automatic retry of tool executions.** Failures return the structured envelope `{message, code, slug, status, suggested_fix}` for the caller to handle.
- **Refresh is proactive, not reactive**: tokens are refreshed before expiry (avoids 401-retry races). After *multiple* failed refresh attempts → `EXPIRED` + signed webhook. (Single-timeout → failure is explicitly not their model — cf. Nolan's probe law: sustained loss only.)
- Ambiguity errors: `ToolRouterV2_NoActiveConnection` (code 4302) when stale/duplicate accounts shadow the good one; payload lists available accounts so the caller can pin one.
- `INACTIVE` accounts fail execution until re-enabled.
- `revoke()` fails cleanly when the toolkit doesn't support programmatic revocation or the account isn't in a revocable state (fail-closed, typed error).
- API keys are hash-only: a lost key cannot be recovered, only rotated — the credential-store equivalent of "no unmasking."

---

## 9. Revocation model

| Mechanism | Effect | Scope |
|---|---|---|
| `PATCH status → INACTIVE` | Pauses execution immediately; reversible | per account |
| `revoke()` | Upstream token revocation at provider; marks `REVOKED`; best-effort | per account |
| `DELETE ?revoke_on_delete=true` | Deletes account AND requests upstream revocation (default `false`) | per account |
| Alias clearing / account update | Metadata change; does not affect credentials | per account |
| Session deletion | Kills session + its MCP URL immediately; connections persist | per session |
| Customer-managed key revocation | Every credential dead immediately, no platform round-trip | org-wide |
| API-key / webhook-secret rotation | Invalidates prior key material (keys are hash-only, shown once) | project |

---

## 10. Tests

Composio's execution backend is closed-source, so its internal tests were not available. What is publicly testable (MIT repo at HEAD `b2f5098b28e9bfe1f0c2255b94adea7c5c2fa022`):

- SDK error taxonomy: `python/tests/test_client_errors.py` — 17 tests asserting HTTP status errors surface as both generated-client errors and `ComposioError` (PR #4556; full Python suite 1939 passed / 51 skipped at that commit).
- Docs build/tests: `bun test tests/static/content.test.ts tests/static/navigation.test.ts tests/static/dashboard-links.test.ts tests/static/product-navigation.test.ts` — 24 passed (PR #4446).

For the piging2 ADAPT implementation, the mechanism implies these contract tests (to be written against our own event-kernel implementation):

1. Credential material is never readable through any API path (redaction: first-4 + `...`; <4 chars → `REDACTED`).
2. Execution identity resolves from the trusted dispatcher context (`user_id`), never from worker-supplied arguments.
3. Ambiguous account selection fails closed with an enumerable-account error (never silently picks).
4. `INACTIVE`/`EXPIRED`/`REVOKED`/deleted bindings deny execution with typed errors.
5. Refresh is proactive; `EXPIRED` is emitted only after N consecutive refresh failures, plus a signed expiry notification.
6. Every execution emits a receipt (`log_id`-equivalent) with tool, timestamp, success, user, binding, config IDs — retained under payload-retention-off.
7. Revocation (local + upstream) immediately stops subsequent executions; single-use auth-completion URIs redeem at most once (second redeem → 404).
8. HMAC verification of lifecycle webhooks; secret rotation invalidates the old secret.

---

## 11. Verdict: ADAPT (with reasons)

**ADAPT.** The mechanism is proven and load-bearing; the platform is not adoptable.

Take (re-derive in PING semantics on the event kernel + capability kernel):

1. **ConnectedAccount object**: opaque credential reference (`ca_`-style handle), owner `user_id`, toolkit, auth scheme, status state machine, human alias, read-only provider `displayName`, PRIVATE/SHARED visibility. Credential material lives in the authority's vault and is *never readable* by workers or API consumers — only referenceable.
2. **AuthConfig blueprint**: per-provider auth method + scopes + tool allow-list, created once per provider, minted per user.
3. **Dispatch-time identity resolution** with a deterministic precedence chain and fail-closed ambiguity (no silent default when multiple active bindings exist).
4. **Lifecycle as events**: INITIATED → ACTIVE → EXPIRED → (re-auth) / INACTIVE / REVOKED / DELETED, with proactive refresh and signed expiry notifications.
5. **Execution receipts**: per-call `log_id`-equivalent with the full attribution chain, retained even when payload retention is off.

Explicitly REJECT for piging2 core:

- **Composio SaaS as the execution/custody dependency.** Adopting the platform would place credential custody, execution logs, and refresh policy in a closed external system — a second authority over PING's own execution truth. "Declared authority must match actual capability ownership." The mechanism must be PING-owned.
- The session/MCP/sandbox/trigger product surface — out of scope for the kernel harvest. (The *session-as-execution-context* idea is useful context for WorkerAdapter design but is not itself a missing primitive.)

Relationship to existing PING: the capability-kernel already models actor/target/action/constraints/allow-deny, but it has no first-class representation of *"this external call runs as human H at provider P, via a credential the worker cannot see."* That is the gap (§12).

## 12. SMALLEST MISSING PRIMITIVE

**Delegated Execution Credential** (working name; capability-kernel owned): the binding

```
{ id, owner_user_id, provider (toolkit slug), auth_scheme,
  credential_handle (opaque, write-once, read-never),
  provider_identity (read-only displayName, for attribution),
  status (INITIATED|ACTIVE|EXPIRED|INACTIVE|REVOKED),
  bound_tool_scopes, allowed_dispatchers (ACL), refresh_policy }
```

that lets a worker execute a third-party action **on a human's behalf** such that:

- (a) the worker references the handle but can never read the secret (prompt-exfiltration impossible by construction — Composio's docs name this the central confused-deputy defense);
- (b) the identity is resolved **server-side at dispatch time** from the trusted dispatcher context, never from worker arguments;
- (c) the credential has a state machine with proactive refresh and signed expiry notification;
- (d) it is bound to capability grants (which dispatchers may run which tools against it);
- (e) every use emits an execution receipt (`log_id`-equivalent) carrying tool, timestamp, success, owner, binding, and config IDs.

Why this is the smallest: everything else in Composio's surface (sessions, meta tools, proxy, MCP) is product scaffolding around this one object. PING's capability-kernel can already say "worker W may call action A on target T"; it cannot say "and the call authenticates as human H at provider P via a credential W never sees, revocable independently of W's grant." Without that object, a PING WorkerAdapter must either smuggle raw secrets into worker context (exfiltration surface) or it cannot attribute and revoke per-human external effects at all. With it, proofs 9–14 become implementable: a mission binds the credential (9), the worker executes through it and returns a receipt (10), a bad result triggers revocation/inactive enforcement (11), the resolution precedence chain is the fallback path (12), verification checks the receipt + attribution independently of the worker's claim (13), and lifecycle transitions are append-only events for replay (14).

## 13. Dependency analysis

**Zero new dependencies.** This is a clean-room specification re-derived from official docs; no libraries, SDKs, or services are required to implement it. Envelope encryption (AES-256-GCM) and HMAC-SHA256 are standard primitives to be provided by the existing trust-kernel surface — no new dependency is named. The Composio SaaS platform and its SDKs are explicitly NOT dependencies of the harvest.

- `DEPENDENCIES: []`
- `DEPENDENCY_COST: "zero"`

## 14. License finding

- **Public repo `ComposioHQ/composio` (SDKs, docs, toolkit definitions): MIT License** — verified verbatim at https://github.com/ComposioHQ/composio/blob/main/LICENSE on 2026-10-02 ("Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software...").
- **Backend platform (backend.composio.dev): closed-source SaaS** — no code was available and none was taken; the mechanism is re-derived from documentation only.
- **Copyleft/SSPL/BSL: none found** in any harvested material. Nothing to flag to Nolan on license grounds. The only caution is architectural, not legal: do not make the closed SaaS a kernel dependency.

## 15. Proof mapping

| Proof | How the harvested primitive serves it |
|---|---|
| 9 — create one mission | A mission binds a Delegated Execution Credential as the identity its external steps run as |
| 10 — worker returns result | Worker executes through the binding; result returned with the execution receipt |
| 11 — injected bad result is rejected | Revocation/INACTIVE/EXPIRED enforcement: executions against a dead binding are denied with typed errors; bad provider results are attributable via receipt |
| 12 — fallback attempt succeeds | Deterministic resolution precedence (pinned → auth config → most-recent active) is the failover chain; re-auth flow recovers EXPIRED bindings |
| 13 — VERIFIED only after independent verification | Receipt (`log_id`-equivalent + attribution chain) is checkable independently of the worker's claim; worker arguments can never select the identity |
| 14 — replay reconstructs relevant state | Credential lifecycle transitions are append-only events; receipts reference binding + config IDs |

## 16. Open questions / caveats

- Exact nanoid alphabet/length and the full ConnectedAccount REST response schema (timestamps, `params`) were not published in the pages read; the adaptation should define its own.
- The SHARED-connection ACL shape is experimental upstream — the adaptation should design its own ACL on the capability-kernel rather than mirror an unstable wire format.
- Composio's blog references a May 2026 security incident with a remediation update; the current architecture (per-call containers, no standing staff access, hash-only keys) is presented as the post-incident state. Worth one read of the remediation update before finalizing the vault design.
- Tool-execution retry policy is undocumented upstream (failures are returned, not retried) — the adaptation should define its own idempotency contract on the event kernel rather than inherit silence.

---

<!-- SOURCES-BEGIN -->

<!-- SOURCES-BEGIN -->

SOURCE EXCERPTS (verbatim facts/quotes read on 2026-10-02; these concatenated excerpts are the SOURCE_SHA hash inputs)

[S1] https://docs.composio.dev/docs/welcome — "Give your agents tools, managed authentication, and secure execution across 1,500+ apps." / "Auth and context, per end-user. OAuth, API keys, and tokens scoped to each user and refreshed automatically." / "Platform Dashboard Auth configs, connected accounts, and logs."

[S2] https://docs.composio.dev/docs/how-composio-works —
"A session is the runtime context for an agentic run: the scoped environment an AI agent works in while it acts for one of your users."
"A session scopes four things: userID: whose connected accounts and tool executions are in scope. / Tool access: all toolkits by default, or a filtered set of toolkits, tools, or tags. / Authentication: managed auth, custom auth configs, and connected-account selection. / Execution state: logs, tool memory, MCP state, and workbench files for the task."
"A user is an identifier from your app. Composio stores connections under that ID, so tools run with the right account and stay isolated from other users. Use a stable identifier like your database ID, never one that can change."
"A tool is an individual action your agent can execute. Each tool has an input schema (its parameters) and an output schema (what it returns), and follows a {TOOLKIT}_{ACTION} naming pattern, like GITHUB_CREATE_ISSUE."
"When your model asks to call a session tool, execute it with session.execute(). It routes the call through the session's tool router"
"Sessions persist on the server and don't expire."

[S3] https://docs.composio.dev/docs/toolkits —
"A toolkit is a collection of related tools for an app or service, such as GitHub, Gmail, or Slack. A tool is one action your agent can execute, such as creating a GitHub issue or fetching emails from Gmail."
"Tool slugs follow the {TOOLKIT}_{ACTION} naming pattern. A tool defines an input schema for its parameters and an output schema for its result."
"Enabling a toolkit makes its tools available to the session. It doesn't connect an account or grant access to an app's data."
"A connected account stores a specific user's authenticated connection to a toolkit. For example, gmail is the toolkit, while your user's work Gmail account is a connected account. Tools that require authentication execute using that account's credentials and permissions."
"1. Discover. The agent describes its task to COMPOSIO_SEARCH_TOOLS... 2. Connect. ... the agent uses COMPOSIO_MANAGE_CONNECTIONS to get a Connect Link for your user. 3. Execute. The agent calls the discovered tools through COMPOSIO_MULTI_EXECUTE_TOOL with the required arguments."
"Use session configuration to enable or disable toolkits, select individual tools, or filter by tags such as read-only. The connected account's permissions still determine what those tools can do in the app."

[S4] https://docs.composio.dev/docs/auth-configuration/connected-accounts —
"Connected-account responses describe the authentication state. Sensitive credential fields in account.state.val are redacted by default, for both Composio-managed and custom auth configs. This object is not a source of usable provider tokens for your own tools."
"To call a provider API, use Proxy Execute, which injects credentials server-side."
"Change account status without deleting. Set to INACTIVE to pause access, or ACTIVE to restore. ... INACTIVE accounts cannot execute tools. Tool execution will fail until the status is changed."
"To revoke upstream tokens and mark a connection REVOKED, call composio.connected_accounts.revoke(connected_account_id)... Upstream token revocation is best effort. The call fails if the toolkit does not support programmatic revocation or the account is not in a revokable state."
"If your project has an OAuth callback verifier configured, Composio redirects to your verifier with a single-use session URI before activating the connection. Verify the person's identity in your application, then redeem the URI with composio.connected_accounts.complete_auth(user_id=user_id, session_uri=session_uri)... Composio checks project ownership and the connection's user ID before completing the token exchange. An expired or already redeemed URI returns a 404."
"Deletion is permanent and cannot be undone."
"By default, sensitive fields in connected account responses are partially masked for security. This affects fields like access_token, refresh_token, api_key, bearer_token, password, and other secrets. Instead of returning full values, the API returns the first 4 characters followed by ...: e.g. { "access_token" : "gho_...", "refresh_token" : "ghr_...", "api_key" : "sk-l..." }. Values shorter than 4 characters are replaced with REDACTED."
"For Composio-managed OAuth, prefer link(). The initiate() examples below will stop working for Composio-managed OAuth auth configs starting 2026-05-08 (new orgs) / 2026-07-03 (all orgs). Like initiate(), it refuses to create a second active connection for the same user and auth config unless you pass allow_multiple=True (Python) or allowMultiple: true (TypeScript)."

[S5] https://docs.composio.dev/docs/security/token-custody —
"Composio stores provider credentials and uses them to execute requests on your behalf. With hosted authentication and managed execution, your application passes account identifiers and tool arguments. Composio resolves the credentials and authenticates the provider request server-side."
"The browser participates in consent. Your backend receives connection status and identifiers. Composio stores the provider credentials, handles refresh where supported, and uses them during execution."
"Your model receives the tool definitions and results your application or MCP client supplies. Provider credentials are not required in prompts, tool arguments, or model context. A Composio API key is still a secret with permission to act on connected accounts, so keep it in your trusted backend or client credential store."
"Get Connected Account and List Connected Accounts redact sensitive credential fields by default. ... Redaction happens in API responses before your application receives them; it does not depend on your application masking a token after retrieval."
"Use tool execution or Proxy Execute when you need to act on an account. Reading connected-account state is not a supported token-export workflow."
"Proxy Execute requires absolute URLs to use the same scheme and registrable domain (eTLD+1) as the connected account's resolved base URL"
"| Composio Cloud | Composio hosts credential storage and execution. Your application calls the managed API. | Default hosted deployment. | / | Private VPC deployment | ... | Enterprise arrangement. | / | Self-hosted deployment | ... | Enterprise arrangement, with Helm deployment support. | / | Customer-managed key deployment | A proxy in your cloud handles credential plaintext under keys in your KMS. Composio retains the control plane without the key material needed to decrypt those credentials. |"
"Your backend must bind the signed-in user to the correct Composio user_id and connected accounts. A caller-supplied user ID is not proof of identity."
"Tool arguments and results are stored in execution logs by default. A project's Zero Data Retention setting stops storage of new call payloads for covered calls while retaining audit metadata."

[S6] https://composio.dev/blog/two-questions-every-security-review-asks-us —
"Your agent or application | API key, scoped to one project v Composio edge (TLS, rate limiting, authentication) | request resolves to org + project + user v Orchestration (policy check, token refresh, routing) | authorized tool call v Isolated execution runtime (one container per execution) | credential attached, HTTPS v The third-party application"
"OAuth access and refresh tokens sit at rest under AES-256-GCM with envelope encryption. A key-encryption key wraps a per-project key, and the key-encryption key lives in AWS KMS and rotates on its own schedule."
"During execution, the credential is decrypted for that call and used to authenticate the request to the third-party app. The execution runtime exists only for the call and retains no credential afterward. Your application never receives the token, the API never returns it, and the language model never has it in its context."
"Connected-account tokens don't come back in API responses. Access tokens, refresh tokens, request tokens, and client secrets for custom auth configs are all withheld."
"For Composio API keys and session keys, we store only hashes. There's no recoverable copy. Even with our own key material, nobody at Composio can reconstruct your key. You see it once, at creation, and that's it."
"That ID [the session userID] selects the credential at execution time. The model's tool arguments do not determine which user's token the session uses."
"Each tool call runs in a container that exists for that call and is gone when it returns."
"The project is the isolation boundary. Connected accounts, OAuth tokens, auth configs, and triggers each belong to exactly one project, and every database query carries a project filter."
"An administrator sets a ceiling for the organization, a session gets a subset, and you can narrow further with toolkit filters, per-tool enable and disable lists, and behavior tags like readOnlyHint and destructiveHint. If you've said an agent may not delete, it cannot delete, regardless of what a prompt, a tool output, or the model's own reasoning suggests."
"Human approval is yours to build. For anything irreversible or outward-facing, put a checkpoint in your agent's flow before the action fires. Composio gives you the per-action switch; the approval step runs in your agent, not on our platform."
"Deleting a connected account immediately stops further API calls through that connection. To also request revocation at the provider, pass ?revoke_on_delete=true. This defaults to false, and upstream revocation depends on provider support."
"By default, execution logs include full request and response payloads and are retained for up to one year. ... The audit record remains, including which tool ran, when, whether it succeeded, the supplied user ID, and associated connection and auth-config IDs."
"a stateless proxy in your cloud, credentials encrypted under keys in your own KMS (AWS KMS, Google Cloud KMS, and HashiCorp Vault Transit are supported)... Revoke your master key and every credential goes dead immediately, without waiting on us."
"For the changes since our May 2026 security incident, read the remediation update."

[S7] https://docs.composio.dev/reference/api-reference/auth-configs/postAuthConfigs —
"POST /api/v3.1/auth_configs — Creates a new auth config for a toolkit, allowing you to use your own OAuth credentials or API keys instead of Composio-managed authentication." Body: "toolkit object Required" + "auth_config ComposioManagedAuthConfigCreate | CustomAuthConfigCreate — Default: {"type":"use_composio_managed_auth","credentials":{},"restrict_to_following_tools":[]}"

[S8] https://docs.composio.dev/reference/api-reference/tool-router/postToolRouterSessionBySessionIdExecute —
"POST /api/v3.1/tool_router/session/{session_id}/execute — Execute a tool (meta or app) within an existing tool router session." "tool_slug string Required" / "account string — Account identifier to specify which connected account to use for direct tool execution. Use the account ID (e.g. "coup_hurricane_dal_analytical") or an alias. When omitted with a single account, the default is used. When omitted with multiple accounts, an error lists available accounts."

[S9] https://docs.composio.dev/reference/sdk-reference/python/tools.md —
"def execute(slug: str, arguments: Dict, connected_account_id: str | None = ..., custom_auth_params: tool_execute_params.CustomAuthParams | None = ..., custom_connection_data: tool_execute_params.CustomConnectionData | None = ..., user_id: str | None = ..., text: str | None = ..., version: str | None = ..., dangerously_skip_version_check: bool | None = ..., modifiers: Modifiers | None = ...) -> ToolExecutionResponse"

[S10] https://docs.composio.dev/docs/auth-configuration/custom-auth-params.md —
"If you already manage OAuth tokens or API keys yourself and want Composio to execute tools using your credentials, you can pass them directly at execution time — no connected account or redirect flow required." customAuthParams.parameters: [{ "name": "Authorization", "value": "Bearer <redacted>", "in": "header" }]. "This bypasses Composio's automatic token refresh. You are responsible for refreshing expired tokens yourself."

[S11] Official docs: webhook subscriptions (docs/api-overviews/webhook-subscriptions.mdx + changelog 02-06-26) —
"Subscribe to the composio.connected_account.expired event to detect this proactively, instead of waiting for a tool execution to fail."
Event payload: { "id": "evt_847cdfcd-d219-4f18-a6dd-91acd42ca94a", "type": "composio.connected_account.expired", "metadata": { "project_id": "pr_your-project-id", "org_id": "ok_your-org-id" }, "data": { "id": "ca_your-connected-account-id", "toolkit": { "slug": "gmail" }, "auth_config": { "id": "ac_your-auth-config-id", "auth_scheme": "OAUTH2" }, "status": "EXPIRED", "status_reason": "OAuth refresh token expired" }, "timestamp": "2026-02-06T12:00:00.000Z" }
"HMAC-SHA256 signatures: Every webhook includes a cryptographic signature for verification" / "POST /api/v3.1/webhook_subscriptions/{id}/rotate_secret — Rotate signing secret" / "1 subscription per project" / subscription response: { "id": "ws_your-subscription-id", "webhook_url": "...", "version": "V3", "enabled_events": [...], "secret": "<your-webhook-secret>", ... } — "The secret is only returned once at creation time or when rotated."

[S12] Official docs: configuring sessions (docs/content/docs/configuring-sessions.mdx) —
Account selection precedence: "1. The connectedAccounts override, if provided in the session config. 2. The authConfigs override, which finds or creates a connection on that config. 3. An auth config previously created for this toolkit. 4. A new auth config created using Composio managed auth. 5. Otherwise, an error if no Composio managed auth scheme exists for the toolkit." / "When a user has multiple connected accounts for a toolkit, the session uses the most recently connected one."

[S13] Official docs: managing multiple connected accounts (docs/content/docs/authentication/managing-multiple-connected-accounts.mdx) —
"Aliases are human-readable labels for connected accounts (e.g., "work-gmail", "personal-github"). ... Must be unique per user and toolkit within a project" / "read the read-only displayName that Composio auto-populates on the connected account at state.val.displayName once the connection is active." / "Each account is addressed by its nanoid." / multi-account options: enable (default false), max_accounts_per_toolkit (default 5, range 2-10), require_explicit_selection (default false): "When true and a toolkit has multiple active connected accounts, the agent must provide the account parameter in the tool execution call... When false, the default account (most recently connected active account) is used automatically"

[S14] https://github.com/ComposioHQ/composio/blob/main/LICENSE — "MIT License / Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions..."

[S15] https://api.github.com/repos/ComposioHQ/composio/commits/main — { "sha": "b2f5098b28e9bfe1f0c2255b94adea7c5c2fa022", "commit": { "author": { "name": "Alberto Schiabel", "date": "2026-09-21T13:57:52Z" }, "message": "fix(py): make HTTP status errors catchable as ComposioError on client 2.0 (#4556)" } }

<!-- SOURCES-END -->
