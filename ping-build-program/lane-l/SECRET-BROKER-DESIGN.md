# SECRET BROKER DESIGN — Lane L (P0 infra)

Status: design v1, integration proposal. Extends the v0 handle contract in
STATE.md without contradicting it. NOT implemented inside PING source.

## 1. Problem

Connectors multiply credentials. Every new source (Facebook, Google Business
Profile, ATProto, GitHub, ...) brings OAuth refresh tokens, API keys, or
session cookies. The current PING pattern reads them from env into process
memory (`auth-manager.ts`, `kit-adapter.ts`, `audit.ts`, `controller.ts` all
touch `process.env.GOOGLE_REFRESH_TOKEN` directly). Consequences:

- Any code in the process can copy a token. Nothing stops it reaching logs,
  events, or agent context except discipline.
- Rotation is manual: N call sites re-read env; there is no single revocation
  point and no audit of who used what when.
- The password incident (2026-09-21, Postgres credential exposed, rotated as
  a full incident) proved the cost of exceptional manual handling. Custody
  must be systematic, not exceptional.

The lesson: ONE custody pattern. Agents receive CAPABILITY HANDLES, never
credentials. The connector worker resolves capability to credential internally
at call time, inside a trusted seam, and the secret never crosses into agent
context.

## 2. Design principle

The broker is the SOLE custody authority for connector credentials in PING.
It does not store business data, does not interpret payloads, does not grant
business capabilities (that is lane S), and does not own canonical objects.
It owns exactly one thing: the mapping from opaque capability handle to
credential, for the duration of a lease, with an audit record per resolution.

```
AGENT / CONNECTOR CODE                BROKER (trusted seam)              PROVIDER
  holds: cap_...                  holds: handle -> credential map
        |  execute(handle, fetch) ------> | resolve internally
        | <------ observations only ----- | ---(secret stays here)---> API
        |  (never sees secret)           | audit: who/when/why (redacted)
```

## 3. PING ALREADY HAS (do not duplicate)

Ground truth from the read-only repo audit, 2026-09-23:

1. Env-only intake: secrets come from env, never hardcoded. `.env` gitignored
   since the initial commit. `src/lib/infrastructure/auth-manager.ts` documents
   never-hardcode / never-print-refresh-token guardrails.
2. Dev-key custody precedent: `src/lib/ping/dev-signer.ts` reads private keys
   from `PING_DEV_KEY_DIR` (outside the git tree), keys never reach the
   browser, never serialized into API responses, logs, or events. This is the
   ancestor of the broker pattern.
3. Redaction filter: `~/workspace/tools/redact-secrets.py` (stdin to stdout,
   KEY=VALUE / JSON / Authorization-Cookie headers, conservative), 22/22
   regression cases passing (`test-redact-secrets.py`).
4. Standing inspection rule (2026-09-21): normal diagnostics must be safe to
   copy; secret-like names render ***REDACTED***; raw secret inspection only
   as an explicit exceptional machine-local action.
5. BCQ contract (lane BCQ, v1.0): credential refs are vault pointers, never
   raw secrets; `CredentialRef` opaque type in testkit; secret canary planted
   in provider responses and scanned across observations/logs/fetch attempts;
   Nango ADOPT (bounded): proxy-only surface, `getConnection` never exposed,
   the Nango env key held by this lane's broker as a capability.
6. `src/fyd/identity/audit.ts::redactEmail` — audit-layer redaction precedent.

GAPS the broker fills: no unified issuance/resolution/revocation point; no
per-resolution audit; no handle TTL/lease semantics; no attenuation; OAuth
tokens have no at-rest encryption in code today (ENCRYPTION_KEY documented
but unused); raw env reads are scattered across call sites.

## 4. Custody boundary map

Secrets MAY exist in exactly three places:

- (a) The broker custody store: encrypted at rest (envelope encryption; KEK
  held outside the store, never in snapshots or git), access only through
  the broker SPI.
- (b) The connector worker's process memory DURING an in-flight provider
  call, ephemeral mode only, zeroed immediately after use. Proxy mode (the
  default, via the Nango-pattern transport) eliminates even this: the
  transport injects auth server-side and the worker never holds material.
- (c) Provider TLS in transit.

Secrets MUST NEVER appear in: PING objects, journal/event payloads, evidence
records, SiteSpec, agent context (prompts, tool args, tool results),
browser-accessible surfaces, diagnostics, logs, fixtures, test snapshots,
checkpoints, cursors, audit records, backups (plaintext), or git.

Enforcement is layered: the SPI makes it structurally hard (no API returns
material to agents), the redaction filter makes it observably safe
(diagnostics pipe through `redact-secrets.py`), and the contract test kit
makes it provable (canary scans; see INTEGRATION-REQUEST-lane-l.md).

## 5. Handle lifecycle

### 5.1 Issuance
`issue()` is called only from trusted code paths: the OAuth callback handler
(morning connect flow), the operator console, or an already-authorized worker
renewing. Never from agent tool calls. The request binds:

- principal: worker identity from the worker registry (named, never
  "the system")
- operation: closed verb + object, e.g. `fetch:reviews`
- target: source identity, e.g. `facebook:page:61594275542163`
- tenantId: REQUIRED, from trusted context (memory 2026-09-22: the caller
  cannot substitute an arbitrary tenant through a request body)
- audience: the execution seam id that may resolve it
- credentialRef: internal pointer to the stored credential (versioned)
- ttlSeconds: lease duration, hard ceiling 900s (v0 contract)

The broker stores `sha256(handle)` -> record. The handle value itself is
never stored. Handle format: `cap_` + 256-bit CSPRNG, base64url.

### 5.2 Scoping (least privilege)
Scope is set at issuance and can only narrow afterward, never widen. Narrowing
(`attenuate()`) follows the macaroon caveat pattern: a holder requests a
child handle with additional first-party caveats (expiry, operation subset,
rate budget, purpose string, tenant pin). The broker verifies the parent,
issues the child, and links them in the audit trail. A compromised narrow
handle cannot be widened back.

### 5.3 Renewal
`renew()` extends a lease before expiry, re-checking principal, audience, and
that the underlying credential is still valid and unrevoked. Renewal is
audited like issuance. Max total lease lifetime is bounded by policy
(default: 24h), after which a fresh issuance (re-consent check) is required.

### 5.4 Rotation
Credentials sit behind a versioned `credentialRef`. `rotate(credentialRef)`
writes the new material (re-encrypted) and bumps the version. Outstanding
UNEXECUTED handles resolve to the new value; EXECUTED handles are sealed
(their resolution records are immutable history). Connectors use handles, so
rotation touches one store, not N call sites. This is the systematic answer
to the password incident: rotation is a broker operation with proof, not a
manual env edit.

### 5.5 Revocation
`revoke()` accepts a handle, a principal, a (tenant, source) pair, a
credentialRef, or global kill-switch. Revocation is immediate and audited.
Per the connector contract, revocation stops future fetches; already-ingested
evidence stays, marked `source_revoked_at`. Handles also die by expiry;
expired handles are rejected with AUTH_EXPIRED (lane K taxonomy).

### 5.6 Audit
Every `issue`, `attenuate`, `resolve` (granted or denied), `renew`, `revoke`
emits an audit record: timestamp, handle fingerprint (first 12 chars of the
sha256, enough to correlate, useless to replay), principal, operation,
target, tenant, decision, reason, lease remaining. Records carry redacted
references only, never material, never full handle values. The audit log is
append-only and queryable via `audit()`.

## 6. Minimal broker interface (integration proposal)

TypeScript SPI. The BCQ substrate consumes this as its `AuthBroker` port
(`fetchViaConnection` is one method built on `execute`). A Python dataclass
mirror follows the same field names for the testkit.

```ts
/** Opaque to everyone except the broker. Agents may carry the id as a string. */
type CapabilityHandle = `cap_${string}`;

interface Caveat { kind: string; value: string; }
/* kinds: "exp" (RFC3339), "op" (operation subset), "tenant",
   "budget" (max resolutions), "purpose" (free-text, audited) */

interface HandleScope {
  connectorId: string;
  sourceId: string;
  tenantId: string;            // REQUIRED, from trusted context
  operations: string[];        // closed verbs, e.g. ["read:reviews"]
  scopes: string[];           // provider scopes granted, least privilege
}

interface WorkerIdentity { kind: "worker"; id: string; seam: string; }

interface IssueRequest {
  principal: WorkerIdentity;
  scope: HandleScope;
  credentialRef: string;      // internal, versioned pointer
  ttlSeconds: number;         // <= 900 hard ceiling
  purpose: string;
}

interface ResolveRequest {
  handle: CapabilityHandle;
  caller: WorkerIdentity;     // mTLS/service identity; must match audience
  tenantId: string;           // must equal handle.scope.tenantId
  sourceId: string;           // must equal handle.scope.sourceId
  purpose: string;
}

interface SecretBroker {
  /** Trusted paths only (OAuth callback, operator, authorized worker). */
  issue(req: IssueRequest): Promise<CapabilityHandle>;

  /** Narrow a handle. Child linked to parent in audit. Never widens. */
  attenuate(handle: CapabilityHandle, caveats: Caveat[],
            caller: WorkerIdentity): Promise<CapabilityHandle>;

  /**
   * Resolve inside the trusted seam. The secret NEVER returns to the
   * caller; instead the caller supplies the work to run while the
   * credential is available (v0: broker.execute(handle, fn)).
   */
  execute<T>(handle: CapabilityHandle, caller: WorkerIdentity,
             tenantId: string, sourceId: string,
             fn: (auth: ProviderAuth) => Promise<T>): Promise<T>;

  /** Extend a lease. Re-checks principal/audience/credential validity. */
  renew(handle: CapabilityHandle, caller: WorkerIdentity,
        extendSeconds: number): Promise<CapabilityHandle>;

  /** Immediate. Selector: handle | principal | tenant+source |
      credentialRef | global. Audited. */
  revoke(selector: RevokeSelector, reason: string,
         caller: WorkerIdentity): Promise<{ revoked: number }>;

  /** Metadata only: scope, state, expiry, fingerprint. Never secrets. */
  inspect(handleRef: string): Promise<HandleMetadata>;

  /** Redacted audit records. Query by time range, principal, tenant, decision. */
  audit(q: AuditQuery): Promise<AuditRecord[]>;

  /** Rotate stored material behind a credentialRef. Seals executed handles. */
  rotate(credentialRef: string, caller: WorkerIdentity): Promise<{ version: number }>;
}

/** What `fn` receives inside execute(). Two modes: */
type ProviderAuth =
  | { mode: "proxy"; ticket: string }        // default: transport injects auth server-side (Nango pattern)
  | { mode: "ephemeral"; material: SealedMaterial };  // short-lived, zeroed after fn returns
```

Notes:
- `execute(handle, fn)` is the concrete form of the charter's
  "resolve at call time": resolution and use are atomic from the caller's
  perspective, so there is no window where material sits in caller memory.
- Ephemeral mode exists only for providers the proxy cannot serve; the
  material is sealed (opaque wrapper, no string extraction API), single-use
  where the provider allows, TTL <= 60s, zeroed after `fn` settles.
- Failure mapping (lane K): unknown/expired/revoked handle -> AUTH_REQUIRED
  / AUTH_EXPIRED; principal/audience/tenant/source mismatch ->
  PERMISSION_DENIED; broker store unreachable -> SOURCE_UNAVAILABLE
  (fail closed: no execution).

## 7. Connect-flow binding (queued for morning, Nolan-gated)

The standing decision defines the flow: CONNECT SOURCE -> provider ->
requested permissions explained -> OAuth authorization (PKCE) -> callback ->
encrypted/token custody -> source capability inventory. The broker's role is
the "encrypted/token custody" step:

1. Callback handler (server-side) completes the OAuth code exchange.
2. It calls `broker.issue()` with the tenant from trusted context, the
   granted scopes (smallest set for the demonstrated feature), and the
   freshly obtained credential material, which the broker encrypts into the
   custody store behind a new `credentialRef`.
3. The handler returns to the browser ONLY a success/failure status and the
   capability inventory. No token, no handle value, no material.
4. The connector worker later `issue()`s short-lived handles per fetch run
   (or per batch), scoped to the tenant+source.

Nothing connects tonight. No live credentials in this lane; fixtures and
recorded responses only.

## 8. Red-team results

Each scenario: attack -> prevention -> detection -> the test that proves it.
The failure tests are the acceptance suite for any broker implementation.

### RT-1: Token leakage via error messages and stack traces
Attack: provider returns 401 with the API key echoed in the error body; or a
thrown error's `.cause` chain carries the refresh token; stack trace lands in
a journal event.
Prevention: `execute()` wraps provider errors at the seam: the typed error
carries only the lane-K code (AUTH_EXPIRED) + correlation id; provider bodies
are never propagated. All diagnostics exiting the seam pipe through the
`redact-secrets.py` filter. `ProviderAuth` material is sealed: no string
extraction API exists, so it cannot be interpolated into a message.
Detection: contract kit scans every emitted surface (observations, events,
logs, fetch attempts) for the secret canary AND secret-shaped regexes.
Failure test: `test_error_body_canary` — mock provider returns an error body
containing the canary token; run a full fetch; assert the canary appears in
no observation, event, log line, checkpoint, or journal payload. Variant with
the canary nested in `error.cause.cause`.
Proven by: BCQ canary scan (exists) + the new error-path cases in
INTEGRATION-REQUEST-lane-l.md.

### RT-2: Cross-tenant handle confusion
Attack: tenant A's handle is presented with tenant B's tenantId (malicious or
buggy worker) to read B's source.
Prevention: `execute()` requires caller-supplied tenantId+sourceId and
compares against the handle's bound scope; mismatch -> PERMISSION_DENIED, no
resolution, no partial data. Storage is namespaced by (tenant, source,
connector); the handle id encodes nothing derivable.
Detection: the denied attempt is audited with caller identity; repeated
mismatches from one principal trigger the kill switch (revoke by principal).
Failure test: `test_cross_tenant_handle_rejected` — issue handle for
(tenantA, sourceX); call execute with tenantB; expect PERMISSION_DENIED;
assert B's credential was never loaded (resolution counter unchanged) and
the audit contains the denied attempt.
Proven by: adversarial cross-tenant tests, matching the tenant-boundary
contract (memory 2026-09-22: caller cannot substitute tenant via request).

### RT-3: Compromised connector worker
Attack: the worker host is compromised; attacker holds the worker's identity
and its issued handles.
Prevention: handles are scoped to (connector, tenant, source, operations);
proxy mode means the worker never holds secret material at all, so the
attacker gains fetch capability, not credentials. Attenuated short-TTL
handles bound the blast radius to one tenant+source for <= 900s.
Detection: resolution audit shows volume/anomaly per principal; operator
revokes by principal (one call) — all its handles die immediately.
Failure test: `test_worker_compromise_blast_radius` — simulate compromise by
revoking the worker principal mid-run; assert subsequent execute() calls fail
AUTH_REQUIRED, no other tenant's handles are affected, and the audit shows
the exact set of resolutions the compromised principal performed.
Proven by: revocation is O(1) per principal and audited; no credential
material exists on the worker in proxy mode to exfiltrate.

### RT-4: Handle captured from logs
Attack: a handle value leaks into a log line (bug, or an operator pastes
diagnostics).
Prevention: handles are 256-bit random and stored server-side as
sha256(handle); the value is useless without the broker, and `execute()`
additionally requires the caller's worker identity (mTLS/service token) to
match the audience. Handles expire (<= 900s). Log policy forbids handle
values; the secret-shaped scanner treats `cap_` values as sensitive.
Detection: a resolution attempt from an unexpected caller identity is denied
and audited; the legitimate owner can revoke the leaked handle by
fingerprint.
Failure test: `test_leaked_handle_unusable` — plant a real handle value in a
log fixture; assert the kit's log scanner flags it; then attempt execute()
with that handle from a different caller identity; expect PERMISSION_DENIED.
Proven by: bearer-ness of the handle is bound to caller identity, not just
possession.

### RT-5: Prompt-injection attempting to exfiltrate a handle's credential
Attack: provider content (or a crafted page) contains instructions telling the
agent to "reveal the API key for handle cap_..." or to call a tool that
returns the secret.
Prevention: agents have no `execute()`/`resolve()` in their tool surface at
all — the port exists only in the connector worker's trusted seam. Agents
may carry handle ids as opaque strings, but there is no path from handle id
to credential material in agent-reachable code. The broker never returns
material to anything except the inside of `execute(fn)`.
Detection: any unexpected call into the broker SPI from an agent context is a
P0 anomaly (audited, alerted).
Failure test: `test_no_agent_resolution_path` — static assertion over the
agent tool registry: no tool exposes broker execute/resolve/inspect-with-
material; plus a prompt-injection corpus (provider payloads containing
"reveal the key" instructions) run through a harness agent: assert no
resolution occurs and the audit log shows zero broker calls from agent
principals.
Proven by: architectural absence, verified by test, not by policy text.

### RT-6: Backup/snapshot capturing resolved secrets
Attack: a database backup, VM snapshot, or fixture dump captures the custody
store or a worker heap containing ephemeral material.
Prevention: custody store is encrypted at rest with envelope encryption; the
KEK lives outside the store and outside snapshots (operator-held env/HSM);
snapshots contain ciphertext + handle hashes + metadata only. Ephemeral
material is never persisted by design (no code path writes it). Fixtures and
test snapshots are scanned by the kit; any secret-shaped value fails the
build.
Detection: restore drill without the KEK must fail closed (broker refuses to
start, SOURCE_UNAVAILABLE, no execution) rather than serving plaintext.
Failure test: `test_snapshot_contains_no_plaintext` — seed the store with a
canary credential, take a store snapshot, assert the canary appears nowhere
in the snapshot bytes; `test_restore_without_kek_fails_closed` — attempt
broker boot with snapshot but no KEK; expect refusal, zero resolutions.
Proven by: the ENCRYPTION_KEY pattern finally implemented as designed
(currently documented-but-unused in `.env.example`).

## 9. Kill criteria applied to this design

- License: no new dependency. The SPI is hand-written; macaroon caveats are
  an adapted pattern (BSD-3-Clause reference, not vendored).
- Canonical authority: the broker owns custody only; it cannot become an
  object/event/identity authority (its API cannot express those concepts).
- Secret model: safe by construction (handles, sealed material, proxy-first).
- Provenance: preserved; the broker never touches payloads.
- Isolation: storage backend is a pluggable port; a future OpenBao backend
  can sit behind the SPI without changing the handle interface (optionality).
- Weight vs value: one small module + one store port; no server to operate
  at v1 (env/file backend). Rejected: operating Vault/OpenBao clusters for
  two OAuth providers.
- PING already solves it: partially (env discipline, redaction filter,
  dev-signer precedent, BCQ canary). The broker is the missing thin layer,
  not a duplicate.

## 10. Optionality test

- Replace the credential store backend (env/file -> OpenBao -> cloud KMS):
  yes, behind the store port; handle interface unchanged.
- Add a new credential type (API key today, OAuth tomorrow, mTLS certs
  later): yes, `credentialRef` is type-tagged; `ProviderAuth` gains a mode.
- Replace the transport (Nango proxy -> hand-rolled): yes, BCQ's
  `AuthBroker` SPI owns that seam; the broker only supplies custody.
- Rebuild the audit projection: yes, audit records are plain data.
- Trace a resolution to evidence: yes, via resolutionId + handle fingerprint.

## 11. Non-goals

Not a vault product (no UI, no dynamic credential minting for databases).
Not an OAuth implementation (the connect flow lives in lane CONN/BCQ; the
broker consumes what it produces). Not agent identity. Not a replacement for
the standing inspection rule: defense in depth keeps the redaction filter.

## Appendix: file map for the coordinator

- This design: `lane-l/SECRET-BROKER-DESIGN.md`
- Harvest evaluation: `lane-l/HARVEST-REPORT.md`
- Redaction test draft for the kit: `lane-bcq/INTEGRATION-REQUEST-lane-l.md`
- Harvested mechanism (research only, not vendored):
  `lane-l/harvest/macaroon/` (go-macaroon/macaroon, BSD-3-Clause)
- PING-side precedents: `~/workspace/tools/redact-secrets.py` (+ 22 tests),
  `src/lib/ping/dev-signer.ts`, `src/fyd/identity/audit.ts::redactEmail`
