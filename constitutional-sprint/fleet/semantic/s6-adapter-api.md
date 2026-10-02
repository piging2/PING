# S6 — Semantic Audit: Adapter API Routes (src/app/api/)

Worker: s6 (semantic audit). Mode: READ-ONLY; COMMITS CREATED: NONE; proposals only, never applied.
Base: ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (working tree clean, verified).
Transport: Pig SSH; batched reads; no secret values printed.
Read first: `~/workspace/constitutional-sprint/event/EVENT-FORENSICS.md`,
`~/workspace/constitutional-sprint/authority-map/AUTHORITY-MAP.md`,
`~/workspace/constitutional-sprint/security/SECURITY-SWEEP.md`,
`~/workspace/constitutional-sprint/reachability/REACHABILITY.md`.
Date: 2026-09-23 ~20:05-20:45 MDT.

Scope: all 49 `src/app/api/**/route.ts` files (verified count: 49 via `find src/app/api -name route.ts`).
Method: every route file read on the Pig; mechanism trace DEFINED -> IMPORTED -> CONSTRUCTED ->
INITIALIZED -> STARTED -> REGISTERED -> CALLED -> PERSISTING -> READ BACK -> RESTARTED -> TESTED
applied per write path. Known findings F1/F2/18199/dead-ping-routes re-verified from source,
not re-litigated.

---

## A. Per-route audit (all 49)

Legend: AUTH = authentication present? | AUTHZ = authorization/capability check | VALID = input
validation | MUTATES = what it writes (local DB/file, external service, gateway journal) |
SEAM = local action vs gateway call | STATUS = LIVE / DEAD (gateway dark) / DORMANT-BY-DESIGN.

### A1. Marketing / Kit lane (legacy, HPP event log -> in-memory)

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/kit/webhook` | POST | NONE (no signature, no secret) | none | shape-only (`event` + `subscriber` presence) | HPP event log (in-memory, PII: email, first name, subscriber id) | LOCAL (logEvent); never calls kit-adapter.handleWebhook | LIVE — **F1 VERIFIED** |
| `api/kit/webhook` | GET | none | none | n/a | none (returns `{"status":"Kit webhook endpoint active"}`) | local | LIVE |
| `api/newsletter/subscribe` | POST | NONE (by design: public signup) | none | email format regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`; firstName/source trimmed | EXTERNAL: Kit (syncNewsletterSubscriber: subscriber upsert, tags, sequence enrollment); HPP event log (email PII) | local + Kit API | LIVE |
| `api/resources/download` | POST | NONE | none | presence-only (`email`, `resourceTitle` required; no email format check) | EXTERNAL: Kit `findSubscriberByEmail(email)` + `applyGuideDownloadTag(id)` on ANY email; HPP event log (email PII) | local + Kit API | LIVE — **F2 VERIFIED** |

F1 evidence: route calls `logEvent` directly on any payload shaped like a Kit event; never passes a
signature; never calls `KitAdapter.handleWebhook` (which exists at `src/lib/kit-adapter.ts:109` with
HMAC-SHA256 verification at `:129`). `KIT_WEBHOOK_SECRET` is referenced only inside the adapter's
optional-signature branch (`:112-115`); the route never consults it. Class: UNAUTHENTICATED WRITE
(unauthenticated event injection with subscriber PII into the HPP log).
F2 evidence: route accepts arbitrary `email`/`resourceUrl`; calls `findSubscriberByEmail(email)` +
`applyGuideDownloadTag` (anyone can tag any Kit subscriber); returns `downloadUrl: resourceUrl`
(reflected open redirect, no allowlist). Class: UNAUTHENTICATED WRITE + OPEN REDIRECT.

### A2. Health / diagnostics

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/health` | GET | none | none | n/a | none (`{status:'ok', timestamp}`) | local | LIVE, benign |
| `api/health/authority` | GET | NONE | none | n/a | none | local | LIVE — config oracle (see row R6) |
| `api/diagnostics/sharp` | GET | Bearer token header, BUT default `dev-diagnostic-secret` when `DIAGNOSTIC_SECRET` unset; loose `!==` compare | none | n/a | none (diagnostic probe only) | local | LIVE — **F6 VERIFIED + new: default-secret bypass** |

New evidence on sharp (beyond SECURITY-SWEEP F6): line ~136
`const expectedAuth = \`Bearer ${process.env.DIAGNOSTIC_SECRET || 'dev-diagnostic-secret'}\`;`
the fallback secret is literally readable in public source, so "auth" is absent whenever the env
var is unset (which the security sweep confirmed is the on-disk state: no `.env` exists). Also the
file header claims "AUTHORIZATION: Requires same authentication as /api/drive/ingest" but
**no `api/drive/ingest` route exists in this repo** (find: no drive dir) — a dangling authorization
reference. The "TEMPORARY" endpoint is still live.

### A3. Ask FYD (fyd/ask) — read-only + draft-only, anonymous by design

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/fyd/ask` | POST | none (visitor mode default) | mode `owner` accepted but grants nothing (labeled future lane); tenant built server-side from validated body (G3) | `question` required, max 2000 chars; `objectId` scoped to tenant; body tenant claims refused on mismatch (`tenant_mismatch` 400) | NONE: grep over `ask-pipeline.ts` (306 lines) finds no write/append/emit/submit/save; `proposal` is a draft returned in the response, never persisted | gateway JOURNAL READ via `fydJournalBase()` | DOWN live: default `http://127.0.0.1:18199` has nothing listening (REACHABILITY G1) |
| `api/fyd/ask/[siteId]` | POST | none (visitor) | tenant from ROUTE PATH (trusted); any body-supplied `siteId`/`tenantId`/`tenant` disagreeing is REFUSED 400, never honored | siteId must match DNS-safe slug via `requireTenantContext` | none (same as above) | gateway journal read (same) | DOWN live (same) |

### A4. Public read projections (fail-honest, documented)

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/fyd/circle` | GET/OPTIONS | none (public embed) | none — projection is public-safe by construction (`loadCircleProjection`) | `id` required/non-empty | none | local (dump JSON read) | LIVE |
| `api/fyd/projection` | GET | none | none — raw source projection BY DESIGN ("SOURCE SAYS X") | `siteId` required | none | local (dump JSON) | LIVE; 503 on missing/tampered (no stale fallback) |
| `api/fyd/objects/[objectId]` | GET | none | none — public ObjectView | route param; 404 unknown | none (reads owner overlay history only) | local | LIVE |
| `api/fyd/media` | GET | none | none — provenance metadata only, never bytes | `siteId` required; `digest` optional, 404 unknown | none | local | LIVE |
| `api/fyd/social/feed` | GET | none | visibility-aware (own public + actively-followed public posts) | `identityId` required; `limit` clamped 1..200 | none | gateway journal read (18199) | DOWN live (reader 502) |
| `api/fyd/social/state` | GET | none | none (public identity state) | `identityId` required; 404 when identity+profile unknown | none | gateway journal read (18199) | DOWN live |

### A5. OIDC auth lane (api/fyd/auth/*) — HMAC session authority

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/fyd/auth/google/start` | GET | n/a (initiates) | none | n/a | sets signed OAuth state cookie (state+nonce+PKCE) | local + Google | LIVE; 503 until provider creds installed (fail closed) |
| `api/fyd/auth/google/callback` | GET | verifies OAuth state; exchanges code; verifies ID token server-side; provider tokens discarded | n/a | strict redirect allowlist (in callback-flow) | `data/fyd-identity/accounts/<sha256>.json` (atomic tmp+rename) via FileIdentityBindingStore; sets HMAC session cookie | local file store | LIVE |
| `api/fyd/auth/link/google/start` | GET | REQUIRES valid session (401 otherwise) | n/a | n/a | state cookie w/ signed `linkIdentityId` | local | LIVE |
| `api/fyd/auth/link/google/callback` | GET | same verification as sign-in; links to identity embedded in signed state | fresh verified proof required to link (principal.ts:196) | n/a | binding file write (link) | local file store | LIVE |
| `api/fyd/auth/session` | GET | HMAC-signed session cookie read; anonymous when absent/unconfigured | none | n/a | none | local file store (read) | LIVE |
| `api/fyd/auth/signout` | POST **and GET** | session read for audit only | none | n/a | clears session cookie; appends `sign_out` audit | local | LIVE — **GET accepted = CSRF-logout vector (row R9)** |
| `api/fyd/auth/unlink` | POST | session REQUIRED (401) | CSRF token verified (`verifyCsrfToken`, 403 on failure); refuses last auth method (409) | `providerAccountId` required | binding file delete; `unlink` audit append | local file store | LIVE |

### A6. Claims lane (api/fyd/claims/*) — local JSON claim store

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/fyd/claims/[resourceId]` | GET | none | none | `isValidResourceId` (400 malformed) | none (404 when no record; nothing invented) | local `data/fyd-claims/*.json` read | LIVE |
| `api/fyd/claims/[resourceId]/claim` | POST | `resolveClaimIdentity()` REQUIRED (401 fail closed); demo-owner is the only source in this build (labeled) | 403 for DEMO_CONTEXT_IDS; anonymous cannot claim | resource id valid; optional `sourceUrl` must start with `http` | writes claim record (OBSERVED->CLAIMED) | local file store | LIVE (dormant-by-policy: demo flag off) |
| `api/fyd/claims/[resourceId]/release` | POST | same identity required (401) | ONLY claimant may release (403 `not-claimant`); audit history preserved | resource id valid | writes release record | local file store | LIVE |
| `api/fyd/claims/[resourceId]/verify` | POST | demo-owner gate, NOT real auth (labeled) | `demoDenied`: `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` AND private host (Host header); only `operator-attestation` implemented (501 otherwise) | method allowlist; resource id valid | writes VERIFIED-CONTROLLED attestation | local file store | DORMANT-BY-DESIGN (flag off); F3 applies |
| `api/fyd/claims/identity` | GET | none | none | n/a | none (reports claim identity source; null = claiming unavailable) | local | LIVE |
| `api/fyd/claims/verification-methods` | GET | none | none | n/a | none (honest seam listing) | local | LIVE |

### A7. Demo-owner mutation lanes (customize + overrides) — honest non-auth

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/fyd/customize` | POST | NONE (labeled NOT_REAL_AUTH) | `parse`: stateless, no gate, no persistence. `approve`/`clear`: demo flag + private host + `evaluateCapability` (deny-by-default) + FULL chain re-derived from text; digest equality (stale digest -> 409, altered proposal -> 409) | action dispatch; proposal body must byte-equal freshly re-derived proposal | `approve`/`clear`: journal overlay events via `emitOverlayEvent` -> gateway (18199; 502 if unreachable) | gateway journal WRITE (default phantom 18199) | DORMANT-BY-DESIGN (flag off); write path DOWN live |
| `api/fyd/customize` | GET (`view=inspect`) | none — **NOT gated** | none | `siteId` + `view=inspect` required | none | local (site spec read) | LIVE — returns `demoOwnerMode` boolean = config oracle (row R10) |
| `api/fyd/objects/[objectId]/overrides` | POST | NONE (labeled NOT_REAL_AUTH) | BOTH stages (propose+approve) gated on demo flag + private host (403 before any I/O); tenant from route path only (G4); body tenant claims refused 400; approve requires echo of all 3 preview digests (`approval_not_bound` 400), patch-digest equality, stale-proposal 409, `evaluateCapability` 403 | command grammar (`parseOwnerCommand`); hex64 digest format | APPROVE only: appends provenance-backed event to `data/fyd-owner/<objectId>.json` (local, atomic) | LOCAL file write (owner log); reads raw projection for source values | DORMANT-BY-DESIGN; 403 body leaks `demoOwnerMode`/`hostPrivate` booleans (row R10) |

### A8. Local viewer state (unauthenticated single-viewer demo stores)

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/fyd/follow` | GET/POST | none (local viewer) | none — answers about ONE object only; never lists all | `OBJECT_ID_PATTERN /^[a-z0-9-]+$/`; action enum | local viewer JSON store (fyd/object/follows.ts -> gitignored data) | LOCAL | LIVE |
| `api/fyd/like` | GET/POST | none (local viewer) | none — same one-object rule | same pattern; action enum | local viewer JSON store | LOCAL | LIVE |

### A9. Onboarding preview — SSRF-gated anonymous fetch

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/fyd/onboarding/preview` | POST | none (anonymous by design) | rate-limited by IP-hash clientId (429 + Retry-After); crawl budgets | `url` required string | none | EXTERNAL fetch through `fyd/net/safe-fetch.ts` SSRF gate | LIVE — gate verified real (see below) |

SSRF gate evidence (`src/fyd/net/safe-fetch.ts`, read in full): HTTP/HTTPS only; credential-bearing
URLs rejected; DNS resolved EVERY hop, non-public space rejected (loopback, RFC1918, link-local incl.
169.254.169.254, multicast, reserved, IPv4-mapped IPv6, CGNAT 100.64/10 as private); redirects max 5
with every hop re-validated; content-type allowlist pre-buffer; size/timeout caps. This is the ONE
canonical gate (media pipeline re-exports it as a shim). Class: REAL BOUNDARY, PROVEN IN SOURCE.

### A10. FYD social write lanes (gateway journal writes) — key-custody authorization

| Route | Method | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/fyd/social/identity` | POST | NONE | dev identities only; authorization = server-side key custody: only identities with keys escrowed under `FYD_DEV_KEY_DIR` can be signed for; no rate limit at route level | displayName/handle/bio coerced to string | EXTERNAL: gateway `POST /identities` (mints `identity_<16hex>`) + signed profile envelope; keys written to `FYD_DEV_KEY_DIR` (0600) | GATEWAY write (18199 default) | DOWN live (connection refused) |
| `api/fyd/social/follow` | POST/DELETE | NONE | `actorId` comes from the BODY but signing uses the actor's escrowed key — caller can only act as identities whose keys the server holds; journal attestation re-read before `ok:true` | actorId/targetId required | EXTERNAL: signed `RELATIONSHIP_CREATED` envelope -> gateway journal | GATEWAY write (18199) | DOWN live |
| `api/fyd/social/post` | POST | NONE | same key-custody model | identityId + non-empty text required; `visibility` restricted to public/followers/private | EXTERNAL: signed `OBJECT_CREATED` (`ping.social.post@1`) -> gateway journal; attested before success | GATEWAY write (18199) | DOWN live |

### A11. PING BFF (api/ping/*) + practice BFF (api/practice/*) — all via GatewayPingObjectReader

All 14 routes call `getPingObjectReader()`, which throws `GatewayNotConfiguredError` when
`PING_GATEWAY_BASE_URL` is unset (`ping-object-reader.ts:240-243`). REACHABILITY verified all three
live servers have zero gateway env vars -> all 14 DEAD live (verify, not re-litigate: confirmed the
throw site and the constructor default; the env absence was proven in REACHABILITY live-scan).

| Route | Methods | AUTH | AUTHZ | VALID | MUTATES | SEAM | STATUS |
|---|---|---|---|---|---|---|---|
| `api/ping/object` | GET | viewerId optional | reader filters on `visibility`; private objects restricted to controlling identity (enforcement ultimately gateway-side) | id required | none | GATEWAY read | DEAD (not configured) |
| `api/ping/node` | GET | same | same | id required | none | GATEWAY read | DEAD |
| `api/ping/feed` | GET | same | non-public dropped | params | none | GATEWAY read | DEAD |
| `api/ping/circle` | GET | same | same | id required | none | GATEWAY read | DEAD |
| `api/ping/actions` | GET | same | `planActionsPure` + `grantsForViewer` | target required | none (plans only) | GATEWAY read | DEAD |
| `api/ping/ask` | POST | viewerId from practice cookie (optional) | evidence-bounded composer | question required, max 2000 chars | none (answer composed, not persisted) | GATEWAY read | DEAD |
| `api/ping/proposal` | POST | practice identity REQUIRED ("No active identity") | digest re-verified server-side; site-patch: envelope signature + `siteSpecDigest` re-read vs current spec (stale -> refused); `grantsForViewer` deny-list: agents never publish (reader `submitProposal`) | `isProposal` shape check | EXTERNAL: signed envelope submitted to gateway as viewer identity | GATEWAY write | DEAD |
| `api/practice/feed` | GET | practice cookie | same visibility model | params | none | GATEWAY read | DEAD |
| `api/practice/profile` | GET | practice cookie | same | id | none | GATEWAY read | DEAD |
| `api/practice/bio` | PATCH | practice cookie REQUIRED | only active identity edits own bio | bio coerced string | EXTERNAL: `updateBio` via canonical object path -> gateway | GATEWAY write | DEAD |
| `api/practice/follow` | POST/DELETE | practice cookie REQUIRED (`requireSessionId`) | session identity = subject | targetId required | EXTERNAL: signed follow/unfollow -> gateway | GATEWAY write | DEAD |
| `api/practice/like` | POST/DELETE | practice cookie REQUIRED | session identity = subject | objectId required | EXTERNAL: signed like/unlike -> gateway | GATEWAY write | DEAD |
| `api/practice/identities` | GET/POST | POST: NONE (open creation, by design) | POST: none — anyone mints a dev identity and is auto-signed-in as it | displayName/handle/bio coerced | EXTERNAL: `createIdentity` -> gateway; sets practice session cookie | GATEWAY write | DEAD |
| `api/practice/session` | GET/POST/DELETE | POST: validates identity EXISTS in gateway list (never invents) | none | identityId required | session cookie set/cleared (unsigned httpOnly cookie, F7: dev lane only, negligible) | local cookie + gateway list read | DEAD |

---

## B. Shared-record rows (DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS)

**R1.** DOMAIN: api-surface / marketing | COMPONENT: `src/app/api/kit/webhook/route.ts` (POST) |
CLAIM: Unauthenticated callers can inject forged Kit-shaped events with subscriber PII into the HPP
event log | EVIDENCE: route POST has no signature/secret/HMAC reference; calls `logEvent` directly
on any `{event, subscriber}` payload; the existing `KitAdapter.handleWebhook(payload, signature?)`
with HMAC-SHA256 verification (`src/lib/kit-adapter.ts:109-129`) is never invoked by any route
(verified: no importer of `handleWebhook` in `src/app`) | CALLER: any HTTP client | CALLEE: `logEvent`
(`src/lib/events.ts:205`) | WRITER: route -> `InMemoryEventRepository.append` | READER: none
(`findAfter`/`existsByProvenance` have zero consumers) | AUTHORITY: none (no webhook authority exists
on the route) | CLASSIFICATION: BROKEN_BOUNDARY (auth bypass at the seam) | CONFIDENCE: PROVEN
(source-read) | BROKEN BOUNDARY: the adapter's own signature verifier is bypassed by the route |
DEPENDENCIES: `KIT_WEBHOOK_SECRET` (declared, unused) | AFFECTS AGENTS: outreach/intel workers
reading the HPP event log would ingest forged subscriber events.

**R2.** DOMAIN: api-surface / marketing | COMPONENT: `src/app/api/resources/download/route.ts` (POST) |
CLAIM: Unauthenticated callers can tag ANY Kit subscriber (by email) and receive an attacker-supplied
URL reflected as `downloadUrl` | EVIDENCE: route body `{email, resourceTitle, resourceUrl}` —
presence-only validation, no email format check; calls `findSubscriberByEmail(email)` +
`applyGuideDownloadTag(subscriber.id)` unconditionally; returns `downloadUrl: resourceUrl` with no
allowlist; errors in Kit tagging are swallowed as "non-critical" (console only) | CALLER: any HTTP
client | CALLEE: `src/lib/kit.ts` (Kit API client), `logEvent` | WRITER: Kit subscriber record
(external, tag write), HPP event log (PII) | READER: none (log) | AUTHORITY: none | CLASSIFICATION:
BROKEN_BOUNDARY | CONFIDENCE: PROVEN | BROKEN BOUNDARY: third-party CRM write exposed without
auth or ownership proof | DEPENDENCIES: Kit API key (env) | AFFECTS AGENTS: none directly; data
poisoning surface for anyone trusting `GuideDownloaded` events or Kit tags.

**R3.** DOMAIN: api-surface / orphan-helper | COMPONENT: `src/lib/kit-adapter.ts` `handleWebhook` /
`verifyKitSignature` | CLAIM: A working Kit webhook signature verifier exists but is an orphan — no
route calls it, so the protection it offers is not on any live path | EVIDENCE: `handleWebhook`
defined at kit-adapter.ts:109, `verifyKitSignature` at :129; `grep -rn handleWebhook src/app` =>
zero hits; the only webhook route hand-rolls `logEvent` instead | CALLER: none | CALLEE:
`normalizeWebhookPayload` | WRITER: n/a | READER: n/a | AUTHORITY: n/a | CLASSIFICATION:
ORPHAN (producer without consumer) | CONFIDENCE: PROVEN | BROKEN BOUNDARY: intended security
control disconnected from its enforcement point | DEPENDENCIES: `KIT_WEBHOOK_SECRET` |
AFFECTS AGENTS: any future route-wiring work must not assume the adapter is live; also note the
verifier is signature-OPTIONAL (`if (signature)`) — even wired, unsigned webhooks would pass.

**R4.** DOMAIN: api-surface / diagnostics | COMPONENT: `src/app/api/diagnostics/sharp/route.ts` (GET) |
CLAIM: The diagnostic endpoint's auth is trivially bypassable whenever `DIAGNOSTIC_SECRET` is unset
(the on-disk state: no `.env` exists), and its authorization docstring cites a nonexistent route |
EVIDENCE: `Bearer ${process.env.DIAGNOSTIC_SECRET || 'dev-diagnostic-secret'}` (line ~136) —
fallback secret is public source text; `authHeader !== expectedAuth` loose compare; header comment
"Requires same authentication as /api/drive/ingest" but `find src/app/api -path '*drive*'` => no
such route exists; "TEMPORARY" endpoint still live | CALLER: any HTTP client | CALLEE: `sharp`
module | WRITER: none | READER: n/a | AUTHORITY: none (claimed, dangling) | CLASSIFICATION:
BROKEN_BOUNDARY | CONFIDENCE: PROVEN | BROKEN BOUNDARY: auth claim references a ghost route;
secret default is public | DEPENDENCIES: `DIAGNOSTIC_SECRET` | AFFECTS AGENTS: none (diagnostic
only), but a foothold for env probing if expanded.

**R5.** DOMAIN: api-surface / health | COMPONENT: `src/app/api/health/authority/route.ts` (GET) |
CLAIM: Unauthenticated endpoint discloses presence/absence of secret-bearing env vars
(KV, ENCRYPTION_KEY, GOOGLE_CLIENT_*, WORKBENCH_PASSWORD, BLOB token) plus `VERCEL_ENV` |
EVIDENCE: route returns `*_present` booleans per secret and `vercel_env`, no auth check, no method
restriction | CALLER: any HTTP client | CALLEE: `process.env` | WRITER: none | READER: any |
AUTHORITY: none | CLASSIFICATION: INFORMATION_DISCLOSURE (low severity; presence-only, no values) |
CONFIDENCE: PROVEN | BROKEN BOUNDARY: none broken, but the "authority readiness" surface is
readable by the world | DEPENDENCIES: env | AFFECTS AGENTS: recon value only.

**R6.** DOMAIN: api-surface / silent-fallback | COMPONENT: `src/fyd/social/config.ts`
(`fydGatewayBaseUrl`, :15-20) and `src/lib/ping/ping-object-reader.ts` (`fydJournalBase`, :264) |
CLAIM: Missing gateway env SILENTLY falls back to phantom `http://127.0.0.1:18199` instead of
failing closed at configuration time, so every social-write and ask-journal route is dead but the
site renders as if alive | EVIDENCE: default `127.0.0.1:18199` in source; REACHABILITY live-scan:
nothing listens on 18199; all three Next servers unset gateway vars; routes surface 502/400 only at
connect time. Contrast: `GatewayPingObjectReader` FAILS CLOSED (`GatewayNotConfiguredError`) for
`PING_GATEWAY_BASE_URL` — two different misconfiguration philosophies in one codebase |
CALLER: 5 social routes + ask pipeline + tenant graph | CALLEE: `http://127.0.0.1:18199` (nothing)
| WRITER: n/a | READER: n/a | AUTHORITY: n/a | CLASSIFICATION: SILENT_FALLBACK (config anti-pattern)
| CONFIDENCE: PROVEN | BROKEN BOUNDARY: fail-closed configuration contract violated on the FYD lane |
DEPENDENCIES: `FYD_*_GATEWAY_URL` env vars | AFFECTS AGENTS: any agent probing `api/fyd/ask` or
social routes tonight gets 502s that look like a code bug, not a missing service — misdirects
debugging.

**R7.** DOMAIN: api-surface / auth-lane | COMPONENT: `src/app/api/fyd/auth/signout/route.ts` |
CLAIM: Signout accepts GET (documented "for link navigation"), making logout CSRF-triggerable |
EVIDENCE: both `POST` and `GET` exported, both call `signOut` (clears HMAC session cookie) |
CALLER: any page embedding the URL | CALLEE: `clearSessionCookie` | WRITER: cookie jar | READER:
n/a | AUTHORITY: session.ts HMAC (cookie clear is safe regardless) | CLASSIFICATION:
MINOR_WEAKNESS (low risk: logout is not a privilege action, but it is a state-changing GET) |
CONFIDENCE: PROVEN | BROKEN BOUNDARY: none | DEPENDENCIES: none | AFFECTS AGENTS: none.

**R8.** DOMAIN: api-surface / config-oracle | COMPONENT: `src/app/api/fyd/customize/route.ts` (GET
`view=inspect`) and `src/app/api/fyd/objects/[objectId]/overrides/route.ts` (403 bodies) |
CLAIM: Public responses disclose whether demo-owner mode is enabled (`demoOwnerMode` boolean in
customize GET and in every 403 `demoDenied` body, plus `hostPrivate`) | EVIDENCE: customize
`InspectView` includes `demoOwnerMode: process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE === "1"`;
both `demoDenied` bodies include `demoOwnerMode: enabled, hostPrivate: privateNet` | CALLER: any
HTTP client | CALLEE: `process.env` | WRITER: none | READER: any | AUTHORITY: none |
CLASSIFICATION: INFORMATION_DISCLOSURE (low; aids attackers in knowing when the demo-mutation
surface is armed) | CONFIDENCE: PROVEN | BROKEN BOUNDARY: none | DEPENDENCIES:
`NEXT_PUBLIC_FYD_DEMO_OWNER_MODE` | AFFECTS AGENTS: none directly.

**R9.** DOMAIN: api-surface / identity-namespace | COMPONENT: `src/fyd/identity/principal.ts:57`
vs `src/fyd/social/actions.ts:62` vs `src/fyd/claim/identity.ts:16`, as exposed through routes |
CLAIM: Three unlinkable identity namespaces are reachable from the route surface with no bridge:
(A) OIDC uuidv5 identities (`deriveIdentityId`, auth routes), (B) gateway `identity_<16hex>` dev
identities (social + practice routes, server-escrowed keys), (C) demo-owner actor
(`resolveClaimIdentity`, claim/customize/overrides routes) — and the routes let a single human
operate all three simultaneously | EVIDENCE: no importer of both `deriveIdentityId` and
`createFydIdentity` anywhere in src (authority-map Overlap 1); key-custody regexes differ
(strict `^identity_[0-9a-f]{16}$` vs loose alnum); claim identity deliberately does not depend on
the OIDC lane | CALLER: route callers | CALLEE: respective stores | WRITER: file stores, gateway |
READER: routes | AUTHORITY: none unified | CLASSIFICATION: CONFLICTING (identity fragmentation) |
CONFIDENCE: PROVEN | BROKEN BOUNDARY: no bridge table exists | DEPENDENCIES: none | AFFECTS AGENTS:
any agent attributing an action to "the user" across lanes will misattribute; convergence must
reconcile all three.

**R10.** DOMAIN: api-surface / naming-collision | COMPONENT: `api/fyd/follow` (local viewer JSON)
vs `api/fyd/social/follow` (gateway journal) vs `api/practice/follow` (gateway BFF); `api/fyd/like`
(local) vs `api/practice/like` (gateway BFF) | CLAIM: The same verb ("follow", "like") names two or
three semantically different mutations (local-viewer JSON vs journaled canonical relationship vs
BFF proxy), inviting caller confusion and double-write bugs | EVIDENCE: three follow route files
with different persistence targets (local JSON / gateway journal via 18199 / gateway via BFF);
two like routes similarly split; no doc cross-referencing them | CALLER: UI clients | CALLEE: see
per-route | WRITER: local stores + gateway | READER: local + gateway | AUTHORITY: fragmented |
CLASSIFICATION: DUPLICATE_SURFACE | CONFIDENCE: PROVEN | BROKEN BOUNDARY: none (each is
internally consistent) | DEPENDENCIES: none | AFFECTS AGENTS: an agent told to "follow X" must
disambiguate the lane; writes to one lane are invisible to readers of another.

**R11.** DOMAIN: api-surface / network-boundary | COMPONENT:
`src/app/api/fyd/onboarding/preview/route.ts` -> `src/fyd/net/safe-fetch.ts` | CLAIM: The anonymous
URL-fetch endpoint is genuinely SSRF-gated; the gate is the single canonical implementation |
EVIDENCE: safe-fetch.ts read in full — scheme allowlist, credential-URL rejection, per-hop DNS
re-resolution, private/CGNAT/link-local rejection, max-5 redirects re-validated, content-type
allowlist, size/timeout caps; media pipeline's safe-fetch is a documented shim re-export; route
adds IP-hash rate limiting with 429 + Retry-After | CALLER: anonymous HTTP clients | CALLEE:
external URLs | WRITER: none | READER: remote servers (outbound) | AUTHORITY: the SSRF gate
itself | CLASSIFICATION: REAL_BOUNDARY | CONFIDENCE: PROVEN (source) | BROKEN BOUNDARY: none |
DEPENDENCIES: none | AFFECTS AGENTS: agents may treat preview fetch as safe to call on
untrusted URLs.

**R12.** DOMAIN: api-surface / tenant-isolation | COMPONENT: `src/app/api/fyd/ask/[siteId]/route.ts`,
`src/app/api/fyd/objects/[objectId]/overrides/route.ts` | CLAIM: Tenant identity is taken from the
trusted route path and body-supplied tenant claims are refused on mismatch — the one consistent
anti-confusion pattern across mutation routes | EVIDENCE: ask `[siteId]` route: "a TenantContext
is constructed server-side via requireTenantContext... Any body-supplied tenant identity...
REFUSED with 400 tenant_mismatch"; overrides route: TENANT_CLAIM_KEYS check + `tenantMismatchResponse`
400; both verified in source | CALLER: HTTP clients | CALLEE: tenant context factories | WRITER:
n/a | READER: n/a | AUTHORITY: `requireTenantContext` / `createOwnerContext` | CLASSIFICATION:
REAL_BOUNDARY | CONFIDENCE: PROVEN | BROKEN BOUNDARY: none | DEPENDENCIES: none | AFFECTS AGENTS:
pattern to preserve in convergence.

**R13.** DOMAIN: api-surface / dead-surface | COMPONENT: 14 `api/ping/*` + `api/practice/*` routes |
CLAIM: All 14 are dead on every live server (GatewayNotConfiguredError), yet they are the ONLY
routes that call the canonical gateway — the site renders from dump JSON while its
interactive/constitutional surface is dark | EVIDENCE: all 14 import `getPingObjectReader`
(verified by grep); reader throws when `PING_GATEWAY_BASE_URL` unset (ping-object-reader.ts:240-243);
REACHABILITY live-scan: 0 gateway env vars on :3100/:3101/:3210; healthy canonical gateway on
:8080 has zero clients | CALLER: UI | CALLEE: gateway (unreached) | WRITER: n/a | READER: n/a |
AUTHORITY: n/a | CLASSIFICATION: DEAD_BY_CONFIG (fail-closed, honest) | CONFIDENCE: PROVEN |
BROKEN BOUNDARY: none in code (fail-closed is correct); operational gap only | DEPENDENCIES:
`PING_GATEWAY_BASE_URL` | AFFECTS AGENTS: any E2E test or agent flow touching these routes gets
500s; do not mistake for code bugs.

**R14.** DOMAIN: api-surface / practice-lane | COMPONENT: `src/app/api/practice/identities/route.ts`
(POST), `src/app/api/practice/session/route.ts`, `src/lib/ping/session.ts` | CLAIM: Open dev-identity
minting + unsigned session cookie is safe-by-design ONLY because the whole lane is dev-scoped and
currently dead by config; the cookie trusts raw values (F7) but the set paths (session POST
validates existence in gateway list; identities POST is open-by-design) already permit choosing any
dev identity, so no privilege gain exists from tampering | EVIDENCE: session.ts:23-33 comment
"does NOT grant capabilities"; session POST checks `listIdentities` before `setPracticeIdentityId`;
identities POST auto-signs-in the minted identity (documented) | CALLER: browser | CALLEE: gateway
list/identities | WRITER: cookie jar | READER: 14 BFF routes | AUTHORITY: none (dev lane) |
CLASSIFICATION: ACCEPTED_RISK (dormant) | CONFIDENCE: PROVEN | BROKEN BOUNDARY: none |
DEPENDENCIES: gateway | AFFECTS AGENTS: if this lane is ever enabled for real users, the unsigned
cookie + open minting must be replaced with the OIDC lane (A) — flag for convergence.

---

## C. Proposed changes (WHY -> EVIDENCE -> MINIMUM CHANGE -> TEST -> RESULT)

Read-only scope: none applied. Each proposal is minimal and local.

**P1 — Wire the Kit webhook route through the existing signature verifier (fixes F1/R1).**
WHY: forged Kit-shaped events with subscriber PII can be injected into the HPP event log by anyone.
EVIDENCE: route calls `logEvent` directly; `KitAdapter.handleWebhook(payload, signature)` with
HMAC-SHA256 exists but is orphan (R3); `KIT_WEBHOOK_SECRET` declared in `.env.example`.
MINIMUM CHANGE (in `src/app/api/kit/webhook/route.ts`): replace the `logEvent(...)` block with
`const adapter = new KitAdapter(); const events = await adapter.handleWebhook(body,
request.headers.get('x-kit-signature') ?? undefined);` then `logEvent` only the returned
canonical events; return 401 when the adapter throws "Invalid webhook signature". Also make the
adapter REQUIRE the signature (remove the `if (signature)` optional branch) or require
`KIT_WEBHOOK_SECRET` set at boot.
TEST: (1) POST forged payload with no/invalid signature -> expect 401, no logEvent; (2) POST with
valid HMAC (secret from env) -> 200 + event logged; (3) POST with `KIT_WEBHOOK_SECRET` unset ->
503 fail-closed.
RESULT: unauthenticated event injection closed; verifier orphan eliminated.

**P2 — Validate email + stop reflecting attacker URLs in resources/download (fixes F2/R2).**
WHY: anyone can tag any Kit subscriber and the route echoes an attacker URL as `downloadUrl`.
EVIDENCE: presence-only validation; `findSubscriberByEmail(email)` + `applyGuideDownloadTag` on
untrusted input; `downloadUrl: resourceUrl` unvalidated.
MINIMUM CHANGE (in `src/app/api/resources/download/route.ts`): (a) reuse the newsletter route's
email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) -> 400 on invalid; (b) do not return `resourceUrl`;
either allowlist `resourceUrl` against known resource hosts or return only `{ success: true }`
and let the client navigate to a server-known URL.
TEST: (1) POST invalid email -> 400; (2) POST `resourceUrl: https://evil.example/x` -> 400 or no
`downloadUrl` in response; (3) happy path still tags + logs.
RESULT: open tag-write narrowed; open redirect removed.

**P3 — Harden or remove the sharp diagnostic endpoint (fixes R4).**
WHY: publicly known default secret = no auth when env unset; dangling authorization reference;
"temporary" endpoint still live.
EVIDENCE: `Bearer ${process.env.DIAGNOSTIC_SECRET || 'dev-diagnostic-secret'}`; `!==` compare;
no `api/drive/ingest` route exists.
MINIMUM CHANGE: delete the default (fail 503 when `DIAGNOSTIC_SECRET` unset), compare with
`timingSafeEqual`, and either delete the file (preferred: incident is historical) or keep it
behind the same private-host gate as demo-owner routes.
TEST: (1) with env unset -> 503 without executing diagnostics; (2) wrong token -> 401;
(3) correct token + `timingSafeEqual` -> 200.
RESULT: diagnostic probe no longer publicly callable.

**P4 — POST-only signout (fixes R7).**
WHY: GET-triggered logout is a CSRF state change.
EVIDENCE: both POST and GET exported in `signout/route.ts`.
MINIMUM CHANGE: remove the GET export (keep POST); update any in-app links to use a form/POST.
TEST: GET `/api/fyd/auth/signout` -> 405/404; POST -> redirect + cookie cleared + audit row.
RESULT: logout no longer triggerable by link/image prefetch.

**P5 — Remove config oracles from public responses (fixes R8).**
WHY: responses disclose whether demo-owner mode is armed.
EVIDENCE: `demoOwnerMode` in customize GET `view=inspect`; `demoOwnerMode`/`hostPrivate` in every
`demoDenied` 403 body (customize, overrides, verify).
MINIMUM CHANGE: strip those fields from JSON responses (keep the human-readable error text).
TEST: 403 body contains no `demoOwnerMode`/`hostPrivate` keys; GET inspect likewise.
RESULT: attackers cannot probe demo-mode arming from responses.

**P6 — Auth-gate `api/health/authority` (fixes R5).**
WHY: secret-presence oracle is world-readable.
EVIDENCE: presence booleans + `vercel_env`, no auth.
MINIMUM CHANGE: require the same private-host check as the demo-owner gate (or an ops bearer
token); alternatively move it under an existing authenticated admin surface.
TEST: public GET -> 403; private-host GET -> 200 with the same payload.
RESULT: recon value removed from the public surface.

**P7 — Fail closed on missing FYD gateway config (fixes R6).**
WHY: the phantom `127.0.0.1:18199` default makes 5+ routes fail at connect time with misleading
502s instead of declaring misconfiguration.
EVIDENCE: `fydGatewayBaseUrl()` and `fydJournalBase()` default to `http://127.0.0.1:18199`;
nothing listens there (REACHABILITY G2); contrast with `GatewayNotConfiguredError` for the BFF.
MINIMUM CHANGE: in `src/fyd/social/config.ts` and `ping-object-reader.ts:264`, throw a typed
`FydGatewayNotConfiguredError` (mirroring `GatewayNotConfiguredError`) when the env var is unset
instead of defaulting; keep an explicit opt-in env value for the old default if the demo needs it.
TEST: with env unset, `POST /api/fyd/social/post` -> typed 500/503 naming the missing config
(not a connection-refused 502); with env set to a live gateway, normal behavior.
RESULT: misconfiguration is honest at the config boundary, matching the BFF lane.

**P8 — Disambiguate the follow/like surfaces (addresses R10).**
WHY: three "follow" routes and two "like" routes with different persistence targets invite
cross-lane confusion.
EVIDENCE: `api/fyd/follow` (local JSON), `api/fyd/social/follow` (journal), `api/practice/follow`
(BFF); `api/fyd/like` vs `api/practice/like`.
MINIMUM CHANGE (docs-only, zero behavior risk): add a "lane map" note to
`src/app/api/fyd/READ-SURFACE-INVENTORY.md` stating which follow/like belongs to which lane and
that writes in one lane are invisible to readers of another; add one-line header comments in each
route file pointing at the siblings.
TEST: n/a (docs). RESULT: future callers pick the right lane.

---

## D. Trace summary (DEFINED -> ... -> TESTED) for the write paths

| Write path | DEFINED | IMPORTED | CONSTRUCTED | INITIALIZED | STARTED | REGISTERED | CALLED | PERSISTING | READ BACK | RESTARTED | TESTED |
|---|---|---|---|---|---|---|---|---|---|---|---|
| kit/webhook -> HPP log | `logEvent` in `lib/events.ts:205` | webhook route | `getEventRepository()` singleton | module load | process start | n/a (in-process) | route POST | `InMemoryEventRepository.append` (memory, lost on restart) | nobody (`findAfter` 0 consumers) | lost on restart | NO route tests |
| newsletter/download -> Kit | `syncNewsletterSubscriber`, `applyGuideDownloadTag` in `lib/kit.ts` | routes | per-call client | env creds | n/a | n/a | route POST | Kit SaaS (external) | via Kit dashboard/API | external | NO route tests |
| auth callbacks -> bindings | `FileIdentityBindingStore` in `fyd/identity/file-store.ts:44` | 4 auth routes | `new FileIdentityBindingStore()` per request | n/a | n/a | n/a | callback flows | `data/fyd-identity/accounts/*.json` atomic tmp+rename | `session` route lists accounts | durable across restarts | YES: principal.test.ts, file-store.test.ts, session.test.ts (module-level; no HTTP route tests) |
| claim/release/verify -> claims | `writeClaim` in `fyd/claim/store.ts:68` | claim routes | per request | n/a | n/a | n/a | route POST | `data/fyd-claims/<id>.json` atomic | claims GET route | durable | YES: machine.test.ts, seam.test.ts (module-level; no HTTP route tests) |
| overrides approve -> owner log | `applyOwnerCommand` in `fyd/object/owner-store.ts:150` | overrides route | per request | n/a | n/a | n/a | route POST stage=approve | `data/fyd-owner/<objectId>.json` atomic | `readOverrides` (object view route) | durable | YES: owner-events.test.ts, overrides-patch-loop.test.ts (module-level + patch-loop; no HTTP route tests) |
| customize approve/clear -> journal overlay | `emitOverlayEvent` in `fyd/customize/server.ts` | customize route | per request | n/a | n/a | n/a | route POST | gateway journal (18199) | tenant graph overlay read | n/a (gateway-side) | NO (gateway dark) |
| social identity/follow/post -> journal | `createFydIdentity`/`followIdentity`/`createFydPost` in `fyd/social/actions.ts` | social routes | per request | key escrow dir | n/a | n/a | route POST/DELETE | gateway `POST /identities`, `POST /events` (18199) | social feed/state readers | n/a | NONE AT ALL (REACHABILITY B1: `src/fyd/social/__tests__` empty) |
| ping/proposal, practice bio/follow/like -> gateway | `GatewayPingObjectReader` methods in `lib/ping/ping-object-reader.ts` | 14 BFF routes | `getPingObjectReader()` singleton | throws if `PING_GATEWAY_BASE_URL` unset | n/a | n/a | route handlers | gateway (external) | reader projections | n/a | NO (dead by config; ask pipeline logic has stub-journal tests only) |
| ask routes | `handleAskRequest` in `ask-pipeline.ts` | 2 ask routes | per request | n/a | n/a | n/a | route POST | NONE (draft proposal returned, never persisted) | n/a | n/a | YES: route.test.ts (15 its, stub journal — SMOKE for the wire) |

Duplicate/orphan/dead inventory:
- DUPLICATE surfaces: 3x follow, 2x like (R10); 2x dev signing custodians (authority-map Overlap 2,
  exposed through social vs practice routes).
- ORPHANS: `KitAdapter.handleWebhook` verifier (R3); `/api/drive/ingest` authorization reference
  (R4); `ReplayRepository.findAfter` consumers (none).
- DEAD: 14 ping/practice routes (R13, config); 5 social write/read routes + ask journal path
  (R6, phantom 18199); dormant-by-design demo-owner gates (customize approve/clear, overrides,
  claim verify) — flag off.
- FAKE health: none found in the adapter routes themselves. The FAKE-health instances live
  OUTSIDE this block's scope (docker tags on ping-qdrant/ping-vault, ping-rc-gateway's
  `{"status":"unhealthy"}` on :18099 — see REACHABILITY §4/§5C); `api/health` and
  `api/health/authority` are honest about what they check.

---

## E. Summary for the coordinator

49/49 adapter API routes audited from source. Headline results:

1. **F1 VERIFIED, sharpened**: `api/kit/webhook` bypasses the repo's own HMAC verifier
   (`KitAdapter.handleWebhook`, orphan — R3) and logs unauthenticated PII. Fix is P1.
2. **F2 VERIFIED**: `api/resources/download` tags any Kit subscriber by email and reflects an
   attacker URL. Fix is P2.
3. **NEW — sharp diagnostic endpoint (R4)**: public default secret `dev-diagnostic-secret` when
   env unset + dangling auth reference to a nonexistent `/api/drive/ingest` + "temporary" but
   live. Fix is P3.
4. **NEW — silent fallback anti-pattern (R6)**: FYD lane defaults to phantom `127.0.0.1:18199`
   instead of failing closed like the BFF lane's `GatewayNotConfiguredError`. This is the root
   cause of the "site looks alive but the constitutional surface is dark" behavior alongside R13.
5. **14 ping/practice routes DEAD by config (R13)** — verified fail-closed in code; operational gap
   only. No code bug there.
6. **Auth lane is sound** (HMAC sessions, CSRF on unlink, 503-when-unconfigured, no-merge-on-email);
   one nit: GET signout (R7).
7. **Demo-owner gates are honest non-auth** (labeled, default-off, fail-closed); two config oracles
   leak `demoOwnerMode` in responses (R8) — low severity.
8. **SSRF gate is real** (R11); **tenant-from-route-path pattern is real** (R12) — both worth
   preserving in convergence.
9. **Identity fragmentation (R9)** and **follow/like naming collisions (R10)** are the two
   structural (non-security) findings the convergence plan must handle.
10. **Route-level HTTP tests are ~absent**: only `api/fyd/ask` has route tests (stub journal);
    social writes have zero tests at any level; auth/claims/overrides are covered at module level
    only. "Passing tests" currently prove almost nothing about the live HTTP surface.

No commits created. No files outside this findings doc were written. No secrets printed.

---

## F. Next adjacent gap I see

**The core gateway's own route surface (`/home/nolan/ping/gateway/routes/*.js`) was not semantically
audited by any worker in this sprint.** This block (S6) covered the adapter's 49 routes; EVENT-FORENSICS
traced the gateway's `/events` and `/ingest` write paths and REACHABILITY probed `/health`, but no
worker has done the S6-style per-route pass (auth/authz/validation/mutation/gateway-vs-local) over
the gateway's full route table (`events.js`, `identities`, `canonical_events.js`, ingest, social
adapters, tenant registry routes, etc.). That is the authority boundary the sprint cares about most
(the adapter is just the client), and the copy-divergence question (which `POST /events` bytes run
in the Oracle container) is still open. Recommended: a follow-up worker S6b with read access to
`/home/nolan/ping/gateway/routes/` doing the same DEFINED->TESTED trace per gateway route,
plus a live read-only probe to settle the deployed-`/events` question.
