# SEC4 — Unauthenticated Endpoint Inventory

**Sprint:** Constitutional Convergence Sprint (fleet pass SEC4)
**Scope:** Complete unauthenticated-endpoint inventory across BOTH repos
**Primary base:** `/home/nolan/projects/ping-constitutional` at `a69bb68f` (audited head)
**Core consult-only base:** `/home/nolan/ping` on `refactor/runtime-authority-convergence` at `cc6856c3b`
**Date:** 2026-09-24 UTC (analysis performed ~00:00–01:30 UTC; local evening 2026-09-23 MDT)
**READ-ONLY; COMMITS CREATED: NONE; PROPOSE ONLY.**
**STATIC ANALYSIS ONLY** — no exploit execution, no live mutation, no credential use.
**Secrets:** metadata only, never values.
**History:** CLASSIFY — never delete.

## Operating picture this inventory rests on

- The site actually served on `:3100` is **NOT** the audited head. It is `/home/nolan/projects/ping` at `e48ef710` (dirty files). Audited head `a69bb68f` is two commits ahead. Security-relevant route files differ between the two (details per-row below).
- Canonical gateway on `:8080` (Oracle `ping-gateway:devin-boundary2`, CMD `node gateway/server.js` → `GatewayRuntime`) is healthy but has zero clients. Deployed container bytes ≠ worktree source: live capture 2026-09-16/17 shows `POST /events` returning 401/403 for malformed-namespace/unauthenticated calls, but the worktree `gateway/routes/events.js` has no `authorizeNamespace` call. Which `POST /events` copy runs in the Oracle container is an open case (B1, BLOCKED). Every core conclusion below therefore carries an explicit source-declared vs runtime-reachable distinction.
- `PING_GATEWAY_BASE_URL` is unset on all three live Next servers → adapter PING/practice routes are transport-dark.
- FYD social/journal routes default to phantom `127.0.0.1:18199` where nothing listens → transport-dark.
- Public dump-backed routes still render and are runtime-reachable on `:3100`.
- `src/middleware.ts:11-18` performs no auth (only sets `x-pathname`). All adapter authorization is route-local.
- Core gateway: no global auth middleware anywhere. `asyncHandler` (`gateway/route_middleware.js:19-46`) is logging + error formatting only. `_setupMiddleware` (`gateway/api_controller.js:31-46`) is `express.json()` + wildcard CORS. Bootstrap grep found zero bearer/API-key/auth middleware. `connectors.js:209-214` mentions `api_key` only as connector config type, not as HTTP auth.

## Column key

- **AUTH CHECK** — what the route does to authenticate (or that it does nothing).
- **CAPABILITY** — the authority/state the route can touch if called.
- **REACHABILITY** — route declared vs runtime-reachable: LIVE (served and reachable tonight), TRANSPORT-DARK (declared but downstream dependency unavailable tonight), CONFIG-GATED (gated by env/Host flag that is weak or spoofable), INTENDED-PUBLIC (appears intended as public), WORKTREE-ONLY (declared in source; deployed container bytes unknown, B1 open).
- **PROOF LEVEL** — STATIC (line-evidence code review), STATIC+LIVE (line evidence + observed serving/config on 2026-09-23/24).
- **CLASSIFICATION** — LIVE / TRANSPORT-DARK / CONFIG-GATED / INTENDED-PUBLIC / INTENDED-ANONYMOUS / WORKTREE-ONLY-UNKNOWN.
- **BROKEN BOUNDARY** — the constitutional/architectural boundary the finding breaks.
- **AFFECTS AGENTS** — who can be harmed or impersonated.

Severity uses: Critical / High / Medium / Low. Rule-of-one note: several findings below exist *because* two implementations of one concern coexist (adapter local-viewer store vs gateway journal; demo actor vs real identity; dump-backed projection vs live objects).

---

## Adapter domain — FYD trust mutations (the sharp end)

### ADAPTER-1 — Kit webhook event injection

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/kit/webhook` |
| AUTH CHECK | None. No signature, shared-secret, HMAC, or Authorization check anywhere in the route. |
| CAPABILITY | `logEvent` (event journal) with subscriber PII; Kit-side event acceptance. |
| EVIDENCE | `src/app/api/kit/webhook/route.ts:20-62`: any JSON containing `event` and `subscriber` is accepted; lines 37-48 call `logEvent` with subscriber email, ID, first name, state, and event payload. `KIT_WEBHOOK_SECRET` is not consulted. GET lines 65-66 advertises the endpoint as active. |
| EXPLOIT CHAIN | (static, not executed) Craft JSON `{event:<mapped-name>, subscriber:{email,id,first_name}}` → POST → forged Kit event persisted to event log with arbitrary subscriber PII → downstream automations/consumers treat as genuine Kit event. |
| REACHABILITY | LIVE on `:3100` (served checkout contains this file; Next route, no dependency on dark gateway). |
| SEVERITY | High |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | LIVE |
| BROKEN BOUNDARY | External-source trust: an unverified network caller can write attributed events into the journal the site treats as Kit-originated. |
| AFFECTS AGENTS | Any consumer of the event log / subscriber automations; data consumers attributing forged events to real subscribers. |

### ADAPTER-2 — Resource download: arbitrary subscriber tagging + PII logging + reflected URL

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/resources/download` |
| AUTH CHECK | None. No email-format validation; no resource URL allowlist. |
| CAPABILITY | Kit subscriber lookup + tag mutation; event journal PII logging. |
| EVIDENCE | `src/app/api/resources/download/route.ts:5-55`: lines 18-23 look up arbitrary `email` in Kit and tag it; lines 28-43 log email + caller-supplied resource metadata; lines 45-48 return caller-supplied `resourceUrl` as `downloadUrl`. |
| EXPLOIT CHAIN | (static) POST `{email:<anyone>, resourceUrl:<attacker URL>}` → victim's email gets tagged in Kit without their involvement; response redirects/navigates the user to an attacker-controlled URL. |
| REACHABILITY | LIVE on `:3100`. External Kit mutation depends on runtime Kit config (not yet established — recorded as config-dependent). |
| SEVERITY | High |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | LIVE (downstream Kit write config-dependent) |
| BROKEN BOUNDARY | External-service mutation + PII write + open redirect surface, all from one unauthenticated call. |
| AFFECTS AGENTS | Any subscriber (tagged without consent); users following the reflected `downloadUrl`. |

### ADAPTER-3 — Served claim verification: unauthenticated persisted claim writes

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/fyd/claims/[resourceId]/verify` |
| AUTH CHECK | **None in the served checkout.** The demo env/Host gate (audited head `claims/[resourceId]/verify/route.ts:43-47`) is ABSENT in served `/home/nolan/projects/ping` `e48ef710`. No session, identity, CSRF, env flag, Host check, or capability check. |
| CAPABILITY | `verifyControl` + `writeClaim`: persisted claim verification records with self-asserted proof. |
| EVIDENCE | Served `claims/[resourceId]/verify/route.ts:32-105`: accepts `operator-attestation`; reads the claim at line 77; creates a self-asserted proof at lines 85-94; calls `verifyControl` and `writeClaim` at lines 95-96. Compare audited head where lines 43-47 add the demo env/Host gate. |
| EXPLOIT CHAIN | (static) POST `{attestation:"operator-attestation"}` for any existing claim → server mints a proof for the attestation → `writeClaim` persists verification → claim displays as verified with no human operator involved. |
| REACHABILITY | LIVE on `:3100` — statically runtime-reachable through the running Next server; mutates claim state if the target claim exists. No request was sent (static only). |
| SEVERITY | Critical |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | LIVE |
| BROKEN BOUNDARY | Verification = a trust assertion; here it is self-mintable by any network caller. The audited head's Host/env gate is a spoofable fig leaf on top (see ADAPTER-5), but the served code does not even have that. |
| AFFECTS AGENTS | Every consumer of claim state (Ask FYD evidence, projections, owner dashboards); the "verified" badge becomes meaningless. |

### ADAPTER-4 — Served owner overrides: seeded demo actor reaches owner mutation

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST` (propose/approve) `/api/fyd/objects/[objectId]/overrides` |
| AUTH CHECK | **None in the served checkout.** The demo env/Host gate (audited head `objects/[objectId]/overrides/route.ts:116-120`) is ABSENT. |
| CAPABILITY | Owner object mutation (override propose/approve) via `owner-context`. |
| EVIDENCE | Served `objects/[objectId]/overrides/route.ts:123+`: no demo env/Host gate before propose/approve; lines 137-139 call `createOwnerContext(objectId)`; `src/fyd/owner-mode/owner-context.ts:93-97` unconditionally returns `DemoOwnerContext.forTenant(tenantId)` — a seeded demo actor, not an authenticated principal. Approval calls `ctx.evaluateCapability(objectId, "owner.correct-fact")` (~lines 317-340). Exact persisted write line not yet captured — recorded as a residual gap. |
| EXPLOIT CHAIN | (static) POST override proposal → server-side demo actor evaluates `owner.correct-fact` capability → approve path persists owner override. The "capability gate" is evaluated against a hard-coded demo identity, so it is not authentication. |
| REACHABILITY | LIVE on `:3100` (Next route, local override store; no dark-gateway dependency). |
| SEVERITY | Critical |
| PROOF LEVEL | STATIC+LIVE (final persisted-write line to be confirmed) |
| CLASSIFICATION | LIVE |
| BROKEN BOUNDARY | Owner authority: a seeded demo actor stands in for the business owner with no principal binding. Per the global map, this is the demo-mode/real-identity split with no enforcement. |
| AFFECTS AGENTS | Business owners (their object truth can be rewritten); Ask FYD (serves overridden facts); any projection consumer. |

### ADAPTER-5 — Audited-head owner gates: Host/env check is client-spoofable

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/fyd/customize`, `POST /api/fyd/objects/[objectId]/overrides`, `POST /api/fyd/claims/[resourceId]/verify` (audited head `a69bb68f` only) |
| AUTH CHECK | Demo env flag (`NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`) + `isPrivateHost(req.headers.get("host"))`. |
| CAPABILITY | Same as ADAPTER-3/ADAPTER-4 plus customize directive writes (approver labels, spec digests). |
| EVIDENCE | `customize/route.ts:52-55`; `objects/[objectId]/overrides/route.ts:116-120`; `claims/[resourceId]/verify/route.ts:43-47`; `src/fyd/owner-mode/gate.ts:43-66` accepts localhost, RFC1918, Tailscale, link-local, ULA, `.local/.internal/.lan`. `Host` is a client-controlled header in direct/self-hosted deployments. |
| EXPLOIT CHAIN | (static) Deploy (or reach) the audited head directly, send any `Host: localhost`-style private value → gate passes → same mutations as ADAPTER-3/ADAPTER-4. |
| REACHABILITY | Not reachable tonight (`:3100` serves the older checkout). Would be LIVE if audited head is deployed. |
| SEVERITY | High |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | CONFIG-GATED (weak gate) |
| BROKEN BOUNDARY | Authentication-by-header: `Host` is not an identity. |
| AFFECTS AGENTS | Same as ADAPTER-3/ADAPTER-4 once deployed. |

### ADAPTER-6 — Claim/release: demo-env-only identity, no Host check even on audited head

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/fyd/claims/[resourceId]/claim`, `POST /api/fyd/claims/[resourceId]/release` |
| AUTH CHECK | `resolveClaimIdentity()` checks only `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`, then returns the same hard-coded demo actor. No Host check. |
| CAPABILITY | Claim record creation (auto-creates an observed record from caller-supplied `resourceId` + optional `sourceUrl`) and release. |
| EVIDENCE | `routes-batch3.txt`: claim can auto-create an observed record from caller-supplied `resourceId` and optional `sourceUrl`, then persist it; release checks only that the stored actor ID matches the same hard-coded demo actor. |
| EXPLOIT CHAIN | (static) With demo mode on (default in dev), POST claim for any `resourceId` → persisted claim record attributed to the demo actor; release requires only the same hard-coded actor — any caller qualifies. |
| REACHABILITY | LIVE on `:3100`. |
| SEVERITY | High |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | LIVE |
| BROKEN BOUNDARY | Attribution without identity: claims are persisted against a constant actor constant, not a caller. |
| AFFECTS AGENTS | Claim consumers; the "observed" record provenance is caller-fabricated. |

---

## Adapter domain — practice identity lane (unsigned cookie, gateway-dark)

### ADAPTER-7 — Open practice identity creation

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/practice/identities` (also `GET /api/practice/identities` lists them) |
| AUTH CHECK | None. Creates a gateway identity and sets the unsigned practice cookie. |
| CAPABILITY | Gateway identity creation (`getPingObjectReader`); practice session cookie mint. |
| EVIDENCE | `routes-batch1.txt` `practice/identities/route.ts:1-12+`: BFF list/create practice identities; `setPracticeIdentityId` from `@/lib/ping/session`. |
| EXPLOIT CHAIN | (static) POST → new identity minted, unsigned cookie set → caller is now "that identity" for all practice writes below. |
| REACHABILITY | TRANSPORT-DARK: `PING_GATEWAY_BASE_URL` unset on all three Next servers → `GatewayNotConfiguredError` downstream. Route is declared and served. |
| SEVERITY | Medium (would be High if transport returns: open identity minting + self-issued session token) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | TRANSPORT-DARK |
| BROKEN BOUNDARY | Session binding: the cookie is unsigned and self-selected (see ADAPTER-8). |
| AFFECTS AGENTS | Any practice user (identity takeover by cookie value). |

### ADAPTER-8 — Practice session: select ANY existing identity

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/practice/session` |
| AUTH CHECK | None. Lets anyone select any existing identity returned by the gateway, then sets the unsigned cookie. |
| CAPABILITY | Practice session impersonation of any practice identity. |
| EVIDENCE | `routes-batch1.txt` practice session route: selects among gateway-returned identities; `setPracticeIdentityId`. |
| EXPLOIT CHAIN | (static) GET identities → POST session with chosen identity id → unsigned cookie now names that identity → subsequent bio/follow/like writes (below) execute as them. |
| REACHABILITY | TRANSPORT-DARK (same gateway dependency). |
| SEVERITY | Medium (High if transport returns) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | TRANSPORT-DARK |
| BROKEN BOUNDARY | Authentication: possession of an identity id = that identity. |
| AFFECTS AGENTS | All practice identities. |

### ADAPTER-9 — Practice writes trust the unsigned cookie

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `PATCH /api/practice/bio`, `POST/DELETE /api/practice/follow`, `POST/DELETE /api/practice/like` (representative; full set in `routes-batch1.txt`) |
| AUTH CHECK | None beyond the unsigned practice cookie. |
| CAPABILITY | Bio/follow/like writes attributed to the cookie-selected identity. |
| EVIDENCE | `routes-batch1.txt`: practice write routes trust `getPracticeIdentityId()` from the unsigned cookie. |
| EXPLOIT CHAIN | (static) Set cookie to any identity (ADAPTER-7/8) → write bio/follows/likes as them. |
| REACHABILITY | TRANSPORT-DARK (gateway). |
| SEVERITY | Medium (High if transport returns) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | TRANSPORT-DARK |
| BROKEN BOUNDARY | Write attribution without authentication. |
| AFFECTS AGENTS | Practice identity holders. |

---

## Adapter domain — FYD social lane (no caller-to-identity binding, transport-dark)

### ADAPTER-10 — Dev identity mint

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/fyd/social/identity` |
| AUTH CHECK | None. Mints a dev identity. |
| CAPABILITY | Dev identity creation whose key the server-side lane custodies/signs with. |
| EVIDENCE | `routes-batch2.txt`: `POST /api/fyd/social/identity` mints a dev identity without auth. |
| EXPLOIT CHAIN | (static) POST → dev identity minted → if transport (`127.0.0.1:18199`) is restored, the server-side dev-key custodian signs as any valid dev identity whose key is available/generated by the lane (exact key-generation behavior = residual gap, flagged for the signing-key custody review). |
| REACHABILITY | TRANSPORT-DARK (`:18199` phantom). |
| SEVERITY | High (latent) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | TRANSPORT-DARK |
| BROKEN BOUNDARY | Key custody: the server holds signing keys for identities it mints for anonymous callers. |
| AFFECTS AGENTS | Any dev identity (impersonation once transport returns). |

### ADAPTER-11 — Social post with caller-supplied identityId

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/fyd/social/post` |
| AUTH CHECK | None. Accepts caller-supplied `identityId`. No caller-to-identity binding. |
| CAPABILITY | Social post attribution to any identity. |
| EVIDENCE | `routes-batch2.txt`: post route accepts caller-supplied `identityId`. |
| EXPLOIT CHAIN | (static) POST `{identityId:<victim>, ...}` → post attributed to victim's identity once transport returns. |
| REACHABILITY | TRANSPORT-DARK (`:18199`). |
| SEVERITY | High (latent) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | TRANSPORT-DARK |
| BROKEN BOUNDARY | Attribution without authentication — same pattern as ADAPTER-6. |
| AFFECTS AGENTS | Any social identity. |

### ADAPTER-12 — Social follow with caller-supplied actor/target

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/fyd/social/follow`, `DELETE /api/fyd/social/follow` |
| AUTH CHECK | None. Accepts caller-supplied `actorId` and `targetId`. |
| CAPABILITY | Follow-graph mutation as any actor. |
| EVIDENCE | `routes-batch2.txt`. |
| EXPLOIT CHAIN | (static) POST `{actorId:<victim>, targetId:<anyone>}` → victim follows anyone; DELETE reverses. |
| REACHABILITY | TRANSPORT-DARK (`:18199`). |
| SEVERITY | Medium (latent) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | TRANSPORT-DARK |
| BROKEN BOUNDARY | Relationship mutation without principal binding. |
| AFFECTS AGENTS | Social graph participants. |

---

## Adapter domain — local shared state, newsletter, diagnostics

### ADAPTER-13 — Local FYD like/follow shared-store mutation

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/fyd/like`, `POST /api/fyd/follow` |
| AUTH CHECK | None. Mutates one shared local-viewer store keyed only by `objectId` + action. |
| CAPABILITY | Shared like/follow state (gitignored `data/fyd-likes/local.json` per the authority map). |
| EVIDENCE | `routes-batch2.txt`. |
| EXPLOIT CHAIN | (static) POST `{objectId, action}` → shared store mutated for all viewers. Intended demo scope does not change the fact that any caller can mutate shared local state. |
| REACHABILITY | LIVE on `:3100` (no dark-gateway dependency). |
| SEVERITY | Medium (demo scope; integrity of displayed counts) |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | LIVE |
| BROKEN BOUNDARY | Shared mutable state with no writer identity (rule-of-one: local-viewer store vs journal). |
| AFFECTS AGENTS | All site viewers (counts/displayed state). |

### ADAPTER-14 — Newsletter subscribe: external mutation + PII log, no abuse controls

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/newsletter/subscribe` |
| AUTH CHECK | None (email-shape validation only). |
| CAPABILITY | Kit subscriber sync (external mutation) + PII event log; returns subscriber data. |
| EVIDENCE | `routes-batch1.txt` `newsletter/subscribe/route.ts:5-10`: email/firstName/source parsed; `syncNewsletterSubscriber`, then `logEvent` with PII. External Kit mutation depends on runtime config (not yet established). |
| EXPLOIT CHAIN | (static) POST `{email:<victim>}` in bulk → victim subscribed/tagged without consent; PII logged; endpoint usable as an email-bombing / list-poisoning oracle. |
| REACHABILITY | LIVE on `:3100` (downstream Kit write config-dependent). |
| SEVERITY | Medium |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | LIVE (likely intended-public, abuse-capable; rate limiting unconfirmed) |
| BROKEN BOUNDARY | Third-party mutation + PII write with no caller verification (no double opt-in observed at this layer). |
| AFFECTS AGENTS | Arbitrary email owners (subscribed without consent). |

### ADAPTER-15 — Diagnostics endpoint with predictable default credential

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `GET/POST /api/diagnostics/sharp` (temporary diagnostic) |
| AUTH CHECK | Conditional: `authHeader !== \`Bearer ${process.env.DIAGNOSTIC_SECRET || 'dev-diagnostic-secret'}\`` (strict `!==`, `route.ts:140-143`). If the env secret is absent, the credential is the public, predictable string `dev-diagnostic-secret`. |
| CAPABILITY | Runtime diagnostics + error details on failure. |
| EVIDENCE | `routes-batch8.txt` `diagnostics/sharp/route.ts:140-143`: `const expectedAuth = \`Bearer ${process.env.DIAGNOSTIC_SECRET || 'dev-diagnostic-secret'}\``. Header comments say "TEMPORARY ... remove after Sharp incident is resolved" and "Requires same authentication as /api/drive/ingest". (Note: the earlier sweep's "loose `!=`" description is inaccurate for current code — it is strict `!==`.) |
| EXPLOIT CHAIN | (static) If `DIAGNOSTIC_SECRET` is unset in the deployed env: send `Authorization: Bearer dev-diagnostic-secret` → diagnostics + error internals. |
| REACHABILITY | LIVE on `:3100` if served without the env secret (env value not inspected — secrets metadata only). |
| SEVERITY | Medium |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | LIVE (conditional auth; predictable default) |
| BROKEN BOUNDARY | Fail-open default credential on a "temporary" endpoint that was never removed. |
| AFFECTS AGENTS | Operators (info disclosure aids further attack). |

### ADAPTER-16 — Environment capability fingerprinting

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `GET /api/health/authority` |
| AUTH CHECK | None. |
| CAPABILITY | Presence/absence metadata for Redis, encryption, Google OAuth, Workbench password, Blob token, `VERCEL_ENV`. Values are booleans only — no secret values exposed. |
| EVIDENCE | `routes-batch2.txt` `health/authority/route.ts:21-68`: `token_present: !!process.env.KV_REST_API_TOKEN`, `password_present: !!process.env.WORKBENCH_PASSWORD`, etc.; `vercel_env: process.env.VERCEL_ENV || 'unknown'`. |
| EXPLOIT CHAIN | (static) GET → learn which backends are configured → target follow-on attacks (e.g., whether the predictable `dev-diagnostic-secret` fallback in ADAPTER-15 is likely live). |
| REACHABILITY | LIVE on `:3100`. |
| SEVERITY | Low |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | LIVE |
| BROKEN BOUNDARY | Recon surface: unauthenticated callers get the deployment's capability map. |
| AFFECTS AGENTS | Operators (aids attack planning). |

### ADAPTER-17 — Anonymous onboarding URL fetch (SSRF surface, spoofable rate-limit identity)

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/fyd/onboarding/preview` |
| AUTH CHECK | None (intentionally anonymous). Client identity = hash of the first `x-forwarded-for` value — client-spoofable. |
| CAPABILITY | Server-side fetch of arbitrary caller-supplied URLs via `fyd/net`. |
| EVIDENCE | Route accepts arbitrary URLs and delegates SSRF/budgets/rate limiting to `fyd/net` and `generateAnonymousPreview`. `fyd/net` SSRF/rate-limit implementation not yet read — recorded as a residual verification gap. |
| EXPLOIT CHAIN | (static, unverified) POST `{url:<internal target>}` → server fetches it; rotate `X-Forwarded-For` to defeat the hashed-client rate limit. Actual SSRF boundary depends on unread `fyd/net` code. |
| REACHABILITY | LIVE on `:3100`. |
| SEVERITY | Medium (High if `fyd/net` lacks SSRF controls — unverified) |
| PROOF LEVEL | STATIC (partial; `fyd/net` unread) |
| CLASSIFICATION | LIVE (intended-anonymous; controls unverified) |
| BROKEN BOUNDARY | Server-side request forgery surface + rate-limit identity derived from a spoofable header. |
| AFFECTS AGENTS | Internal network/services if SSRF controls are absent; the onboarding pipeline if poisoned. |

### ADAPTER-18 — Anonymous ask routes (mode:"owner" safely reduced)

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `POST /api/fyd/ask`, `POST /api/fyd/ask/[siteId]` |
| AUTH CHECK | None (anonymous visitor queries). `mode:"owner"` is explicitly reduced to visitor-safe behavior and grants nothing. |
| CAPABILITY | Visitor-safe Q&A over the journal-overlay pipeline. |
| EVIDENCE | `routes-batch9.txt`: anonymous; owner mode reduced. Journal-overlay dependency is dark tonight (`:18199`/gateway). |
| EXPLOIT CHAIN | None identified statically — would require the ask pipeline to expose non-public objects (unverified; adjacent gap). |
| REACHABILITY | Declared; pipeline dependency dark. |
| SEVERITY | Low |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | INTENDED-ANONYMOUS |
| BROKEN BOUNDARY | None found (watch item, not a finding). |
| AFFECTS AGENTS | None identified. |

---

## Adapter domain — public reads and misc

### ADAPTER-19 — Public projection/object/media/claim reads

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `GET /api/fyd/projection`, `GET /api/fyd/objects/[objectId]`, `GET /api/fyd/media`, `GET /api/fyd/claims/[resourceId]`, `GET /api/fyd/customize?view=inspect` |
| AUTH CHECK | None. |
| CAPABILITY | Raw dump-backed graph + metadata; public object projection + owner action history; full media provenance (original source URL, rights/source metadata); complete claim records; customize directives (approver labels, timestamps, event IDs, spec digests). |
| EVIDENCE | Route bodies in `routes-batch2/3/7.txt`. |
| EXPLOIT CHAIN | None — reads. Privacy question is whether payloads are intentionally public-safe or leak owner/internal info (unresolved; adjacent gap). |
| REACHABILITY | LIVE on `:3100` (dump-backed; render tonight). |
| SEVERITY | Low (pending payload-privacy review) |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | INTENDED-PUBLIC (to be confirmed per-payload) |
| BROKEN BOUNDARY | None confirmed; watch item. |
| AFFECTS AGENTS | Business owners (if internal metadata leaks). |

### ADAPTER-20 — Wildcard CORS on FYD circle route

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `/api/fyd/circle` |
| AUTH CHECK | N/A — intentionally enables wildcard CORS (`Access-Control-Allow-Origin: *`). |
| CAPABILITY | Cross-origin readability of its responses by any website. |
| EVIDENCE | Route source per prior passes; captured in sweep notes. |
| EXPLOIT CHAIN | Any site can `fetch()` the endpoint and read responses in the victim's browser. Impact depends on payload privacy (ties to ADAPTER-19 review). |
| REACHABILITY | LIVE on `:3100`. |
| SEVERITY | Low |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | LIVE |
| BROKEN BOUNDARY | Origin isolation for read endpoints. |
| AFFECTS AGENTS | Site visitors (cross-origin data readability). |

### ADAPTER-21 — Health timestamp

| Field | Value |
|---|---|
| DOMAIN | adapter |
| ENDPOINT | `GET /api/health` |
| AUTH CHECK | None. Returns status + current timestamp. |
| CAPABILITY | Liveness signal. |
| EVIDENCE | `routes-batch2.txt`. |
| EXPLOIT CHAIN | None. |
| REACHABILITY | LIVE. |
| SEVERITY | Informational |
| PROOF LEVEL | STATIC+LIVE |
| CLASSIFICATION | INTENDED-PUBLIC |
| BROKEN BOUNDARY | None. |
| AFFECTS AGENTS | None. |

---

## Core domain (consult-only) — no HTTP-layer auth anywhere

> These rows are source-declared behavior on `refactor/runtime-authority-convergence` (`cc6856c3b`). The live `:8080` container (`ping-gateway:devin-boundary2`, CMD `node gateway/server.js` → `GatewayRuntime`) serves from unknown deployed bytes — live capture 2026-09-16/17 shows `POST /events` 401/403 behavior that NEITHER worktree copy explains. Core is live: no writes and no process touches were made.

### CORE-1 — `POST /events`: canonical-spine branch has no namespace auth in worktree

| Field | Value |
|---|---|
| DOMAIN | core |
| ENDPOINT | `POST /events` |
| AUTH CHECK | Two branches: (a) BFF-envelope branch — real Ed25519 signature verification (`social_ingest_adapter.js:116-136`, fail-closed) against a signer identity resolved from the journal (`resolveIdentityByPublicKey`, lines 140-152, throws `SIGNER_UNKNOWN` if the key is not bound to a `ping.identity@1` identity). (b) Canonical-spine branch (`{event_type, aggregate_id, aggregate_type, event_data}`) — goes DIRECTLY to `eventRuntime.emit()` (lines 113-126) with NO signature check and NO `authorizeNamespace` call. |
| CAPABILITY | Direct journal writes (`ping_events`) — event injection into canonical truth. |
| EVIDENCE | `gateway/routes/events.js:71-127`. |
| EXPLOIT CHAIN | (static) POST canonical-spine JSON → `eventRuntime.emit` → event persisted. Chain for the BFF branch is longer: `POST /identities` (CORE-2, open) → mint identity binding attacker's key → sign envelope → post. |
| REACHABILITY | WORKTREE-ONLY-UNKNOWN — the 2026-09-16/17 live capture shows malformed-namespace POST → 403 and unauthenticated → 401, which the worktree copy cannot produce. Deployed bytes unknown (open case B1). |
| SEVERITY | High (pending B1 resolution) |
| PROOF LEVEL | STATIC (worktree) |
| CLASSIFICATION | WORKTREE-ONLY-UNKNOWN |
| BROKEN BOUNDARY | Canonical truth: if the deployed copy matches the worktree, anyone can write the journal directly, bypassing the namespace authorization that `POST /ingest` enforces. |
| AFFECTS AGENTS | Every downstream consumer of `ping_events` (projections, Ask, replay, witnesses). |

### CORE-2 — `POST /identities`: open identity minting

| Field | Value |
|---|---|
| DOMAIN | core |
| ENDPOINT | `POST /identities` |
| AUTH CHECK | None. Validates displayName/handle/bio shape and ed25519 key format only (`identities.js:101-127`). |
| CAPABILITY | Mints `ping.identity@1` `OBJECT_CREATED` binding an attacker-controlled public key — the exact prerequisite the BFF-envelope signature path trusts (`SIGNER_UNKNOWN` resolution). |
| EVIDENCE | `gateway/routes/identities.js:95-150`. |
| EXPLOIT CHAIN | (static) POST identity with own keypair → identity idempotent-registered → sign BFF envelopes → `POST /events` BFF branch accepts them as that identity. |
| REACHABILITY | WORKTREE-ONLY-UNKNOWN (same deployed-bytes caveat). |
| SEVERITY | High (as an enabler; Medium alone) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | WORKTREE-ONLY-UNKNOWN |
| BROKEN BOUNDARY | Identity issuance: registration is open, and registration is the trust root for the signed-ingest path. |
| AFFECTS AGENTS | Ingest-path consumers (forged-but-validly-signed events attributed to attacker identities). |

### CORE-3 — `POST /ingest`: namespace-authorized in worktree (the contrast case)

| Field | Value |
|---|---|
| DOMAIN | core |
| ENDPOINT | `POST /ingest` |
| AUTH CHECK | `canonicalizationService.authorizeNamespace(body.source, body.namespace)` at `ingest.js:48`, then `canonicalizeAndEmit` (line 53). |
| CAPABILITY | Canonical ingest with namespace authorization. |
| EVIDENCE | `gateway/routes/ingest.js:31-53`. Note: `ingest.js` is NOT mounted in `GatewayRuntime`'s boot list — no route module named ingest is required there, consistent with "no /ingest mounted in runtime" observation. |
| EXPLOIT CHAIN | None identified in worktree — this is the route that does it right. |
| REACHABILITY | WORKTREE-ONLY (not mounted in the booted runtime). |
| SEVERITY | — (control case) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | WORKTREE-ONLY |
| BROKEN BOUNDARY | None — but its ABSENCE from the boot while `events.js` IS mounted sharpens CORE-1. |
| AFFECTS AGENTS | — |

### CORE-4 — Unauthenticated worker-marker and state-mutation endpoints

| Field | Value |
|---|---|
| DOMAIN | core |
| ENDPOINT | `POST /events/processed`, `POST /events/failed`, `POST /canonical-events/:id/processed`, `POST /canonical-events/:id/failed`, `POST /repository/objects`, `DELETE /repository/objects/:id`, `POST /deployments`, `PUT /deployments/:id/status`, `POST /deployments/:id/{complete,fail,rollback}`, `POST /projects`, `PUT /projects/:id`, `POST /projects/:id/artifacts`, `POST /runtime`, `PUT /runtime/tenant/:tenantId/type/:type/name/:name/status`, `POST /runtime/.../heartbeat`, `DELETE /runtime/...`, `POST /tenants`, `PUT /tenants/:id`, `DELETE /tenants/:id`, `POST /reviews/sync`, `POST /reviews/:id/reply` |
| AUTH CHECK | None at the HTTP layer in any of these route modules (verified: no auth middleware, `asyncHandler` is logging-only). |
| CAPABILITY | Worker processing markers (can mark events processed/failed, poisoning exactly-once semantics); repository object create/delete; deployment lifecycle transitions including rollback; project/artifact writes; runtime registration/status/heartbeat/deregistration; tenant create/update/delete; review sync and replies. |
| EVIDENCE | `gateway/routes/events.js:129-143`; `canonical_events.js:19,78,85`; `repository.js:13,37`; `deployments.js:21,61,69,77,85`; `projects.js:20,25,61`; `runtime.js:20,71,79,86`; `tenants.js:19,58,66`; `reviews.js:18,81`. |
| EXPLOIT CHAIN | (static) POST `/events/processed` with any `event_id` → worker pipeline believes it done; POST `/deployments/:id/rollback` → deployment state regression; DELETE `/tenants/:id` → tenant removal. |
| REACHABILITY | WORKTREE-ONLY-UNKNOWN (mounted in `GatewayRuntime` boot; deployed bytes unknown per B1). The `:8080` container is healthy with zero clients, so no legitimate traffic would mask abuse. |
| SEVERITY | High (aggregate) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | WORKTREE-ONLY-UNKNOWN |
| BROKEN BOUNDARY | Every one of these is a privileged operation (deployment rollback, tenant deletion, worker markers) with no principal. |
| AFFECTS AGENTS | Workers (poisoned markers), operators (rogue deployments/rollbacks), tenants (deletion), reviewers' customers (forged review replies). |

### CORE-5 — Unauthenticated reads (journal, system, tenants, ops)

| Field | Value |
|---|---|
| DOMAIN | core |
| ENDPOINT | `GET /events*`, `GET /canonical-events*`, `GET /tenants*`, `GET /system/*` (incl. `/logs/sync.log`, `/logs/audit.json`), `GET /ops/*`, `GET /health` |
| AUTH CHECK | None. |
| CAPABILITY | Full journal reads, tenant enumeration, system state, sync/audit logs. |
| EVIDENCE | Route tables in `core-gateway.txt`; `system.js:21-61`; `ops.js:15-110`. |
| EXPLOIT CHAIN | None — reads. |
| REACHABILITY | WORKTREE-ONLY-UNKNOWN; `:8080` healthy. |
| SEVERITY | Medium (journal/log exposure) |
| PROOF LEVEL | STATIC |
| CLASSIFICATION | WORKTREE-ONLY-UNKNOWN |
| BROKEN BOUNDARY | Journal confidentiality: `EventReadAuthority` exists as a concept but nothing gates the HTTP readers. |
| AFFECTS AGENTS | All principals whose data is in the journal. |

---

## Proposed remediations (WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT)

**P1 — Close the served trust mutations (ADAPTER-3, ADAPTER-4).**
WHY: Anyone on the network can mint "verified" claims and owner overrides on the live site.
EVIDENCE: Served `claims/[resourceId]/verify/route.ts:32-105` and `objects/[objectId]/overrides/route.ts:123+` contain no gate; audited head already has the intended gate shape.
MINIMUM CHANGE: Backport the audited-head gate (demo env flag + private-host check) to the served checkout, and replace the `Host`-header check with a check on the connection's remote address (not a client-controlled header). No new auth system — reuse the existing `gate.ts`/`isPrivateHost` shape, keyed to socket info.
TEST: `curl` POST verify/override with `Host: localhost` from a non-loopback source → expect 403; from loopback with demo flag → allowed; unit test asserting gate runs before `writeClaim`.
RESULT: Served mutations require the demo environment; spoofing the gate requires network position, not a header.

**P2 — Webhook + resource download (ADAPTER-1, ADAPTER-2).**
WHY: Forged Kit events and arbitrary subscriber tagging from one unauthenticated call each.
EVIDENCE: `kit/webhook/route.ts:20-62`; `resources/download/route.ts:5-55`.
MINIMUM CHANGE: Require `KIT_WEBHOOK_SECRET` HMAC verification on the webhook (fail closed when unset — do not accept unsigned); on download, validate email format, restrict `resourceUrl` to an allowlist of owned resource hosts, and never return a caller-supplied URL as the navigation target.
TEST: Unsigned webhook POST → 401; wrong-secret → 401; correct HMAC → 200. Download with off-allowlist URL → 400; with allowlisted URL → signed/returned URL.
RESULT: External events are attributable; tagging requires a real Kit flow; no open redirect.

**P3 — Remove or gate the predictable diagnostic credential (ADAPTER-15).**
WHY: A "temporary" endpoint with a public default bearer token is an unauthenticated endpoint in practice.
EVIDENCE: `diagnostics/sharp/route.ts:140-143` (`'dev-diagnostic-secret'` fallback).
MINIMUM CHANGE: Fail closed when `DIAGNOSTIC_SECRET` is unset (return 503/401, never accept the fallback); schedule removal of the temporary endpoint.
TEST: Unset secret → any bearer → 401/503; set secret → only correct bearer passes.
RESULT: No public default credential.

**P4 — Practice + social identity binding (ADAPTER-7..12).**
WHY: Unsigned cookie sessions and caller-supplied identity ids make impersonation a single POST.
EVIDENCE: `practice/session` route; `fyd/social/*` routes; unsigned `setPracticeIdentityId`.
MINIMUM CHANGE: Sign the practice cookie (HMAC with server secret) and bind writes to the cookie identity server-side — never accept `identityId`/`actorId` from the body. Same for the social lane when its transport returns.
TEST: Tampered cookie → rejected; body `identityId` differing from cookie → ignored/400.
RESULT: Writes are attributable to the session principal.

**P5 — Core: resolve B1, then put one auth layer in front of the gateway (CORE-1..4).**
WHY: No HTTP-layer auth exists anywhere in the core gateway; privileged operations (deploy rollback, tenant delete, worker markers, direct journal emit) are one POST away in the worktree copy.
EVIDENCE: `route_middleware.js:19-46`; empty bootstrap auth grep; route tables above.
MINIMUM CHANGE: First resolve B1 (extract and diff the actual `ping-gateway:devin-boundary2` bytes). Then add a single bearer/API-key middleware in `GatewayRuntime` boot applied to all mutating routes, keeping the BFF-envelope Ed25519 path as the write credential for `/events`.
TEST: Mutating route without credential → 401; with credential → passes; BFF signed envelope → passes without the bearer.
RESULT: One enforced authentication boundary instead of per-route absence.

**P6 — Verify `fyd/net` SSRF controls (ADAPTER-17).**
WHY: Anonymous arbitrary-URL fetch is only safe if `fyd/net` actually enforces SSRF, budgets, and rate limits — currently unread.
EVIDENCE: `onboarding/preview` route delegates to `fyd/net`/`generateAnonymousPreview`; client identity from spoofable `x-forwarded-for`.
MINIMUM CHANGE: Read `fyd/net`; if SSRF allowlisting is absent, add private-range/IP-literal blocking and per-client (non-spoofable, e.g. cookie or IP+TLS-fingerprint) rate limiting.
TEST: POST internal URL (`169.254.169.254`, `127.0.0.1`) → blocked; rapid `X-Forwarded-For` rotation → still rate-limited.
RESULT: Anonymous preview cannot reach the internal network.

---

## Summary

26 rows across both repos: 21 adapter, 5 core (consult-only). The headline is not the count but the **served-vs-audited split**: the two most severe findings (ADAPTER-3, ADAPTER-4 — unauthenticated claim verification and owner overrides) are LIVE on `:3100` precisely because the served checkout predates the weak Host/env gates added on the audited head — and those gates are themselves spoofable (ADAPTER-5), so "deploy the audited head" is necessary but not sufficient. The adapter's middleware performs no auth at all, so every route is on its own; most mutation routes chose nothing. The core gateway likewise has zero HTTP-layer auth (logging-only `asyncHandler`, no bootstrap middleware), with the worktree `POST /events` canonical-spine branch emitting directly to the journal — but deployed container bytes are unverified (B1), so core rows are classified WORKTREE-ONLY-UNKNOWN with the live 401/403 capture noted as contradicting evidence.

Transport-dark findings (practice lane, FYD social lane) are latent, not dead: they become exploitable the moment `PING_GATEWAY_BASE_URL` is set or `:18199` starts listening, and the social lane's server-side key custody makes that moment High severity.

## Next adjacent gap

**Verify the unread trust boundaries this inventory deferred:** (1) `fyd/net` SSRF/budget/rate-limit implementation behind the anonymous onboarding fetch (ADAPTER-17); (2) the FYD social lane's dev-key generation and custody behavior (ADAPTER-10); (3) the exact persisted-write line in the served overrides approve path (ADAPTER-4); (4) payload-privacy review of the public reads (ADAPTER-19) and wildcard CORS (ADAPTER-20); (5) resolve B1 — extract the actual `ping-gateway:devin-boundary2` bytes and diff `POST /events` against both source copies. Recommend B1 and (1) first: they decide whether CORE-1 and ADAPTER-17 are High or Critical.

---

*Evidence batches: `~/workspace/constitutional-sprint/fleet/security/evidence/routes-batch1.txt` … `routes-batch9.txt`, `core-gateway.txt`.*
*No repository files were modified. No commits were created. Static analysis only.*
