## sh-pg-password-incident
DONE_VERIFIED P1 [SECRET HYGIENE] sh-pg-password-incident
WHY: The 2026-09-20 PostgreSQL password exposure is the canonical secret-hygiene lesson. It must be recorded permanently with the full arc: exposure, contested evidence, full-incident rotation, proof of old-credential death, and the standing rules it produced. (Task brief requires permanent recording.)
EV: `~/workspace/FAILURE_LEDGER.md` lines 1193-1204 (FL-20260920-022: env-listing command printed the PG password into tool output, exposure limited to agent runtime) + lines 1755-1799 (FL-20260920-022 RO
ACC: The incident, the standing inspection rule, the rotation procedure, the rejection proofs, and the open pg_hba residual are all recorded in one durable place, with no secret values present.

## sh-redacted-inspection-rule
DONE_VERIFIED P1 [SECRET HYGIENE] sh-redacted-inspection-rule
WHY: Nolan's standing rule (2026-09-21): normal diagnostics must be safe to copy. Without a machine-enforced filter, every inspection is one careless paste from another FL-20260920-022.
EV: `memory://md:memory/2026-09-21.md:311` ("Secret-like names (PASSWORD, PASS, TOKEN, SECRET, KEY, CREDENTIAL, DATABASE_URL, AUTH, COOKIE) render as KEY=***REDACTED***; raw secret inspection requires an 
ACC: Every operator diagnostics path pipes through the redactor; raw inspection requires an explicit exceptional action.

## sh-secret-pattern-regression
DONE_VERIFIED P2 [SECRET HYGIENE] sh-secret-pattern-regression
WHY: Secrets must never ship inside a distribution closure. A machine gate beats a policy sentence.
EV: `~/workspace/laneC/security-negatives.js`: deterministic negative assertions over the exact distribution snapshot. S1: no credential-bearing filenames (`*.pem, *.key, id_rsa*, .env, .env.*`); S2: no h
ACC: `security-negatives.js` runs as release-certify gate 7 on every candidate snapshot; exit non-zero blocks promotion.

## sh-rotation-procedure
IN_PROGRESS P2 [SECRET HYGIENE] sh-rotation-procedure
WHY: Rotation must be a rehearsed, rollback-safe procedure that never prints key values, not an improvised scramble.
EV: `~/workspace/gateway-rotation/rotate-gateway-keys.ps1` (2026-09-13): rotates the two exterior bearer keys; generates fresh 256-bit keys; reads old rows into memory only for rollback; SQL travels via s
ACC: A documented, value-never-printed rotation procedure exists for every credential class (exterior bearer keys, PG role password) and has been executed at least once each.

## sh-old-credential-rejection
DONE_VERIFIED P1 [SECRET HYGIENE] sh-old-credential-rejection
WHY: Rotation is not complete when the new credential works; it is complete when the old one is proven dead on the real network path. A trust-localhost rejection proof is worthless.
EV: `~/workspace/FAILURE_LEDGER.md` lines 1779-1784: SCRAM verifier matches NEW credential only; old credential rejected over the real network path (transient peer container on `oracle_ping_internal` got 
ACC: every future rotation includes a rejection proof over the real network path, with the loopback-trust caveat stated.

## sh-history-log-report-scans
IN_PROGRESS P2 [SECRET HYGIENE] sh-history-log-report-scans
WHY: A rotated credential can live on in bash history, build logs, container logs, exited-container envs, and workspace files. The sweep must be explicit and recorded.
EV: `~/workspace/FAILURE_LEDGER.md` lines 1792-1795: all four historical values swept (byte comparison in-memory, paths only) across `/home/ubuntu/.bash_history` (absent), `/opt/ping/.env` + both backups,
ACC: the git `-S` history check runs read-only on the real repo; all four historical values confirmed absent from history, or their commits named.

## sh-consumer-agreement
OPEN P2 [SECRET HYGIENE] sh-consumer-agreement
WHY: The rotation exposed a drift: `/opt/ping/.env` held a stale credential relative to the live one; the Sep-21 deploy bypassed `.env` entirely. Consumers agreeing after rotation is not the same as a rule that keeps them agreeing.
EV: `~/workspace/FAILURE_LEDGER.md` lines 1758-1764 (four distinct historical passwords existed: live-then 32-char exposed Sep-20, `/opt/ping/.env` pre-rotation value, `.env.bak-20260917` value, `.pgpass`
ACC: a single consumer list is recorded and the deploy lane routes credential changes through `.env` (or a named successor), with a pre-deploy agreement check.

## sh-pghba-scram
OPEN P1 [SECRET HYGIENE] sh-pghba-scram
WHY: `pg_hba.conf` trusts local + 127.0.0.1/32 + ::1/128, so the DB password is not checked on loopback. Anyone with `docker exec` on ping-postgres gets passwordless access, which also invalidates naive rejection proofs. This is the one standing risk the rotation record explicitly named.
EV: `~/workspace/FAILURE_LEDGER.md` lines 1796-1797 ("pg_hba.conf trusts local + 127.0.0.1/32 + ::1/128, so the DB password is not checked on loopback; anyone with `docker exec` on ping-postgres gets pass
ACC: `pg_hba.conf` requires scram-sha-256 on all paths; the old-credential rejection proof is re-run and passes.

## sh-degraded-key-leak
IN_PROGRESS P1 [SECRET HYGIENE] sh-degraded-key-leak
WHY: When the gateway boots without Postgres it enters in-memory degraded mode, generates API keys, and prints them into container logs. /health still returns 200, so the leak is invisible to health checks.
EV: `~/workspace/FAILURE_LEDGER.md` lines 435-436 (FL-20260919-ORACLE-006 cascade: "gateway booted while postgres was still initializing and fell into IN-MEMORY DEGRADED MODE (CapabilityAuthority/Exterior
ACC: no generated credential value ever appears in any container log; degraded boot either redacts or refuses to print; a startup-retry removes the degraded-on-boot path that created the leak window.

## sh-exited-container-envs
OPEN P2 [SECRET HYGIENE] sh-exited-container-envs
WHY: The dead credential remains visible in `docker inspect` output of two exited gateway containers. It cannot authenticate, but "dead" and "invisible" are different claims, and deploy-lane history is not a reason to keep it readable forever.
EV: `~/workspace/FAILURE_LEDGER.md` lines 1798-1799 ("The two exited gateway containers still show the dead credential in `docker inspect`; remove them when the deploy lane no longer needs them": `ping-ga
ACC: both exited containers are removed once the deploy lane confirms they are no longer needed; a final `docker inspect` sweep shows no secret-bearing env on any non-running container.

## sec-tenants-public
OPEN P1 [SECURITY] sec-tenants-public
WHY: Tenant registry CRUD is fully unauthenticated and runtime-proven writable by anyone who can reach the port. Tenant creation is an authorization decision; a public endpoint makes it a suggestion.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-001 (POST/PUT/DELETE/GET `/tenants` has no authentication; `gateway_runtime.js:795` mounts without `exteriorAuthMiddleware`; runtime probe: un
ACC: unauthenticated `POST /tenants` returns 401/403 and writes nothing; authenticated creation requires a named authorizer.

## sec-mc-public
OPEN P1 [SECURITY] sec-mc-public
WHY: Business-intelligence surfaces (lead lists, unpaid invoices, at-risk projects, marketing, inbox, knowledge, missions) are public. This is customer business data readable by anyone who can reach port 8080 (bound 0.0.0.0).
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-002 (`/mc/dashboard`, `/mc/business/who-needs-followup`, `/mc/business/stalled-estimates`, `/mc/business/pending-reviews`, `/mc/business/ai-re
ACC: every `/mc/*` route requires authentication and returns only data the caller's tenant is entitled to.

## sec-context-public
OPEN P2 [SECURITY] sec-context-public
WHY: Event-context surfaces are public and tenant-unscoped: cross-tenant event reads without authentication.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-003 (`gateway_runtime.js:791` mounts without auth; `routes/context.js:14-48`; runtime `GET /context/recent-events` → 200).
ACC: `/context/*` requires auth and enforces the caller's namespace.

## sec-repository-public
OPEN P1 [SECURITY] sec-repository-public
WHY: Anonymous arbitrary write and delete on the object repository. This is repository poisoning and deletion by anyone who can reach the port.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-004 (`POST /api/v1/repository/objects` arbitrary kind/data and `DELETE /api/v1/repository/objects/:id` require no auth; `gateway_runtime.js:79
ACC: write/delete on `/api/v1/repository/*` require authentication with capability evidence; deletes are governed, not anonymous.

## sec-system-logs
OPEN P3 [SECURITY] sec-system-logs
WHY: Internal logs are world-readable. Filenames are fixed (no traversal), but audit log contents should not be public.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-005 (`routes/system.js:21-59` uses `path.join` on constants; audit log contents world-readable).
ACC: `/system` log routes require authentication (or are removed from the public surface).

## sec-worker-attribution
OPEN P2 [SECURITY] sec-worker-attribution
WHY: Worker identity is self-asserted on `POST /events/processed` and `POST /events/failed`; the caller-supplied `worker` string is written to `event_processing.worker`. "Who processed what" provenance is forgeable, which poisons evidence lineage.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-006 (`routes/events.js:144-160`; container `event_read_authority.js:303-335`, `worker || 'unknown'`, no binding to the authenticated agent; pa
ACC: the recorded worker identity is bound to the authenticated principal; a read-only diff of `submittedBy` vs `workerId` in `mission.workerOutputs` shows zero mismatches.

## sec-credential-expiry
OPEN P2 [SECURITY] sec-credential-expiry
WHY: Exterior credentials never expire and there is no rotation/revocation path in code. A leaked key is permanent access.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-007 (`exterior_agent_credentials` rows for `muse` and `muse-level-2` have `expires_at = NULL`, active, last used 2026-09-17 / 2026-09-19; no c
ACC: credentials carry expirations; a code path (not direct DB edit) rotates and revokes them.

## sec-hardcoded-pg-fallback
PROVE P3 [SECURITY] sec-hardcoded-pg-fallback
WHY: Source contains a hardcoded PG credential fallback. It is reportedly not in effect (container uses env), but an unused credential in source is a latent exposure and a standing contradiction of the secret-hygiene rules.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-008 ("Hardcoded PG credential fallback in source"; severity LOW; "not in effect; container uses env").
ACC: the fallback is removed from source, or proven unreachable and excluded from every distribution snapshot by the S1/S2 gate.

## sec-knowledge-public
OPEN P2 [SECURITY] sec-knowledge-public
WHY: Knowledge-graph writes are public with caller-supplied status/confidence/namespace, and unscoped reads return cross-namespace nodes. The Ollama chat surface is public too. Knowledge integrity and tenant isolation both fail here.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` EXCLUSION-SET STATE UPDATE (`POST /knowledge/nodes` and `POST /knowledge/edges` remain public with caller-supplied status/confidence/namespace; `G
ACC: knowledge writes require auth and are namespace-bound to the caller's tenant; unscoped cross-namespace reads are denied.

## sec-fail-closed-verified
DONE_VERIFIED P1 [SECURITY] sec-fail-closed-verified
WHY: The controls that are already sound must be named so refactors do not silently break them. Fail-closed is the architectural posture everything else assumes.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` NEGATIVE FINDINGS: "Auth middleware fail-closed (audited): missing/invalid key → 401; PG outage → in-memory fallback still denies unknown keys. No
ACC: every auth/governance refactor ships with a fail-closed regression test; a fail-open is a release-blocking defect.

## sec-integration-fake-green
OPEN P2 [SECURITY] sec-integration-fake-green
WHY: Integrations report "healthy" with no credentials configured and zero events ever sent. "Healthy" means enabled, not credentialed. Operators cannot distinguish a working integration from an unconfigured one.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-001 (posthog/email/sms report `status:"healthy"` with `"apiKey":"not configured"` etc., `eventCount:0`, `sent:0`; `posthog_integration.js:28-3
ACC: health vocabulary includes an "unconfigured"/"disabled" state; no integration reports "healthy" without credentials and at least one successful send.

## sec-health-empty-checks
OPEN P2 [SECURITY] sec-health-empty-checks
WHY: `getHealth()` starts at `status: 'healthy'` and iterates zero registered checks, returning healthy with nothing proven. Absence of evidence is presented as evidence of health.
EV: `~/workspace/health-truth-audit-2026-09-20.md` Finding 1 (`gateway/health_authority.js`; zero checks → `{status: 'healthy', components: {}}`). Minimal fix proposed in the audit: if `this._healthChecks
ACC: zero registered checks → `status: 'unknown'` (or `unproven`) with an explicit note; never `healthy`.

## sec-health-component-honesty
OPEN P2 [SECURITY] sec-health-component-honesty
WHY: Component checks hardcode `status:'healthy'` (ignoring their own `stats.failed`), and the `/health` fallback returns hardcoded 200-healthy when the health authority is missing. Defense-in-depth defaults must be 503/unknown, never 200-healthy.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-002 (`gateway_runtime.js:852-869`; `event_runtime`, `canonicalization`, `embedding` hardcode healthy; contrast `event_governance` which gates 
ACC: every component check derives its status from its own stats (mirror the `event_governance` pattern); the missing-authority fallback is 503/unknown.

## sec-503-misattribution
OPEN P2 [SECURITY] sec-503-misattribution
WHY: `_pgRoute` returns 503 `{error:'Postgres unavailable', degraded:true}` even when Postgres is reachable and the migration is what's failing. Operators chase the database instead of the migration/trigger policy. This is the same failure-semantics collapse as PING law 11.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-007 and REC-002 (`_startPgRecoveryLoop` distinguishes only NOT_READY/READY; one catch wraps both `SELECT 1` and `_initializeSpineOnce`; logs o
ACC: connectivity probe is separated from spine-init; consecutive identical failures are counted and surfaced as `{phase, consecutiveFailures, lastError}`; deterministic failures reach a terminal state ins

## ten-agent-tenant-binding
DECISION P1 [TENANCY] ten-agent-tenant-binding
WHY: There is no agent↔tenant binding anywhere. Tenant is caller-asserted at every layer; any authenticated agent can emit into `tenant::hpp` or any invented tenant. "Namespace = privacy boundary" is a comment, not an enforcement. This is the G4 grill question and it gates the second tenant.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-001 (`/ingest` `authorizeNamespace` = "explicit request > per-source map > default" with only regex validation; `/events` POST validates tenan
ACC: a named authority model is decided and enforced: every emit/read is bound to the caller's tenant, and a cross-tenant attempt is denied, not merely unvalidated.

## ten-dual-registries
DECISION P2 [TENANCY] ten-dual-registries
WHY: Two tenant registries exist and are disconnected: `tenant_registry` (public CRUD via `/tenants`) vs `tenants` (ingestion boundary for `/events`, seed-only `hpp`). Registering via the API does not authorize ingestion; ingestion tenants cannot be added via any API. Tenant onboarding is incoherent.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-002 ("no join"; folds into TEN-001's decision).
ACC: one registry owns tenant identity; API registration and ingestion authorization read the same source of truth.

## ten-principal-propagation
OPEN P2 [TENANCY] ten-principal-propagation
WHY: `req.authenticatedAgent` is attached by middleware but consumed by almost nothing (7 hits, all in routes, none in runtime/workers/evidence/replay). `/ingest` never records the agent; event→mission→worker carries only namespace and free-text `source`. Replay and evidence attest to asserted sources.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-003. The audit's recommended next step: bind the principal into event metadata at the authenticated routes. Memory `memory://md:memory/2026-09
ACC: every canonical event carries the authenticated principal in its metadata; evidence/replay attest to the bound principal, not the asserted `source` string.

## ten-scoped-replay-evidence
OPEN P2 [TENANCY] ten-scoped-replay-evidence
WHY: Replay, projection, and evidence paths carry no tenant scoping or caller authorization. A second tenant's history and evidence would be replayable by the first tenant's credentials.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-004 (`replay_verifier.js`, `materialized_views.js` contain zero `tenant` references; `evidence_authority.js` checks namespace consistency but 
ACC: replay, projection rebuilds, and evidence reads enforce the caller's tenant; cross-tenant replay is denied.

## ten-second-tenant-boundary
BLOCKED P1 [TENANCY] ten-second-tenant-boundary
WHY: The second real tenant must not arrive on an imaginary privacy boundary. Today the boundary is a comment; onboarding tenant #2 before G4 lands would make cross-tenant reads/writes possible on day one.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` EXP-006 ("BLOCKED on tenant isolation being proven first: TEN-001 shows namespace isolation is unenforced, so a second tenant's SOPs would be read
ACC: no second tenant is onboarded until the authority model is decided and the cross-principal bleed proof (experiment 5) fails closed.

## ten-never-two-writers
DECISION P1 [TENANCY] ten-never-two-writers
WHY: Both Oracle gateways (`ping-gateway` :8080 and `ping-gateway-candidate` :8081) run the identical image `ping-gateway:candidate-3c5d280dd` with identical env against the same database. `canonical_events` is 0 rows today, so no active writes, but the never-two-writers invariant is currently violated in posture. This is N
EV: `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("both `ping-gateway` (:8080) and `ping-gateway-candidate` (:8081) run `ping-gateway:candidate-3c5d280dd` (sha256:4aa9d7f6…), started 2026-09
ACC: exactly one writer to the canonical database; :8081 stopped or re-scoped, and the invariant is recorded as a standing deployment rule.

## db-trigger-owner
DECISION P1 [DATABASE/MIGRATIONS] db-trigger-owner
WHY: Oracle's `ping_events` is guarded by an append-only trigger that exists in no repository, names no owner, documents no exception path, and rejects the certified migration's UPDATE on every boot attempt, forever. No one can authorize a fix because no one is named. This is the G1 grill question: the single highest-conseq
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-007 (proven by exhaustive absence across all three trees; `ping-oracle-deploy/infrastructure/oracle/schema.sql:127-170` defines `prevent_upda
ACC: the trigger policy has a named owner and a documented migration-exception path, or the absolute-trigger doctrine is recorded as law and every migration is trigger-compatible by construction.

## db-migration-nonatomic
IN_PROGRESS P1 [DATABASE/MIGRATIONS] db-migration-nonatomic
WHY: The sequence migration applied as 4 separate non-transactional statements with no version record and no reconciler; on Oracle, step 2 committed, step 3 threw on the trigger, step 4 never ran, and every boot replays the exact partial failure. Half-applied state was the normal outcome of any failure.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` REC-001 (no BEGIN/COMMIT, no savepoints; `migration_engine.js` versions 1-11 covers `repository_*` tables only); `~/workspace/laneC/MIGRATION-TRIG
ACC: the corrected migration runs against both fixture variants (A: pre-sequence Oracle state; B: Oracle's actual half-applied state) and passes all 8 gate assertions, including "historical semantic conten

## db-migration-trigger-gate
BLOCKED P1 [DATABASE/MIGRATIONS] db-migration-trigger-gate
WHY: This is the pre-promotion gate that would have prevented the failed Oracle deploy: run the startup migration against a trigger-enforcing scratch fixture. The fixture exists; the execution evidence is unevaluated. A BLOCKED gate blocks promotion exactly like a FAIL.
EV: `~/workspace/laneC/RELEASE-SEQUENCE.md` (gate 6: "migration/trigger | migration-trigger-gate.js | FL-20260919-ORACLE-008: startup UPDATE vs append-only trigger. Fixture execution BLOCKED until Lane A 
ACC: every release candidate's startup migration block executes against the trigger-enforcing fixture and the result is recorded in the certification artifact's migration/schema-compatibility field.

## db-versioned-migrations
OPEN P2 [DATABASE/MIGRATIONS] db-versioned-migrations
WHY: `gateway/migration_engine.js` (versions 1-11) covers `repository_*` tables only; `repository_store_migrations` has 11 rows, all repository versions. The sequence migration lived outside the versioned system, which is why it had no version record and no reconciler.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` REC-001 ("searched for any migration ledger/reconciler for the sequence migration; only idempotent DDL re-execution").
ACC: every canonical-store schema change runs through a versioned, recorded migration; no schema change lives only in a boot-time `initialize()` block.

## db-nullable-sequence
OPEN P2 [DATABASE/MIGRATIONS] db-nullable-sequence
WHY: Oracle's `ping_events` currently sits in the documented half-applied state: nullable sequence column + nextval default, no unique index, no NOT NULL, triggers installed. The state is honest and recorded, but convergence to the final schema (unique index; NOT NULL only when zero NULL rows, per the 8e2496b14 fix) has not
EV: `~/workspace/laneC/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md` (variant B = "Oracle's ACTUAL current state after the failed deploy"); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` REC-001 (the sta
ACC: Oracle's `ping_events` reaches the gate-asserted post-migration schema (sequence BIGINT nullable with nextval default, sequence owned by the column, unique index present, legacy rows keep NULL) with t

## db-silent-drop
OPEN P1 [DATABASE/MIGRATIONS] db-silent-drop
WHY: `CanonicalEventEnvelope` silently drops events on sequence collision with a success return, in both trees. Two concurrent same-tenant emits compute the same `MAX(sequence)+1`; the loser's `INSERT ... ON CONFLICT (tenant_id, sequence) DO NOTHING` no-ops; `executeEmitEvent` returns the event object unconditionally with n
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-013 (code-proven in both trees: `canonical_event_envelope.js:100-108`, `:174-178`, `:187`; conflict target is `(tenant_id, sequence)`, not `e
ACC: concurrent same-tenant emits never lose a row silently; the INSERT rowCount is checked and a zero-row insert throws (fail-loud).

## db-unprocessed-write-never
OPEN P3 [DATABASE/MIGRATIONS] db-unprocessed-write-never
WHY: `ping_events.processed` is write-never but read-live: the sole `UPDATE ping_events` in the codebase is the sequence backfill, so `GET /events/unprocessed` and mission-control's `query({unprocessed:true})` return ALL events on every call, forever. A future consumer built on this cursor would reprocess the full table eve
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` PERS-002 (column defined, indexed, queried; no writers; EventBridge marks `processed` only on `canonical_events`, never `ping_events`).
ACC: the `unprocessed` option is either wired to a real writer or deleted; no endpoint returns the whole table under an "unprocessed" label.

## db-canonical-identity-bytes
HARVEST P2 [DATABASE/MIGRATIONS] db-canonical-identity-bytes
WHY: Event identity is Node-`JSON.stringify`-bound (insertion key order, no whitespace, no Unicode escaping, `1.0`→`"1"`); no non-Node producer can reproduce it byte-for-byte. Meanwhile `canonical_authority.js:7` declares "There shall be only one canonical serializer," but the UER identity path bypasses it with raw `JSON.st
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` RTC-001 (`event_id` = `sha256(JSON.stringify({eventType, source, namespace?, logical_id|payload}))`, worktree and Pig identical; Python uses `obse
ACC: canonical event-identity bytes are defined once (sorted-keys JSON, explicit float/Unicode rules); a JS implementation and a Python reference implementation produce identical sha256 on a fixture corpus

## db-era-cutover
DECISION P1 [DATABASE/MIGRATIONS] db-era-cutover
WHY: The identity-era cutover re-mints every event ID (live: naked 64-hex `SHA-256(JSON.stringify(...))` camelCase insertion-order; certified: `event_<16hex>` via IdentityAuthority with RFC-8785 canonicalization and `core::system` namespace default). Same logical event gets different IDs across the cutover; `ON CONFLICT (ev
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-011/F1 (code + era census `evidence/f7-freeze-2026-09-18/02-era-census-and-bridge.md`: 739 Era-H rows, 0 V1 rows). Grill G2 options: (a) acce
ACC: Nolan decides G2; the chosen semantics are recorded and enforced before any cutover traffic.

## db-redelivery-semantics
OPEN P3 [DATABASE/MIGRATIONS] db-redelivery-semantics
WHY: Redelivery flips at-most-once to at-least-once (live UER early-returns on duplicate; certified UER re-runs handlers unconditionally after the duplicate re-read). Both live subscribers are idempotent today, but the semantic change is undocumented — any future non-idempotent subscriber post-cutover will double-fire with 
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-012/F2 (live `UER:168-172` vs certified `UER:280-294`; EventToMissionBridge idempotent via `mission_id` + ON CONFLICT DO NOTHING; EmbeddingSe
ACC: the redelivery semantic is documented in the cutover hazard list; every subscriber declares its idempotency assumption.

## db-projection-classification
OPEN P2 [DATABASE/MIGRATIONS] db-projection-classification
WHY: Canonical vs projection classification must be honest. Qdrant and Redis are configured but unreachable from the deployed gateway (wrong network, no published ports), so every "hybrid/semantic search" claim is PG-only keyword search wearing a hybrid label, and the "DERIVED, regenerable" projection claim is false in prac
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` PERS-001 (gateway on default `bridge` network only; `ping-qdrant:6333` TIMEOUT, `host.docker.internal:6333` socket hang up; Redis 6379 accepts TCP
ACC: every projection store is classified canonical or derived with a live reachability proof; no "hybrid search" claim stands on a dead Qdrant.

## db-no-direct-canonical-mutation
OPEN P2 [DATABASE/MIGRATIONS] db-no-direct-canonical-mutation
WHY: The standing law says no direct canonical mutation without authority, and the append-only trigger enforces it physically on Oracle. But the record shows two cracks: the certified migration itself was a second writer to `ping_events` (AUTH-008, contradicting C-R3's "zero UPDATEs repo-wide" premise — since fixed by remov
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-008 (worktree `ping-runtime/events/unified_event_runtime.js:92-99` ran `UPDATE ping_events`; N1 writer census: sole non-test INSERT is `UER.e
ACC: the writer census is re-run per release (sole INSERT `UER.emit`, zero UPDATE/DELETE on `ping_events` outside the trigger-compatible migration); every `canonical_events` mutator is named in the authori

## rel-one-sequence
IN_PROGRESS P1 [RELEASE/CERTIFICATION] rel-one-sequence
WHY: Nolan's doctrine (2026-09-19): "A release is not the set of files changed since the previous release. A release is a complete, certified closure of the runtime represented by a specific source revision." There is exactly one release-certification sequence; gates are not added, reordered, or skipped per-deploy. Timestam
EV: `~/workspace/laneC/RELEASE-SEQUENCE.md` (gates 0-7 pre-promotion via `release-certify.js` against the exact distribution snapshot; gates 8-17 deployment phase; "Any FAIL blocks promotion. Any BLOCKED 
ACC: every promotion runs the full sequence in fixed order with no skipped gates; the two artifacts (pre-promotion + deployment phase, same schema) exist per release.

## rel-smoke-vs-db
OPEN P1 [RELEASE/CERTIFICATION] rel-smoke-vs-db
WHY: The smoke test certifies module composition, not gateway boot. Its declared safe boundary ("composition wired; no listen(), no DB connect") structurally excludes every Postgres-gated path, including the startup migration that killed the deploy. This is the exact mechanism by which a broken image earned SMOKE PASS yet c
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-005 (`tools/distribution/gateway-smoke.js` header; `tools/distribution/README.md:44-56`; the skipped spine `gateway/bootstrap/composition/core
ACC: a pre-promotion step runs the UER `initialize()` migration block against a scratch Postgres carrying Oracle's append-only trigger definition, and records PASS/FAIL.

## rel-certified-vs-deployable
OPEN P1 [RELEASE/CERTIFICATION] rel-certified-vs-deployable
WHY: "CERTIFIED 189/189" covers module membership only: the closure certifier is a static require/import membership checker whose failure modes are `REQUIRED_NOT_DISTRIBUTED`, `RUNTIME_DEPENDS_ON_NONDISTRIBUTED`, `UNKNOWN_CLASSIFICATION`. It never opens a DB connection, and the doctrine's "migration/schema compatibility" fi
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-006 (report shape `:283-296` has no migration/schema/trigger/environment/DB-policy field; "no release-certification artifact was ever assemble
ACC: no "CERTIFIED" claim is made without the migration/schema-compatibility field populated by the fixture gate; certification artifacts exist as files, not stdout.

## rel-immutable-identity
DONE_VERIFIED P1 [RELEASE/CERTIFICATION] rel-immutable-identity
WHY: Every release needs a new immutable identity; a certified candidate image is never mutated or reused for another build. This is what makes rollback anchors trustworthy.
EV: memory `memory://md:memory/2026-09-21.md:1392` (Nolan: "Oracle is a PROVEN environment. Every future Oracle mutation needs a reason... the proven baseline stays frozen, candidate-84486f056 is not reus
ACC: every release carries a new immutable image identity; no tag is ever re-pointed to different bytes; protected images remain untouched.

## rel-rollback-before-swap
DONE_VERIFIED P1 [RELEASE/CERTIFICATION] rel-rollback-before-swap
WHY: The rollback image must be retagged and verified healthy BEFORE the candidate swap — rollback is proven before it is needed, not after. The digest is recorded in the pre-promotion artifact's deployment phase before the swap.
EV: `~/workspace/laneC/RELEASE-SEQUENCE.md` (gate 17; "The rollback image digest is recorded in the pre-promotion artifact's deploymentPhase BEFORE the swap (gate 17 ordering)"); `~/workspace/FAILURE_LEDG
ACC: every promotion records the rollback digest before the swap and proves the rollback image healthy first.

## rel-artifact-lifecycle
DONE_VERIFIED P2 [RELEASE/CERTIFICATION] rel-artifact-lifecycle
WHY: Two artifacts (pre-promotion + deployment phase), same schema, referencing each other by manifest digest. Both immutable once written; a correction is a new artifact, never an edit. This is what stopped the premature-certification failure mode from being silently papered over.
EV: `~/workspace/laneC/RELEASE-SEQUENCE.md` ("release-certify.js emits release-certification.json (schema v1: release-artifact.schema.json)... Both artifacts are immutable once written; a correction is a 
ACC: schema v1 exists and both artifacts are emitted per release; no certification document is ever edited after issue.

## rel-canonical-spine
IN_PROGRESS P1 [RELEASE/CERTIFICATION] rel-canonical-spine
WHY: Deployment gates 11-16 are the certification target Nolan authorized for ping-core-01: request → authenticated identity → canonical event → durable PostgreSQL → mission → scheduler → worker → result/evidence → canonical event → RESTART → same event/mission/evidence recoverable → processing resumes. The P1 side-port bat
EV: `~/workspace/laneC/RELEASE-SEQUENCE.md` (gates 11-16); `~/workspace/FAILURE_LEDGER.md` lines ~1830+ (FL-20260921-P1: candidate `ping-gateway:candidate-3c5d280dd` `sha256:4aa9d7f6...` passed the full P
ACC: gates 11-16 are proven and recorded for whatever image is live on :8080, on the live database, not only on a side port.

## cap-one-authority
DONE_VERIFIED P1 [CAPABILITIES] cap-one-authority
WHY: Nolan's constitutional rule: anything whose disagreement could cause PING to make the wrong decision must have one provable authority. The Capability registry is one of the twelve named areas. There must never be a CapabilityAuthority #2.
EV: memory `memory://md:memory/2026-09-13.md:645` (constitutional authority rule; twelve areas: Identity, Namespace, Canonical bytes, Hash, Event creation, Event schema, Evidence, Verification/promotion, 
ACC: exactly one capability authority exists; any new capability check routes through it; the WHO→…→PROMOTED BY chain is attestable.

## cap-harvest-inventory
HARVEST P2 [CAPABILITIES] cap-harvest-inventory
WHY: The task brief requires harvesting existing PING capability machinery (actor, resource/object, action, constraints, expiration, delegation, provider capability, owner capability, approval requirement, deny semantics, audit evidence) — not building a second authority. The machinery exists across the Pig-era hardening ar
EV: `~/workspace/gateway-hardening/orig-capability_registry.js` (312 lines) + `~/workspace/gateway-hardening/orig-exterior_auth_middleware.js` (251 lines) + `new-engine.js` wiring `CapabilityRegistry` int
ACC: a single inventory document maps the existing machinery to the brief's checklist (actor, resource/object, action, constraints, expiration, delegation, provider/owner capability, approval requirement, 

## cap-delegation-model
HARVEST P2 [CAPABILITIES] cap-delegation-model
WHY: The semantics around the authority need harvesting too: deny semantics (event_governance fails closed — audited), approval requirement (the approval→KnowledgePromoter→ranking path is wired but has received zero approvals: LOOP-002), owner capability (tenant owner as default human decision authority, CG-001, already rec
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` (LOOP-002: "All 68 knowledge nodes remain `candidate`"; expansion section: "the provider-binding decision that would unlock five expansion opportu
ACC: deny, approval, owner, provider, expiration, and delegation semantics are each documented as implemented / missing / decision-needed, with the provider-binding decision empirically investigated before

## cap-viewer-can
HARVEST P2 [CAPABILITIES] cap-viewer-can
WHY: FYD Social's authorization shape is already decided: components use `can(viewer, ...)` — never `if(demoMode)`. DEMO OWNER MODE produces the same ViewerContext/capability shape as real auth. This is the capability pattern the product harvests from the platform.
EV: memory `memory://md:memory/2026-09-21.md:1404` (Website Builder Authority Decisions 2026-09-21: "Owner: explicit DEMO OWNER MODE marked DEMO_AUTH NOT_PRODUCTION_AUTH producing the same ViewerContext/c
ACC: every FYD component authorizes through `can(viewer, ...)`; no demo-mode conditional exists anywhere in a component.

## cap-eventbridge-bypass-closed
IN_PROGRESS P2 [CAPABILITIES] cap-eventbridge-bypass-closed
WHY: EventBridge is a live, armed governance bypass in the running era: it re-emits `canonical_events` rows into UER with `_skipGovernance: true` and no namespace, so `tenant::hpp` rows land in `ping_events` as `core::system`, skipping event_registry validation and tenant namespace enforcement. The certified worktree closes
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-003 (live `gateway/bootstrap/gateway_runtime.js:542-550` instantiates EventBridge unconditionally, 5s poll; `ping-runtime/events/event_bridge
ACC: the bypass is closed on every running gateway (capability object required), or the bridge is removed; the firing check is recorded.

## dep-provenance-gap
DECISION P1 [ORACLE / DEPLOYMENT] dep-provenance-gap
WHY: On 2026-09-21 ~12:05 UTC the live gateway moved from the accepted baseline image (candidate-84486f056) to candidate-3c5d280dd with no promotion record, and a second identical candidate container was left running on :8081 against the same database. The deployment registry in Postgres is empty (0 rows). The build/test pr
EV: `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` (baseline vs live reality section; open question quoted verbatim); `~/workspace/FAILURE_LEDGER.md` FL-20260921-P1 (candidate build/test prove
ACC: Nolan decides: 3c5d280dd accepted as the new live baseline (provenance record updated) or not; :8081 stopped to restore single-writer; the decision and its evidence are recorded in the deployment regi

## dep-capacity
IN_PROGRESS P2 [ORACLE / DEPLOYMENT] dep-capacity
WHY: Disk was the recurring critical resource (80% on 2026-09-22, 83% on 09-20, and the 09-19 Pig C: crisis). The 2026-09-22 reclamation (80% → 56%, ~11 GB) bought headroom, but several items were deliberately left for later calls.
EV: `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` (reclamation table: /tmp image tarballs ~1.73 GB, journal vacuum ~3.2 GB, btmp 437 MB, builder prune 2.42 GB, dangling images 443 MB, postgre
ACC: the flagged follow-ups each get a decision: ollama retention (prove the runtime dependency or remove), the ~8 GB superseded images (verify rebuildability, then prune), `p18-oracle-staging` (remove or 

## dep-runtime-distribution-v1
IN_PROGRESS P2 [ORACLE / DEPLOYMENT] dep-runtime-distribution-v1
WHY: The Runtime Distribution v1 milestone is gated by its own sequencing: no Git repos on Oracle, no `runtime-manifest.json`. The 2026-09-22 keep-off inventory (read-only) confirmed compliance; no stripping was performed, correctly per the hard gate.
EV: `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("Keep-off inventory (read-only) completed: no git repos on Oracle; source trees total ~10M; audit artifacts in /opt/ping/releases (2.7G); p1
ACC: the milestone's sequencing completes (forensics → reachability/persistence/closure verification) and `runtime-manifest.json` exists, or the gate stays explicitly recorded as GATED.

## dep-side-by-side
DONE_VERIFIED P2 [ORACLE / DEPLOYMENT] dep-side-by-side
WHY: Side-by-side, minimum-change deployment is the proven discipline: the 3c5d280dd candidate was built and battery-tested on the side port (127.0.0.1:8081) with the live :8080 gateway untouched and protected images untouched. This is the procedure to keep.
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-P1 ("On Oracle at 127.0.0.1:8081... Live 8080 gateway untouched (/health 200 after the run). Protected images (oracle-gateway:certified-20260919, :latest, :
ACC: every candidate is proven on a side port with the live gateway and protected images untouched before any swap is considered.

## dep-docker-config-persistence
OPEN P2 [ORACLE / DEPLOYMENT] dep-docker-config-persistence
WHY: The Pig Docker credential-manager defect was worked around with an isolated Docker config at `/tmp/docker-isolated/config.json` (empty `{}`, anonymous public pulls) — and Nolan ordered that mechanism preserved. But `/tmp` is wiped without warning in this environment. A release-path mechanism that lives in `/tmp` is one
EV: `~/workspace/FAILURE_LEDGER.md` lines 1122-1126, 1142 (FL-20260920-014 UPDATE: "Created isolated Docker config at /tmp/docker-isolated/config.json with empty {} (no credential helpers)... Workaround i
ACC: the isolated Docker config lives at a persistent path (e.g. under `~/workspace/`), is documented as part of the release path, and a rebuild works from that path alone.

## dep-unidentified-stop
OPEN P2 [ORACLE / DEPLOYMENT] dep-unidentified-stop
WHY: On 2026-09-20T01:03:15Z, ping-gateway AND ping-postgres simultaneously stopped and detached from `oracle_ping_internal` by an unknown actor (docker events showed ephemeral containers + kill/stop API sequence; no compose/cron/SSH source found; possibly a delayed effect of an earlier killed compose call — unproven). An u
EV: memory `memory://md:memory/2026-09-19.md:1620` ("UNIDENTIFIED STOP INCIDENT 2026-09-20T01:03:15Z... Recovered."); `~/workspace/FAILURE_LEDGER.md` lines 439-440 (FL-20260919-ORACLE-006/007 rules: "trea
ACC: the actor is identified, or continuous `docker events` capture is in place so the next occurrence is attributable.