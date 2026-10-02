# LANE L — SECRET BROKER (P0 INFRA)

## STATUS: PROVEN
Secret boundary proven end-to-end: an agent performed an authenticated connector
fetch with the secret never appearing in its context, logs, observation, or
audit. 24/24 red-team tests pass (repo jest); tsc --strict clean.
Implementation lives as an uncommitted diff in isolated worktree
`/home/nolan/projects/ping-lane-l-broker` (branch `lane/l-secret-broker`,
announced here per commit policy — NO commits made, none planned). Main
worktree (`fyd-factory`, dirty) and constitutional worktree untouched.

NEXT: lanes BCQ/CONN build against the contract below; migration of existing
`process.env` direct reads (auth-manager.ts, audit.ts) to the broker port is a
follow-up integration request, not this lane's write.

## LANE LEDGER
- 2026-09-23 RESEARCHED: PING secret search — no broker existed. Current pattern
  is direct `process.env` reads (auth-manager.ts, audit.ts, oauth.ts types,
  dev-signer.ts for dev keys). Git history: no secret-incident commit found;
  only `.env.example` tracked. Prior dispatch artifacts found in this state dir
  (HARVEST-REPORT.md, SECRET-BROKER-DESIGN.md v1, go-macaroon clone); both
  converge on the same winner (hand-built PING broker, zero new deps).
- 2026-09-23 HARVESTED: pymacaroons cloned @ 78c55c1d33a0b23ddc71140a9c999f957d79e9dd
  (MIT), deps installed, 3 test modules pass, attenuation exercised firsthand
  (attenuated macaroon verifies; tampered rejected). Full table in HARVEST.md:
  macaroons PATTERN_ONLY, Biscuit REJECT (Datalog coupling, never audited),
  Vault REJECT as dep (BSL license + weight), SPIFFE PATTERN_ONLY (reject
  running SPIRE: weight), STS/RFC8693/capability-URLs/k8s projected tokens
  PATTERN_ONLY. OpenBao (MPL 2.0) noted from prior harvest; still REJECT as dep
  (weight dwarfs value; would surrender custody authority).
- 2026-09-23 IMPLEMENTED: `src/lib/secrets/secret-broker.ts` (~450 lines, zero
  deps) + scoped `jest.config.cjs` + `README.md` consumer port, all in the
  isolated worktree.
- 2026-09-23 TESTED: 24/24 red-team tests pass under repo jest; tsc --strict clean.
- 2026-09-23 FALSIFIED (1): `timingSafeEqual` on unequal-length scope strings
  throws RangeError instead of denying (found by the wrong-audience test).
  FIXED: digest-then-compare. Verified by re-run.
- 2026-09-23 FALSIFIED (2): provider errors propagate across the seam verbatim —
  a 401 body echoing the key (or a `.cause` chain) would leak the secret into
  the caller's error and the audit reason (RT-1 from prior design §8).
  FIXED: seam error masking — caller gets only the lane-K code + correlation
  id; audit records the sanitized reason. Proven by the RT-1 test.
- 2026-09-23 CONVERGED: absorbed prior design v1's load-bearing deltas into the
  implementation — REQUIRED tenantId scope axis (caller can never substitute a
  tenant), `renew()` with 24h total-lease cap, optional `purpose` audited.
  Handle format stays `pingsec_1_` per the lane task spec (prior design used
  `cap_`; if lane BCQ adopts SB-3's handle-pattern log scan, the pattern must
  be `pingsec_1_[A-Za-z0-9_-]{43}`).
- 2026-09-23 PROVEN: proof.ts — agent fetch end-to-end, canary scan over
  everything agent-visible: PASS. Audit shows issued+executed with handle
  fingerprint, tenant, purpose, outcome; zero secret values.

## SECRET BROKER HANDLE CONTRACT (v1 — published for lanes BCQ/CONN)

Agents NEVER receive tokens. They receive an opaque capability handle from the
broker, scoped to a single authorized action. The broker resolves the real
secret at execution time inside a trusted execution seam (the connector runtime),
never in agent-visible context.

### Handle request
```ts
broker.request({
  principal:   "connector:github:svc-1",  // attested worker identity
  operation:   "fetch:issues",            // closed verb + object
  target:      "github.com/owner/repo",   // target identity
  tenantId:    "tenant-acme",             // REQUIRED, from trusted context
  audience:    "connector-runtime-seam",  // trusted seam id
  ttlSeconds:  300,                       // default; HARD CEILING 900
  maxUses:     1,                         // default; single-use
  credentialId:"GITHUB_CONN_TOKEN",       // stored-credential id (env now, KMS later)
  purpose:     "nightly issues sync",     // optional, audited
}) // -> "pingsec_1_<base64url 32 random bytes>"
```
Issuance is policy-checked (inject `authorize`; default DENY). Unknown
audiences rejected at request time.

### Execute
```ts
const observation = await broker.execute(handle,
  { principal, operation, target, tenantId, audience }, // EXACT match required
  async (secret) => { /* secret visible ONLY inside this closure */ });
```
- Scope mismatch on ANY of the 5 axes -> PERMISSION_DENIED (no downgrade).
- Unknown handle -> AUTH_REQUIRED; expired -> EXPIRED; revoked/exhausted -> PERMISSION_DENIED.
- Secret backend unreachable -> SOURCE_UNAVAILABLE and the work function NEVER runs (fail closed).
- The secret is passed only to `fn`; it is never returned to the caller.
- SEAM ERROR MASKING: anything thrown inside `fn` is masked — the caller gets a
  BrokerError with only the lane-K code (TRANSIENT) + correlation id; the audit
  records the sanitized reason. Provider error bodies / `.cause` chains can
  never carry secret material across the seam.

### Renew
`broker.renew(handle, assertedScope, extendSeconds)` extends a LIVE lease:
re-checks full 5-axis scope and credential validity; `extendSeconds` in
(0, 900]; total lifetime from issuance capped at 24h (then re-issue).
Audited as `renewed`.

### Attenuation (macaroon-style, server-side)
`broker.attenuate(handle, { ttlSeconds?, maxUses? })` derives a narrower handle:
same 5 scope axes, only TTL may shrink and uses may drop. Never widens.
Parent linked in audit.

### Revocation & rotation
- `broker.revoke(handle)`; `broker.revokeAll(principal)` kill switch (returns count).
- `broker.rotate(credentialId, newValue)`: outstanding UNEXECUTED handles resolve the
  new value; executed handles are sealed. No secret values in audit, ever.

### Audit trail
`broker.auditTrail()` -> append-only records: seq, ts, event
(issued/executed/denied/revoked/rotated/attenuated/renewed), handle fingerprint
(sha256, correlatable but NOT replayable), principal, operation, target,
tenantId, audience, purpose, outcome, reason, usesLeft. NEVER the secret value
(by construction; enforced by test).

### Failure codes (program taxonomy; converge to lane K's enum when published)
AUTH_REQUIRED | EXPIRED | PERMISSION_DENIED | SOURCE_UNAVAILABLE | RATE_LIMITED |
TIMEOUT | TRANSIENT | PERMANENT

### What this does NOT do
- Not a vault (storage backend is pluggable: env/file now).
- Not an auth protocol (no OAuth flows; consumes credentials BCQ/CONN obtain).
- Not agent identity (principal strings come from the worker registry).
- Zero dependencies. No new database. No second custody pattern: ALL connector
  secret access migrates to this port.
- Defense in depth (not this lane's code, already exists): `~/workspace/tools/redact-secrets.py`
  for diagnostics; BCQ kit's canary scan (`findCanaryLeaks`) for outputs.
