# Harvest Proposal: Infisical agent-vault

**Subject:** Credential brokering for AI agents — scoped agent identities, placeholder-substitution
injection proxying, revocation cascades, secret-free audit trail.
**Upstream:** https://github.com/Infisical/agent-vault
**Head commit read:** `872578e4cdf9e03d5e3bcb5512023a70bf90ed65` (main, 330 commits, 56 releases)
**License:** MIT Expat (Copyright (c) 2022 Infisical Inc.), verified from
https://raw.githubusercontent.com/Infisical/agent-vault/main/LICENSE — no `ee/` directory present
in this repo, no GPL/copyleft/SSPL/BSL. No flag needed.
**Verdict: ADAPT** — take the mechanism, rewrite to PING semantics.
**AUTHORITY_OWNER:** trust-kernel (safe credential-use boundary at egress; collaborates with
capability-kernel for grants)
**proof_ids:** [9, 10, 11, 13, 14]

---

## 1. What I read (primary sources only)

All reads at commit `872578e4cdf9e03d5e3bcb5512023a70bf90ed65` unless noted.

| # | Source | What it established |
|---|--------|---------------------|
| 1 | https://github.com/Infisical/agent-vault (repo README) | Product shape: HTTP credential proxy + vault for AI agents (Claude Code, OpenClaw, **Hermes**, custom agents). MITM proxy on :14322, management API/UI on :14321. Dummy-value substitution (`__anthropic_api_key__` -> real key). Multi-tenancy, egress filtering, request logging, strict deny mode (`unmatched_host_policy=deny` -> 403). Agent Vault (OSS, this repo) vs commercial "Infisical Agent Vault" (time-bound sessions, access bundles). |
| 2 | https://docs.agent-vault.dev (Introduction) | Mechanism narrative: agent holds dummy credentials; server swaps them for real ones at the proxy boundary before forwarding. Agent never holds real credentials. |
| 3 | https://docs.agent-vault.dev/agents/overview | Agent model: instance-level entity (like users), instance role (`owner`/`member`/`no-access`, default `no-access`), multi-vault grants with per-vault role (`proxy`/`member`/`admin`). Two connection modes: `vault run` wrapper (temporary vault-scoped session, no token to manage) vs named agent + long-lived token (`av_agt_…`) via `AGENT_VAULT_TOKEN`. Ephemeral-sandbox pattern: orchestrator mints short-lived token, passes into sandbox. Rotation invalidates old token immediately. |
| 4 | `internal/brokercore/substitution.go` | `ResolvedSubstitution{Placeholder, Value, In}` — `In` subset of {path,query,header,body,websocket} is the security boundary. Fail-closed: "On error, callers must not forward the request — partial mutations may have been applied." Header injection gets CRLF guard. Body substitution is content-type-aware (form→QueryEscape, JSON→string-escape, multipart skipped). |
| 5 | `internal/brokercore/session.go` | `ProxyScope{AgentID, UserID, VaultID, VaultName, VaultRole}` resolved once per CONNECT. Scoped sessions bake the vault in (hint must match, never silently retarget). Instance-level agent tokens resolve vault per-request via hint + `GetVaultRole`, or single-grant inference; ambiguous → error. Sentinel error taxonomy (`ErrInvalidSession`, `ErrVaultHintMismatch`, `ErrVaultAccessDenied`, …). |
| 6 | `internal/brokercore/brokercore.go` | `ApplyInjection`: strips hop-by-hop + broker-scoped headers (`Proxy-Authorization`, `X-Vault`) so they never traverse the broker→target hop; "injected always wins" — injected header keys are pre-stripped from client headers so a prompt-injected agent cannot override the real credential with its own value. `Set-Cookie` stripped from responses. `X-Agent-Vault-Proxy-Error` distinguishes broker errors from upstream. |
| 7 | `internal/brokercore/logging.go` | `ProxyEvent` is secret-free **by construction**: no header values, no bodies, no query strings — only method, host, path (no query), matched service/host/path patterns, credential **key names** (UPPER_SNAKE), status, latency, error code, auth scheme/header **name**. |
| 8 | `internal/broker/broker.go` (lines 0–605) | `Service{Name, Host, Path, Port, Enabled, Auth, Substitutions}`; `Auth` types: bearer/basic/api-key/custom (`{{ KEY }}` header templates)/passthrough. Credential keys validated UPPER_SNAKE_CASE. `Auth.Resolve(getCredential)` maps credential **names** → headers; the agent config references names only. |
| 9 | `internal/store/store.go` (model + Store interface) | Object model (see §2). Key facts: `Agent{ID, Name, Role, Status: active\|revoked, RevokedAt, Vaults: []VaultGrant}`; `VaultGrant{ActorID, ActorType: user\|agent, VaultID, Role: proxy\|member\|admin}`; `Session{ID, UserID, VaultID, AgentID, VaultRole, ExpiresAt (*nil = never), PublicID, LastUsedAt, IdleTTL, Label, CreatedByActorID/Type}`; `Credential{ID, VaultID, Key, Type: static\|oauth, Ciphertext, Nonce}` — ciphertext opaque to the store; `RequestLog` (secret-free); `DynamicSecretLease` (lease metadata only, never values); `Proposal{ID (sequential per vault), SessionID, Status, ServicesJSON, CredentialsJSON, ApprovalToken, ApprovalTokenExpiresAt}`. |
| 10 | `internal/store/sql_store.go` (excerpts) | `hashSessionToken` = SHA-256 hex of raw token; sessions table `id` = token hash. `newUUID()` = crypto/rand UUIDv4. `newPrefixedToken`: prefix + 32 random bytes hex → `av_sess_…`, `av_agt_…`, `av_appr_…`. `newPublicID` = 80-bit random hex handle "so the underlying token hash never appears in logs or URLs." `RevokeAgent`: sets `status='revoked'` + `DELETE FROM sessions WHERE agent_id=? OR (created_by_actor_id=? AND created_by_actor_type='agent')` — with comment explaining the second branch closes the orphan-token hole (revoked agent's minted tokens would otherwise keep proxying until TTL). `RotateAgentToken`: DELETE all tokens + reactivate + mint new, **single transaction** "so the agent is never stranded without a token." `CreateProposal`: approval token hashed, TTL 24h (`approvalTokenTTL`), sequential per-vault ID under row lock. `ApplyProposal`: updates broker config + upserts credentials + deletes keys + `UPDATE proposals SET status='applied' … WHERE status='pending'` — "status guard prevents double-apply race." |
| 11 | `internal/store/039_request_logs.go`, `049_request_logs_auth_detection.go` (name), `050_dynamic_secret_leases.go` | `request_logs` table: vault_id, actor_type, actor_id, ingress, method, host, path, matched_service, credential_keys (JSON array of names), status, latency_ms, error_code, auth_scheme, auth_header, created_at. `dynamic_secret_leases`: lease_id PK, vault FK cascade, project/env/path, expire_at — "only lease metadata + the config snapshot needed to call revoke — never the leased credential values, which live in process memory for their TTL only." Revoked on disconnect/shutdown, orphans swept on startup. |
| 12 | `internal/auth/auth.go` | Envelope encryption: random 32-byte DEK; sentinel (`"agent-vault-master-key-check"`) encrypted with DEK to verify unlock; password mode wraps DEK under Argon2id-derived KEK (salt + params persisted); passwordless stores DEK plaintext (filesystem ACLs are the boundary). `MasterKey.Wipe()` zeros key material; KEK wiped after use. User passwords: Argon2id + constant-time compare. |
| 13 | `internal/proposal/proposal.go` | Proposal lifecycle: `Status`: pending→applied\|rejected\|expired. `Action`: set (idempotent upsert) \| delete. Credential slots: value optional — if omitted, the **human supplies it during approval** (agent never sees it). OAuth config carried separately. |
| 14 | https://github.com/Infisical/agent-vault/blob/HEAD/docs/guides/deploy-agent-container.mdx | Rotation semantics confirmed from docs: "The old token is invalidated immediately on rotation." |
| 15 | https://github.com/Infisical/infisical (README, secondary context only) | Main platform is also MIT (except `ee/`). Machine identities (K8s/AWS/Azure/GCP/OIDC/SPIFFE/TLS), dynamic secrets (short-lived DB/cloud creds), dual-phase rotation, audit log streaming. Not harvested — noted as the pluggable upstream store (`CredentialStoreInfisical`) that agent-vault syncs from. |

Not read / out of scope: `ee/` (absent), the commercial "Infisical Agent Vault" access-bundles implementation
(closed source — mechanism re-derived clean-room from the OSS repo, no proprietary code copied).

---

## 2. Object model

```
Vault        {id, name}                                  — credential namespace
Agent        {id, name, role: owner|member|no-access, status: active|revoked,
              revoked_at, vaults: [VaultGrant]}
VaultGrant   {actor_id, actor_type: user|agent, vault_id, role: proxy|member|admin}
Session      {id: sha256(token), user_id?, agent_id?, vault_id?, vault_role?,
              expires_at?, public_id, last_used_at?, idle_ttl, label,
              created_by_actor_id/type}                  — bearer token row
Credential   {id, vault_id, key: UPPER_SNAKE, type: static|oauth,
              ciphertext: AES-256-GCM, nonce}            — store never sees plaintext
Service      {vault_id, name (unique/vault), host, path?, port?, enabled?,
              auth: {type: bearer|basic|api-key|custom|passthrough,
                     credential key refs…},
              substitutions: [{key, placeholder, in: [path|query|header|body|websocket]}]}
ProxyScope   {agent_id|user_id, vault_id, vault_name, vault_role}  — per-CONNECT resolution
RequestLog   {id, vault_id, actor_type, actor_id, ingress: mitm|explicit,
              method, host, path (no query), matched_service,
              credential_keys: [names], status, latency_ms, error_code,
              auth_scheme, auth_header}                  — secret-free by construction
Proposal     {id (seq/vault), vault_id, session_id, status: pending|applied|rejected|expired,
              services_json, credentials_json, approval_token_hash,
              approval_token_expires_at}
DynamicSecretLease {lease_id, vault_id, dynamic_secret_name, project_id,
              environment, secret_path, expire_at}       — metadata only, no values
MasterKeyRecord {sentinel_ct/nonce, dek_ct/nonce | dek_plaintext, salt, kdf params}
```

## 3. ID scheme

- Entity IDs (vaults, agents, credentials): **UUIDv4 from crypto/rand** (`newUUID`).
- Bearer tokens: **prefix + 32 random bytes hex** — `av_sess_` (user sessions), `av_agt_` (agent
  tokens), `av_appr_` (proposal approval tokens). Stored **only as SHA-256 hex** (`hashSessionToken`);
  session row PK = token hash. Raw value shown once at mint.
- Revocation handles: `PublicID` = 80-bit random hex, so token hashes never appear in logs/URLs.
- Proposals: sequential integer **per vault** (`MAX(id)+1`, row-locked on Postgres).

## 4. State transitions

| Entity | Transitions |
|--------|-------------|
| Agent | `active → revoked` (terminal; `revoked_at` set). Rotation reactivates: `revoked → active` + new token, atomically. |
| Session/token | `minted → active → expired` (absolute `expires_at` OR idle TTL via `last_used_at`) / `revoked` (row deleted). Scoped-session max TTL caps the orphan window the revocation cascade closes. |
| Proposal | `pending → applied` (atomic, status-guarded) / `→ rejected` (human) / `→ expired` (sweeper). |
| Credential | `set` (upsert by `(vault_id, key)`) → `deleted`. Rotation = new value upsert; old value irrecoverable (no versioning in OSS agent-vault). |
| Service | `enabled ↔ disabled` (nullable → default enabled). |
| DynamicSecretLease | `created → revoked` (vault disconnect / server shutdown / startup orphan sweep) / `expired`. Values live in process memory for TTL only. |
| MasterKey | `setup → locked → unlocked` (password→KEK→DEK, sentinel-verified) → `wiped` on shutdown. |

## 5. Authority boundary

The **broker** (MITM proxy) is the single choke point and the only component that ever holds
plaintext credential values in memory. Authority is split three ways:

1. **Identity → scope** (`SessionResolver`): bearer token → `ProxyScope{actor, vault, role}`.
   Scoped tokens bake the vault in; instance-level agent tokens resolve per-request via
   `vault_grants`. Unknown/expired/ambiguous → typed denial, never default-allow.
2. **Scope → services** (`broker.Config` per vault): host+path matching decides which credential
   **names** attach to which outbound request. No match → 403 (strict deny mode) or plain proxy.
3. **Names → values** (`Auth.Resolve(getCredential)`): values are decrypted at injection time,
   substituted into the declared surfaces, and the request is forwarded. The agent's environment
   contains only placeholders (`__anthropic_api_key__`) and the broker token.

Invariants enforced in code: **injected-always-wins** (broker strips client-supplied headers that
collide with injected auth keys, so a prompt-injected agent cannot override the real credential);
**broker-scoped headers never traverse** (`Proxy-Authorization`, `X-Vault` stripped before the
upstream hop); **fail-closed substitution** (any substitution error → request not forwarded);
**log-safety** (secret values are typed `SECRET` — "never log it" — and the audit schema cannot
physically hold them).

What the broker does NOT do: it does not authenticate the agent to the upstream (it *is* the
credential), does not authorize the agent's *actions* on the upstream (only which credentials
attach to which hosts), and does not inspect response bodies for exfiltration.

## 6. Persistence semantics

- SQLite (WAL, `0600` file perms, single connection) or Postgres (advisory locks per vault for
  admin mutations). 50+ GORM migrations; migration-verify tests present.
- Credentials: AES-256-GCM with per-credential nonce under a DEK; DEK wrapped by Argon2id KEK
  (password mode) or stored plaintext (passwordless mode — filesystem is the boundary).
- Tokens: SHA-256 hashes only; raw values unrecoverable server-side.
- Request logs: batched `INSERT` in one transaction; cursor pagination (`Before`/`After` on
  autoincrement id; tailing uses ASC so bursts aren't skipped).
- Sync from upstream Infisical store is compare-and-swap on `configJSON` — if the vault was
  disconnected/reconfigured mid-sync, `applied=false` and nothing is written.

## 7. Evidence / receipts

- **Secret-free request log** per proxied request (fields in §2) — the audit receipt. Proves
  *which actor used which credential names against which service/host/path, when, with what
  outcome* — without ever containing a secret, so logs are safe to retain, ship, and replay.
- **Unmatched-host telemetry**: hosts that hit 401/403 or `no_match` are aggregated
  (count, last seen) — evidence of agents probing outside their grant.
- **Proposals** carry `session_id` (which agent asked), `review_note`/`reviewed_at` (who decided),
  and the status guard makes double-apply observable as an error, not silent duplication.
- Release binaries ship **build provenance attestations** (`gh attestation verify … --repo
  Infisical/agent-vault`) + cosign-signed checksums.

## 8. Retries / failures

- Substitution failure → request dropped, never partially forwarded.
- Credential unresolvable (missing/disabled service, OAuth refresh failed, OAuth not connected) →
  typed 502/403 with `X-Agent-Vault-Proxy-Error`, actionable hint body (discover endpoint,
  proposal endpoint). No retry with secrets — the operator fixes config.
- OAuth credentials: refresh state (`refresh_token_ct`, `token_expires_at`, `last_refresh_error`)
  persisted; refresh failure surfaces as `oauth_refresh_failed`, human reconnects in dashboard.
- Dynamic-secret leases: revoked on disconnect/shutdown; orphans swept at startup (crash-safe).
- Rotation is atomic (delete-all + mint in one tx) so an agent is never stranded mid-rotation;
  docs warn to roll the new token promptly since the old one dies immediately.

## 9. Revocation model

1. **Agent revoke** (`RevokeAgent`): `status='revoked'` + deletes the agent's own tokens **and**
   any scoped tokens the agent minted for others (`created_by_actor_id`). Single transaction.
   This is the critical cascade: without it, an orchestrator-minted sandbox token would outlive
   the orchestrator's own revocation until TTL.
2. **Token rotate** (`RotateAgentToken`): delete-all + mint, one tx; old token invalid immediately.
3. **Scoped session revoke** (`RevokeScopedSession`): delete by `(vault_id, public_id)` —
   vault-scoped to prevent cross-vault revocation.
4. **Grant revoke** (`RevokeVaultAccess`): removes the (actor, vault) grant; in-flight proxy
   scopes are per-CONNECT, so revocation takes effect on the next connection/session resolution.
5. **Expiry**: absolute `expires_at` + idle TTL (`IsExpired` is the single source of truth used by
   both the control plane and the proxy ingress).
6. **Credential delete**: removes the row; subsequent injections fail typed (`credential_not_found`).
   Note: upstream (e.g. a leaked API key at the provider) is out of scope — agent-vault revokes
   *access to use*, not the provider-side secret. Dynamic-secret leases are the exception: they
   are actively revoked at the provider via the lease.

## 10. Tests (observed in source)

Per-package unit tests: `broker_test.go` (config validation, matching), `brokercore_test.go`,
`credential_test.go`, `logging_test.go`, `proxyauth_test.go`, `session_test.go` (resolver),
`substitution_test.go` (surface rewriting, CRLF guard), `auth_test.go`, `merge_test.go`,
`validate_test.go` (proposal validation), plus `migration_verify_test.go`, `lock_test.go`,
`sqlite_test.go`, `skills_test.go`. I did not execute the suite (read-only research task);
the substitution/session/proposal paths are the most heavily tested surfaces by file count.

## 11. Verdict: ADAPT

**Take the mechanism, rewrite to PING semantics.** Do not adopt the Go binary/MITM architecture
as-is: it is a product (proxy server, SQL schema, management UI) that would become a second
authority beside PING's event spine. What transfers is the *mechanism*, which is small,
precisely specified, and directly fills a PING gap:

1. **Placeholder-substitution injection with surface scoping + fail-closed** (`substitution.go`
   ~230 lines; the `ResolvedSubstitution` type, `ApplySubstitutions`, `ApplyBodySubstitutions`,
   the CRLF guard, and the injected-always-wins header stripping in `ApplyInjection`).
2. **Identity-bound scoped sessions** (`ProxyScope` resolution, prefixed 256-bit tokens stored as
   SHA-256, absolute + idle expiry, public-ID revocation handles).
3. **Revocation cascade** (revoking an agent kills tokens it minted — the orphan-token close).
4. **Secret-free audit by construction** (the `ProxyEvent`/`RequestLog` schema that *cannot*
   hold secret values).
5. **Agent-proposes / human-approves with double-apply guard** (proposal lifecycle +
   `WHERE status='pending'` apply — a clean pattern for PING's proposal-kernel).

Adaptation notes for PING: lease/proposal lifecycle events belong on PING's append-only event
spine (not a side SQL table); grants belong in the capability-kernel
(actor=agent, target=credential-set/service, action=proxy-use, constraints=host allowlist +
expiry); envelope encryption (Argon2id→KEK→DEK, AES-256-GCM) belongs in the trust-kernel.
The MITM transport itself is NOT harvested — PING's need is the *credential-use-without-
possession* semantic at its fetch/execution boundary, not an HTTP proxy product.

**REJECT**: adopting agent-vault as a deployed sidecar (second credential authority, second audit
store, second identity registry alongside PING).

## 12. SMALLEST MISSING PRIMITIVE

**A possession-less credential lease: `CredentialLease{lease_id, agent_id, credential_refs (names
only), service_allowlist (host+path patterns), expires_at, revoked}` evaluated at a single
trusted egress boundary that maps refs → values at request time.**

PING's capability-kernel can already express "agent A may call API B." What it cannot express is
"agent A may *use* credential K *without ever possessing* K" — which is exactly what a remote
executor (Hermes/Codex-style worker, proofs 9–14) needs before it touches real credentials.
Agent-vault proves the minimal sufficient mechanism:

- the worker holds a **scoped bearer token** (identity-bound, expiring, revocable, cascade-safe),
  never the secret;
- a **broker at the trust boundary** substitutes declared placeholders on declared surfaces
  only, fail-closed, with injected-always-wins;
- the **audit trail records refs, never values**, so it is safe to retain and replay;
- **revocation cascades** to tokens the worker minted for sub-agents/sandboxes.

That four-part shape (scoped token + boundary substitution + secret-free audit + cascade
revocation) is the smallest thing FYD/PING does not have and the proofs 9–14 require before
any worker is handed a live key. Everything else in agent-vault (UI, SQL schema, MITM transport,
OAuth flows) is product weight around this kernel.

## 13. Dependency analysis

- **Harvested mechanism: ZERO dependencies.** The transferable code paths use only stdlib-grade
  primitives: CSPRNG token generation, SHA-256 hashing, AES-256-GCM, Argon2id KDF, constant-time
  comparison. Any language port needs an AES-GCM + Argon2id implementation (both commodity).
- **Product dependencies (NOT harvested, listed for honesty):** `gorm.io/gorm` (SQL abstraction),
  `modernc.org/sqlite` (embedded SQLite), `golang.org/x/crypto` (Argon2id), plus the Go toolchain
  itself. None of these travel with the mechanism.
- **External service dependency:** the pluggable `infisical` credential store and dynamic secrets
  require an Infisical instance; the builtin store does not. Harvest targets the builtin semantics.
- **DEPENDENCY_COST: zero** (mechanism only).

## 14. License finding

**MIT Expat**, Copyright (c) 2022 Infisical Inc., verified byte-read from
https://raw.githubusercontent.com/Infisical/agent-vault/main/LICENSE at the pinned commit.
The license's `ee/` carve-out is inert here (no `ee/` directory in the repo tree). No
GPL/copyleft/SSPL/BSL present — **no flag for Nolan**. Clean-room note: only the *mechanism*
(described above) is proposed for re-implementation in PING semantics; no upstream code is
copied into this proposal, and the closed-source commercial "Infisical Agent Vault" tier was
not examined beyond its public README/docs description.

## 15. Proof mapping

- **Proof 9 (create one mission) / 10 (worker returns result):** a mission worker that must call
  a real external API (LLM provider, GitHub, Stripe) does so through a `CredentialLease` —
  scoped token + service allowlist — instead of receiving raw keys in its environment.
- **Proof 11 (injected bad result is rejected):** fail-closed substitution and
  injected-always-wins mean a prompt-injected worker cannot override or exfiltrate the real
  credential; the typed denial + secret-free log is the evidence of rejection.
- **Proof 13 (VERIFIED only after independent verification):** the verifier gets its own lease
  (read-only services, distinct actor_id) — separation of worker and verifier credentials is
  enforced by grants, not by hoping the worker kept the key to itself.
- **Proof 14 (replay reconstructs relevant state):** the secret-free `RequestLog` schema replays
  *who used what against where* without ever persisting a secret, so replay evidence is safe to
  store and show.

## 16. Source-input manifest (for SOURCE_SHA)

Ordered inputs hashed (method: SHA-256 over the concatenated retrieved page texts listed below;
repo pinned at `872578e4cdf9e03d5e3bcb5512023a70bf90ed65` for byte-exact reproduction):

1. `https://github.com/Infisical/agent-vault` — repo page + README (proxy architecture, features)
2. `https://raw.githubusercontent.com/Infisical/agent-vault/main/LICENSE` — MIT Expat text
3. `https://github.com/Infisical/agent-vault/tree/main/internal` (+ `session`, `broker`,
   `brokercore`, `store`, `auth`, `proposal` subtree listings) — package inventory
4. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/brokercore/substitution.go`
5. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/brokercore/session.go`
6. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/brokercore/brokercore.go`
7. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/brokercore/logging.go`
8. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/broker/broker.go` (ll. 0–605)
9. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/store/store.go` (ll. 0–937)
10. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/store/sql_store.go`
    (excerpts: `hashSessionToken`, `newPrefixedToken`, `newUUID`, `newPublicID`,
    `CreateAgentToken`, `RotateAgentToken`, `RevokeAgent`, `DeleteAgent`, `CreateProposal`,
    `ApplyProposal`, `InsertRequestLogs`)
11. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/store/001_init.go`,
    `004_session_namespace.go`, `039_request_logs.go`, `043_vault_settings.go`,
    `050_dynamic_secret_leases.go`
12. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/auth/auth.go`
13. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/proposal/proposal.go`
14. `https://raw.githubusercontent.com/Infisical/agent-vault/main/internal/session/session.go`
    (CLI-side session cache — minor)
15. `https://docs.agent-vault.dev` — Introduction (mechanism narrative)
16. `https://docs.agent-vault.dev/agents/overview` — agent/token/rotation model
17. `https://github.com/infisical/agent-vault/blob/HEAD/docs/guides/deploy-agent-container.mdx`
    — rotation-invalidates-immediately confirmation
18. `https://github.com/Infisical/infisical` — README (context: platform license MIT + `ee/`
    carve-out, machine identities, dynamic secrets; not harvested)
