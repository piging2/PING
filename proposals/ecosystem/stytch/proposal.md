# Harvest Proposal: Stytch — Machine Authentication (workload identity, token lifecycle, auth boundaries)

Target authority owner: **trust-kernel**
Verdict: **ADAPT** (re-derive the mechanisms clean-room into PING; take no code)
proof_ids: **[9, 10, 11, 12, 13]** — worker identity/auth for the mission loop

Stytch is a closed-source commercial SaaS identity platform. No Stytch code exists to
take, and none was taken: every mechanism below is re-derived in the worker's own words
from the public official documentation listed in section 1. The open-source Stytch SDKs
(stytchauth/*, MIT) were not incorporated; their license is recorded in section 13 only.

## 1. What was read (official docs + source only)

| # | Source | Type |
|---|--------|------|
| 1 | https://stytch.com/docs/guides/m2m/authenticate-client | official guide |
| 2 | https://stytch.com/docs/api-reference/consumer/api/m2m/token/get-access-token | official API ref |
| 3 | https://stytch.com/docs/api-reference/consumer/api/sessions/get-jwks | official API ref |
| 4 | https://stytch.com/docs/api-reference/b2b/api/m2m/rotate-secret/start-secret-rotation | official API ref |
| 5 | https://Stytch.com/docs/api-reference/b2b/api/m2m/m2m-client/create-m2m-client | official API ref |
| 6 | https://stytch.com/docs/guides/sessions/using-jwts | official guide |
| 7 | http://stytch.com/docs/api/session-revoke | official API ref |
| 8 | https://github.com/stytchauth/stytch-node/blob/main/LICENSE | license check (MIT) |
| 9 | Search excerpts quoting official doc text: Cancel/Rotate Secret endpoints, consumer Revoke Session, Authenticate session params, crypto-wallets authenticate (session token shapes), magic-link/OAuth response fields (reset_sessions), Stytch blog AI-agent-auth + M2M Node tutorial (deactivation semantics), official stytch-m2m-node-example repo description (token caching, scope middleware) | secondary quotes of official text |

Two fetch attempts returned no extractable content and were not retried per policy:
https://stytch.com/docs/api/m2m-overview, https://stytch.com/docs/sessions. Nothing in this
proposal depends on them; their content is covered by the successfully fetched pages.

SOURCE_SHA = `sha256:2ed5ecce5bb39d67fa6dd3da6d226d2f103408e33aaceed8ab9e257fc1244677`
— sha256 over the concatenated verbatim extracts above (saved at /tmp/stytch-sources.txt
during research; the nine inputs are enumerated in the table above).

## 2. Object model

**m2m_client** (the workload identity):
- `client_id` — project-unique identifier of the machine identity
- `client_secret` — long-term credential; stored server-side as a hash, never recoverable
- `client_secret_last_four` / `next_client_secret_last_four` — non-sensitive identifiers for the secret
- `client_name`, `client_description` — human-readable labels
- `status` — `active` | `inactive`
- `scopes` — string array of permissions assigned to the client
- `trusted_metadata` — arbitrary server-side-only JSON object
- rotation fields: `next_client_secret` (visible exactly once, at rotation start)

**access_token** (short-lived bearer for a workload):
- A JWT signed by the project's JWKS
- Standard claims + the granted scopes + any custom claims generated from claim templates
- `token_type: "bearer"`, `expires_in: 3600` (one hour from issuance)

**session** (human/user session; included because its lifecycle is the proven model for revocation):
- `session_id` — the session's canonical ID
- `session_token` — opaque, secret; carries no information; must be validated via a Stytch API call
- `session_jwt` — signed JWT; locally validatable; fixed 5-minute lifetime, refreshed in the background by the SDK
- every session has a lifetime bounded below (5 min) and above (dashboard-configured max)
- authentication can extend the session via `session_duration_minutes`

**response envelope** (every API call):
- `request_id` — globally unique UUID returned with every API call (debugging receipt)
- `status_code` — standard HTTP semantics
- the affected object (e.g. `m2m_client`, full `session` object) echoed back

## 3. ID scheme

- `client_id`: unique among all clients in a project; can be imported on creation (or generated); examples show environment-prefixed form `m2m-client-test-<uuid>`
- `user_id` / `session_id` / `member_id` / `member_session_id`: globally unique UUIDs, critical for subsequent operations
- `request_id`: globally unique UUID per API call — the per-action receipt
- `kid`: JWT header key ID matched against JWKS for key selection
- `client_secret_last_four`: identifies a secret without exposing it
- All timestamps: RFC 3339, UTC (per consumer SDK doc text)

## 4. State transitions

**Access-token lifecycle:** `issued` (client_credentials grant, scopes requested as space-delimited
subset) -> `valid` (<= 1 hour, bearer JWT, locally verifiable) -> `expired` (hard stop; caller
re-requests; official example app caches the token client-side until expiry).

**Session lifecycle:** `created` (any authenticate call with `session_duration_minutes`) ->
`authenticated` (validate via exactly one of `session_token` | `session_jwt`; each authenticate
can extend lifetime) -> `expired` (lifetime reached) | `revoked` (immediate). If both token
forms are passed to authenticate: `too_many_session_arguments` error. If a JWT is expired,
the documented fallback is to call the Authenticate Session endpoint (server-side truth) to
re-mint.

**M2M client status:** `active` <-> `inactive`. Setting `inactive` deactivates the client from
requesting new access tokens until reactivated. It does NOT deactivate existing tokens; they
remain valid until their own expiry.

**Secret rotation (three-phase, the key mechanism):**
1. `rotate/start`: generates `next_client_secret`. State = ROTATION_STARTED. **Both** `client_secret`
   and `next_client_secret` are valid. The response is the ONLY time `next_client_secret` is
   visible (hash-only storage; if lost, restart the flow).
2. `rotate` (complete): `next_client_secret` becomes `client_secret`; the previous secret is
   immediately invalid. State = ROTATED.
3. `rotate/cancel`: `next_client_secret` is discarded; only the original `client_secret` remains
   valid. State = CANCELLED.

**Scope update:** client scopes are mutable via Update M2M Client; new issuances carry the
current set (subset per issuance via the space-delimited `scope` parameter).

## 5. Authority boundary

Caller (workload) --holds secret--> Stytch (broker/issuer, sole source of truth) --issues JWT-->
resource server (verifier). The trust boundary sits **between the resource server and Stytch**,
not between caller and resource:

- The resource never trusts caller-asserted claims; it trusts Stytch's JWKS signatures (local
  validation) or Stytch's API answer (opaque token validation).
- The management plane is guarded by `project_id` + `secret` in a Basic-auth header — a
  separate, higher-privilege credential than any workload secret.
- Scopes are the authorization layer: assigned to the client at creation, embedded in the
  token (subset-requestable per issuance), and enforced at the resource (the official Node
  example validates required scopes in middleware before granting protected-resource access;
  the open-source SDK exposes an authorization helper matching `action:resource` scope
  patterns).
- Delegated agent authority (per Stytch's AI-agent-auth writeup) is done via standard OAuth 2.0
  token exchange (RFC 8693): agent-scoped, time-limited tokens with optional human approval —
  i.e., the same shape, with a user-delegation claim.

## 6. Persistence semantics

- Client secrets (current and next) are stored as hashes; plaintext is unrecoverable and shown
  once at creation/rotation-start.
- Opaque `session_token` is a database row: meaningless without the server; this is what makes
  it instantly revocable.
- JWTs are stateless bearer credentials: validity = signature + `exp` + `kid` resolution.
- Sessions are enumerable per user (`GET` sessions lists active sessions); revocation state is
  server-side.
- Rotation state (whether a `next_client_secret` exists and which phase) is persisted on the
  client object.

## 7. Evidence / receipts

- `request_id`: a globally unique UUID on every API response, explicitly documented as the
  value to log for debugging; Stytch asks for it when helping debug a specific call. This is
  the per-action receipt primitive.
- Responses echo the affected object (`m2m_client` after rotation; full `session` on
  authenticate), giving a read-after-write confirmation of the new state.
- Standard HTTP status codes with documented 2xx/3xx/4xx/5xx semantics.

## 8. Retries / failures

- Lost `next_client_secret` -> no recovery; restart the rotation flow (start again).
- Rotation started but never completed -> safe: both secrets valid; `cancel` returns to the
  single-secret state. The window can be held open as long as migration takes.
- `too_many_session_arguments`: exactly-one-of enforcement for session authenticate/revoke
  inputs (fail-closed on ambiguous identity).
- Expired JWT -> fall back to the server-side Authenticate Session endpoint to re-mint
  (documented refresh logic); SDKs do this automatically in the background.
- `kid` mismatch / JWKS rotation: fetch the current JWKS; during the ~1-month grace period
  both key sets are published, so a verifier selects by `kid` and never hard-fails the cutover.
- JWT revocation lag: a session JWT can pass local validation for up to 5 minutes after the
  underlying session is revoked. Stytch documents this explicitly as the price of local
  validation; the opaque token has zero lag (always a server call).

## 9. Revocation model

- **Session revoke is session-scoped and immediate**: one call with exactly one of
  `session_id` | `session_token` | `session_jwt` invalidates **all** tokens of that session at
  once (server-side truth). This is the atomic "kill the identity's credentials" primitive.
- **M2M client deactivation is issuance-scoped, not token-scoped**: `status=inactive` stops new
  token issuance; in-flight access tokens live until expiry (max 1 hour). This is a documented
  gap: deactivation is not revocation.
- **Secret rotation completion** kills the old secret immediately, but does not affect
  previously issued access tokens (tokens are signed by the project JWKS, independent of the
  client secret).
- **Factor-change revocation**: password/factor changes set `reset_sessions`; with the Session
  product Stytch revokes the user's other sessions automatically.
- Net: Stytch gives you instant session-kill and instant secret-kill, but NOT instant
  in-flight-JWT-kill for M2M tokens. The maximum blast radius of a compromised M2M token after
  deactivation is one hour.

## 10. Tests

No executable tests were run: Stytch is a closed platform, the task involves no Stytch
account, and no external mutation was performed. The mechanisms were verified by
cross-reading independent official pages (guide text agrees with API reference text on
rotation phases, token lifetimes, revoke semantics, and JWKS rotation windows). Any
clean-room re-derivation should be tested for these mechanical properties, all stated in
the docs:

1. exactly-one-of argument enforcement rejects ambiguous identity (authenticate, revoke);
2. during rotation-start window both secrets authenticate; after complete only the new one
   does; after cancel only the old one does;
3. deactivating a client blocks `/token` issuance but a previously issued JWT still validates
   locally until `exp`;
4. during JWKS rotation grace, tokens signed by either key validate via `kid` selection;
5. revoking a session by any one of its three identifiers kills validation by all three.

## 11. Verdict: ADAPT (with reason)

**ADAPT** — re-derive the mechanisms clean-room into PING's trust-kernel; adopt zero code
(none exists to adopt; the platform is closed-source).

Reason: the patterns are proven at SaaS scale and directly answer the worker-authentication
gap in proofs 9–13: (a) a first-class non-human identity object with a hash-stored secret;
(b) short-lived scoped bearer JWTs minted from long-term credentials via the standard
client-credentials grant; (c) a two-secret overlap rotation state machine that makes
rotation zero-downtime; (d) session-scoped revocation that kills all derived tokens in one
call; (e) per-action `request_id` receipts; (f) the explicit latency-vs-revocation-lag
tradeoff between JWT and opaque tokens. These are design facts, not code, and they are
exactly what a trust-kernel needs to mint and govern worker credentials. NOT reject:
the missing primitive is real and load-bearing for the mission loop. NOT adopt: there is
no artifact to adopt, and the SaaS dependency itself must never enter piging2.

## 12. SMALLEST MISSING PRIMITIVE

**A kernel-minted workload identity with hash-stored rotatable secret, short-lived scoped
JWT issuance, and one-call session-scoped revocation — plus a token-generation epoch that
Stytch itself lacks.**

PING has user sessions, capabilities, and missions, but no first-class *non-human*
workload identity: today a worker proving "I am the authorized executor of mission M"
has no credential shape of its own distinct from a user session. The minimal primitive,
re-derived from Stytch's M2M + session mechanisms:

- `workload_id` (trust-kernel minted, project-unique) + `workload_secret` (hash-stored,
  shown once, rotatable via start/complete/cancel overlap with both-secrets-valid window);
- `issue_workload_token(workload_id, scopes_subset)` -> 1-hour scoped bearer JWT signed by
  the kernel's key set, locally verifiable by any resource via the kernel JWKS endpoint;
- `revoke_workload(workload_id)` -> immediate issuance block **and** a per-workload token
  generation counter bumped and embedded in every issued JWT, checked on local validation —
  this closes Stytch's own documented gap (deactivation not killing in-flight M2M tokens):
  in PING, revocation kills both future issuance and in-flight tokens, with zero extra
  round trips on the hot path.

This is the smallest unit that makes proofs 9–13 meaningful: mission creation (9) binds a
mission to a workload identity; the worker's result (10) is presented with a workload
token; an injected bad result (11) fails because the token's scopes/identity don't cover
the claimed action; a fallback attempt (12) re-issues under a fresh workload token; and
VERIFIED (13) requires the independent verifier to authenticate as its own workload and
the result's token chain to check out. Scope-subsetting per issuance (`action:resource`
pattern) gives least-privilege per mission without new machinery.

## 13. Dependency analysis

- **Dependencies: none.** Zero code, zero libraries, zero services are incorporated. This is
  a mechanisms-only harvest; the re-derivation will be pure PING code over existing
  primitives (canonical bytes/digest/signing already in the trust-kernel's scope).
- **Dependency cost: zero.**

## 14. License finding

- Stytch platform: **closed-source commercial SaaS** — no source available, no license to
  take, nothing copied. All material above is paraphrased mechanism description derived from
  public official documentation. FLAG for Nolan: none needed on copyleft — there is no
  GPL/SSPL/BSL artifact involved — but the standing rule holds: the Stytch *service* must
  never become a runtime dependency of piging2; only the re-derived mechanisms enter.
- stytchauth/stytch-node SDK: **MIT** (verified at
  https://github.com/stytchauth/stytch-node/blob/main/LICENSE on 2026-10-02). Not
  incorporated; recorded for completeness.
- No copied proprietary code exists in this proposal or in any file produced by this worker.
