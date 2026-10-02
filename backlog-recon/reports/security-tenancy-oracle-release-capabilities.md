# PING / FYD Social — Archaeology Extraction Report

**Worker:** 20b74286 (6/8: security, secret hygiene, tenancy, database/migrations, release/certification, capabilities, Oracle/deployment) · **Date:** 2026-09-22. **Task:** extract backlog item candidates across SECURITY, SECRET HYGIENE, TENANCY, DATABASE/MIGRATIONS, RELEASE/CERTIFICATION, CAPABILITIES, ORACLE/DEPLOYMENT.

**60 items extracted.** Format per item: ID, DOMAIN, STATUS, PRIORITY (1/2/3), WHY, EVIDENCE, DEPENDENCIES, ACCEPTANCE, NEXT FALSIFICATION.

No files were created, edited, or deleted by the worker. No git commands were run. `/home/nolan/projects/ping` and `~/workspace/BACKLOG_NOLAN.md` were untouched.

---

## DOMAIN: SECRET HYGIENE

### sh-pg-password-incident
- **DOMAIN:** SECRET HYGIENE | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** The 2026-09-20 PostgreSQL password exposure is the canonical secret-hygiene lesson. It must be recorded permanently with the full arc: exposure, contested evidence, full-incident rotation, proof of old-credential death, and the standing rules it produced. (Task brief requires permanent recording.)
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1193-1204 (FL-20260920-022: env-listing command printed the PG password into tool output, exposure limited to agent runtime) + lines 1755-1799 (FL-20260920-022 ROTATION RECORD 2026-09-21 ~11:24-11:28 UTC: 48-char replacement written to `/opt/ping/.env` mode 600, ALTER ROLE via local socket with SQL on stdin, both containers recreated purging the dead credential from `docker inspect`, SCRAM verifier matches NEW only, old credential proven rejected over the real container-network path). Memory `MEMORY.md#L162` and `memory://md:memory/2026-09-21.md:1392` confirm resolution. **Contradiction (see section below):** `memory://md:memory/2026-09-20.md:1020` claims the allegation was unsupported and no rotation performed; that note predates the 2026-09-21 rotation and appears superseded by it, but the two records were never reconciled in one place.
- **DEPENDENCIES:** none (root lesson).
- **ACCEPTANCE:** The incident, the standing inspection rule, the rotation procedure, the rejection proofs, and the open pg_hba residual are all recorded in one durable place, with no secret values present.
- **NEXT FALSIFICATION:** grep the ledger entry for any secret value; confirm none.

### sh-redacted-inspection-rule
- **DOMAIN:** SECRET HYGIENE | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** Nolan's standing rule (2026-09-21): normal diagnostics must be safe to copy. Without a machine-enforced filter, every inspection is one careless paste from another FL-20260920-022.
- **EVIDENCE:** `memory://md:memory/2026-09-21.md:311` ("Secret-like names (PASSWORD, PASS, TOKEN, SECRET, KEY, CREDENTIAL, DATABASE_URL, AUTH, COOKIE) render as KEY=***REDACTED***; raw secret inspection requires an explicit exceptional action and stays machine-local"); `MEMORY.md#L162` repeats it. Implemented as `~/workspace/tools/redact-secrets.py` (KEY=VALUE, JSON pair, and Authorization/Cookie/Set-Cookie header redaction; non-matching lines byte-identical) with regression tests in `~/workspace/tools/test-redact-secrets.py`.
- **DEPENDENCIES:** sh-pg-password-incident.
- **ACCEPTANCE:** Every operator diagnostics path pipes through the redactor; raw inspection requires an explicit exceptional action.
- **NEXT FALSIFICATION:** run `test-redact-secrets.py`; attempt a diagnostic containing a synthetic `POSTGRES_PASSWORD=` value and confirm it renders `***REDACTED***`.

### sh-secret-pattern-regression
- **DOMAIN:** SECRET HYGIENE | **STATUS:** DONE_VERIFIED | **PRIORITY:** 2
- **WHY:** Secrets must never ship inside a distribution closure. A machine gate beats a policy sentence.
- **EVIDENCE:** `~/workspace/laneC/security-negatives.js`: deterministic negative assertions over the exact distribution snapshot. S1: no credential-bearing filenames (`*.pem, *.key, id_rsa*, .env, .env.*`); S2: no high-confidence secret content in shipped non-source files (private-key blocks, provider key prefixes). Exit 0 PASS / 1 FAIL / 2 usage error. Gate 7 of the release sequence (`~/workspace/laneC/RELEASE-SEQUENCE.md`). The ledger (lines 585-596) records it catching a rule-overbreadth defect (`.env.example` false-positive) pre-commit, proving it runs against fixtures.
- **DEPENDENCIES:** rel-one-sequence (as gate 7).
- **ACCEPTANCE:** `security-negatives.js` runs as release-certify gate 7 on every candidate snapshot; exit non-zero blocks promotion.
- **NEXT FALSIFICATION:** run it against a fixture snapshot seeded with a synthetic private key; confirm FAIL.

### sh-rotation-procedure
- **DOMAIN:** SECRET HYGIENE | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** Rotation must be a rehearsed, rollback-safe procedure that never prints key values, not an improvised scramble.
- **EVIDENCE:** `~/workspace/gateway-rotation/rotate-gateway-keys.ps1` (2026-09-13): rotates the two exterior bearer keys; generates fresh 256-bit keys; reads old rows into memory only for rollback; SQL travels via stdin pipe (never argv, never disk); "The script NEVER prints key values. It exits 0 only on full success"; state-machine rollback restores old container + old DB rows on any failure after step 4. The 2026-09-21 PG rotation followed the emergency-fix path with the same properties (SQL on stdin, SCRAM comparison in-memory, no values in files/logs/reports).
- **DEPENDENCIES:** sh-pg-password-incident.
- **ACCEPTANCE:** A documented, value-never-printed rotation procedure exists for every credential class (exterior bearer keys, PG role password) and has been executed at least once each.
- **NEXT FALSIFICATION:** confirm whether `rotate-gateway-keys.ps1` has any recorded execution (none found in sources reviewed); if not, dry-run the mechanics against a scratch stack.

### sh-old-credential-rejection
- **DOMAIN:** SECRET HYGIENE | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** Rotation is not complete when the new credential works; it is complete when the old one is proven dead on the real network path. A trust-localhost rejection proof is worthless.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1779-1784: SCRAM verifier matches NEW credential only; old credential rejected over the real network path (transient peer container on `oracle_ping_internal` got `FATAL: password authentication failed`, rc=2). Critically, the record notes the earlier rejection attempt from inside the postgres container was INVALID because `pg_hba.conf` trusts local and 127.0.0.1/32 (any password works on loopback). All four historical passwords dead.
- **DEPENDENCIES:** sh-rotation-procedure.
- **ACCEPTANCE:** every future rotation includes a rejection proof over the real network path, with the loopback-trust caveat stated.
- **NEXT FALSIFICATION:** re-verify any time with SCRAM comparison via pg_authid (read-only) + `GET /health`.

### sh-history-log-report-scans
- **DOMAIN:** SECRET HYGIENE | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** A rotated credential can live on in bash history, build logs, container logs, exited-container envs, and workspace files. The sweep must be explicit and recorded.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1792-1795: all four historical values swept (byte comparison in-memory, paths only) across `/home/ubuntu/.bash_history` (absent), `/opt/ping/.env` + both backups, `.pgpass`, p18-oracle-staging build logs, live container logs, exited container envs. Local sweep: 12,935 files under `~/workspace` and `~/workspace/transfer`, no match. **Residual:** "Git history -S check could not run in this sandbox (/home/nolan/projects/ping absent); parent should run it read-only."
- **DEPENDENCIES:** sh-rotation-procedure.
- **ACCEPTANCE:** the git `-S` history check runs read-only on the real repo; all four historical values confirmed absent from history, or their commits named.
- **NEXT FALSIFICATION:** `git log -S <redacted>` is not runnable by anyone reading this; the parent must run the scan and record the result.

### sh-consumer-agreement
- **DOMAIN:** SECRET HYGIENE | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** The rotation exposed a drift: `/opt/ping/.env` held a stale credential relative to the live one; the Sep-21 deploy bypassed `.env` entirely. Consumers agreeing after rotation is not the same as a rule that keeps them agreeing.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1758-1764 (four distinct historical passwords existed: live-then 32-char exposed Sep-20, `/opt/ping/.env` pre-rotation value, `.env.bak-20260917` value, `.pgpass` value) and lines 1797-1798 ("Post-rotation all five consumers (DB, gateway env, postgres env, .env, .pgpass) agree again. The deploy lane should route future credential changes through .env").
- **DEPENDENCIES:** sh-rotation-procedure.
- **ACCEPTANCE:** a single consumer list is recorded and the deploy lane routes credential changes through `.env` (or a named successor), with a pre-deploy agreement check.
- **NEXT FALSIFICATION:** diff the live credential source-of-truth against every consumer; any divergence reopens this.

### sh-pghba-scram
- **DOMAIN:** SECRET HYGIENE | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** `pg_hba.conf` trusts local + 127.0.0.1/32 + ::1/128, so the DB password is not checked on loopback. Anyone with `docker exec` on ping-postgres gets passwordless access, which also invalidates naive rejection proofs. This is the one standing risk the rotation record explicitly named.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1796-1797 ("pg_hba.conf trusts local + 127.0.0.1/32 + ::1/128, so the DB password is not checked on loopback; anyone with `docker exec` on ping-postgres gets passwordless access. Tighten to scram-sha-256 (requires a postgres reload; low risk, but a config change needing a decision)"); memory `MEMORY.md#L162` ("pg_hba.conf scram-sha-256 tightening still pending").
- **DEPENDENCIES:** sh-pg-password-incident (the rotation record is the source).
- **ACCEPTANCE:** `pg_hba.conf` requires scram-sha-256 on all paths; the old-credential rejection proof is re-run and passes.
- **NEXT FALSIFICATION:** `SHOW hba_file` + dump; any `trust` line for a reachable path fails this.

### sh-degraded-key-leak
- **DOMAIN:** SECRET HYGIENE | **STATUS:** IN_PROGRESS | **PRIORITY:** 1
- **WHY:** When the gateway boots without Postgres it enters in-memory degraded mode, generates API keys, and prints them into container logs. /health still returns 200, so the leak is invisible to health checks.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 435-436 (FL-20260919-ORACLE-006 cascade: "gateway booted while postgres was still initializing and fell into IN-MEMORY DEGRADED MODE (CapabilityAuthority/ExteriorAuth/Postgres all degraded), printing GENERATED API keys into the container logs... Secret hygiene note: generated credentials are visible in `docker logs` history from degraded boots"); memory `memory://md:memory/2026-09-19.md:1688` ("the leak does NOT exist in the convergence worktree code... Hygiene test guards the degraded path"; "Oracle degraded-boot log history is a deploy-lane hygiene note"); memory `memory://md:memory/2026-09-17.md:423` (contained incident: ephemeral keys never usable externally, destroyed with old container); ledger line 492 (P0-6 redaction verified working in deployed code).
- **DEPENDENCIES:** sh-redacted-inspection-rule.
- **ACCEPTANCE:** no generated credential value ever appears in any container log; degraded boot either redacts or refuses to print; a startup-retry removes the degraded-on-boot path that created the leak window.
- **NEXT FALSIFICATION:** force a degraded boot on a scratch stack; grep the resulting logs for the generated key value.

### sh-exited-container-envs
- **DOMAIN:** SECRET HYGIENE | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** The dead credential remains visible in `docker inspect` output of two exited gateway containers. It cannot authenticate, but "dead" and "invisible" are different claims, and deploy-lane history is not a reason to keep it readable forever.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1798-1799 ("The two exited gateway containers still show the dead credential in `docker inspect`; remove them when the deploy lane no longer needs them": `ping-gateway-old-512776de5`, `ping-gateway-rollback-rc4d522a6b`).
- **DEPENDENCIES:** sh-pg-password-incident.
- **ACCEPTANCE:** both exited containers are removed once the deploy lane confirms they are no longer needed; a final `docker inspect` sweep shows no secret-bearing env on any non-running container.
- **NEXT FALSIFICATION:** `docker inspect` the two named containers; any credential-shaped env value fails this.

---

## DOMAIN: SECURITY

### sec-tenants-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** Tenant registry CRUD is fully unauthenticated and runtime-proven writable by anyone who can reach the port. Tenant creation is an authorization decision; a public endpoint makes it a suggestion.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-001 (POST/PUT/DELETE/GET `/tenants` has no authentication; `gateway_runtime.js:795` mounts without `exteriorAuthMiddleware`; runtime probe: unauthenticated `POST /tenants {"tenant_id":"probe"}` → HTTP 200, row created) and INTEGRITY NOTES + `~/workspace/FAILURE_LEDGER.md` lines 496-502 (FL-20260919-AUDIT-001: probe row `tenant_id='probe', status=active` created 2026-09-20 01:54 UTC; parent later verified the single row via SELECT and issued surgical `DELETE FROM tenant_registry WHERE tenant_id='probe'`, verified zero rows remain). Defect itself unfixed, owned by convergence lane.
- **DEPENDENCIES:** ten-agent-tenant-binding (the auth model decision).
- **ACCEPTANCE:** unauthenticated `POST /tenants` returns 401/403 and writes nothing; authenticated creation requires a named authorizer.
- **NEXT FALSIFICATION:** repeat the audit's probe (GET-first per FL-20260919-AUDIT-001's lesson; never write-probe a live surface in a read-only pass).

### sec-mc-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** Business-intelligence surfaces (lead lists, unpaid invoices, at-risk projects, marketing, inbox, knowledge, missions) are public. This is customer business data readable by anyone who can reach port 8080 (bound 0.0.0.0).
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-002 (`/mc/dashboard`, `/mc/business/who-needs-followup`, `/mc/business/stalled-estimates`, `/mc/business/pending-reviews`, `/mc/business/ai-recommendations`, `/mc/business/today-work`, `/mc/business/unpaid-invoices`, `/mc/business/at-risk-projects`, `/mc/business/marketing`, `/mc/inbox`, `/mc/knowledge`, `/mc/missions/*` require neither auth nor PG-check beyond `requirePG` at `gateway_runtime.js:920`; runtime: `GET /mc/business/who-needs-followup` → 200; `/mc/system` → 200 exposing worker internals and connector status).
- **DEPENDENCIES:** ten-agent-tenant-binding (scoping), ten-second-tenant-boundary.
- **ACCEPTANCE:** every `/mc/*` route requires authentication and returns only data the caller's tenant is entitled to.
- **NEXT FALSIFICATION:** unauthenticated GET on `/mc/business/unpaid-invoices`; any 200 fails this.

### sec-context-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Event-context surfaces are public and tenant-unscoped: cross-tenant event reads without authentication.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-003 (`gateway_runtime.js:791` mounts without auth; `routes/context.js:14-48`; runtime `GET /context/recent-events` → 200).
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** `/context/*` requires auth and enforces the caller's namespace.
- **NEXT FALSIFICATION:** unauthenticated `GET /context/recent-events`; 200 fails this.

### sec-repository-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** Anonymous arbitrary write and delete on the object repository. This is repository poisoning and deletion by anyone who can reach the port.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-004 (`POST /api/v1/repository/objects` arbitrary kind/data and `DELETE /api/v1/repository/objects/:id` require no auth; `gateway_runtime.js:792`; `routes/repository.js:14-40`; runtime GET → 200; POST/DELETE not probed to avoid mutation; code unambiguous).
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** write/delete on `/api/v1/repository/*` require authentication with capability evidence; deletes are governed, not anonymous.
- **NEXT FALSIFICATION:** code-read the current route file; any auth-free mutating route fails this.

### sec-system-logs
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 3
- **WHY:** Internal logs are world-readable. Filenames are fixed (no traversal), but audit log contents should not be public.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-005 (`routes/system.js:21-59` uses `path.join` on constants; audit log contents world-readable).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** `/system` log routes require authentication (or are removed from the public surface).
- **NEXT FALSIFICATION:** unauthenticated GET on a `/system` log route; 200 fails this.

### sec-worker-attribution
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Worker identity is self-asserted on `POST /events/processed` and `POST /events/failed`; the caller-supplied `worker` string is written to `event_processing.worker`. "Who processed what" provenance is forgeable, which poisons evidence lineage.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-006 (`routes/events.js:144-160`; container `event_read_authority.js:303-335`, `worker || 'unknown'`, no binding to the authenticated agent; partial mitigant: orchestration records `submittedBy: <real agent>`, but a level-2 agent can still submit as another registered worker).
- **DEPENDENCIES:** ten-principal-propagation.
- **ACCEPTANCE:** the recorded worker identity is bound to the authenticated principal; a read-only diff of `submittedBy` vs `workerId` in `mission.workerOutputs` shows zero mismatches.
- **NEXT FALSIFICATION:** the audit's experiment 12: read-only scan of `mission.workerOutputs` for `submittedBy`/`workerId` mismatches.

### sec-credential-expiry
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Exterior credentials never expire and there is no rotation/revocation path in code. A leaked key is permanent access.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-007 (`exterior_agent_credentials` rows for `muse` and `muse-level-2` have `expires_at = NULL`, active, last used 2026-09-17 / 2026-09-19; no code route rotates or revokes; rotation = direct DB edit).
- **DEPENDENCIES:** sh-rotation-procedure (the bearer-key rotation script exists but has no recorded execution).
- **ACCEPTANCE:** credentials carry expirations; a code path (not direct DB edit) rotates and revokes them.
- **NEXT FALSIFICATION:** SELECT `expires_at` on `exterior_agent_credentials`; any NULL on an active key fails this.

### sec-hardcoded-pg-fallback
- **DOMAIN:** SECURITY | **STATUS:** PROVE | **PRIORITY:** 3
- **WHY:** Source contains a hardcoded PG credential fallback. It is reportedly not in effect (container uses env), but an unused credential in source is a latent exposure and a standing contradiction of the secret-hygiene rules.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-008 ("Hardcoded PG credential fallback in source"; severity LOW; "not in effect; container uses env").
- **DEPENDENCIES:** sh-secret-pattern-regression (S2 should catch it if it is key-shaped in a shipped file).
- **ACCEPTANCE:** the fallback is removed from source, or proven unreachable and excluded from every distribution snapshot by the S1/S2 gate.
- **NEXT FALSIFICATION:** grep the distribution snapshot for the fallback string; any hit fails this.

### sec-knowledge-public
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Knowledge-graph writes are public with caller-supplied status/confidence/namespace, and unscoped reads return cross-namespace nodes. The Ollama chat surface is public too. Knowledge integrity and tenant isolation both fail here.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` EXCLUSION-SET STATE UPDATE (`POST /knowledge/nodes` and `POST /knowledge/edges` remain public with caller-supplied status/confidence/namespace; `GET /knowledge/nodes` without `namespace` returns cross-namespace nodes; `POST /api/v1/ollama/chat` plus `/models`, `/autocomplete` remain public. None are fixed.)
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** knowledge writes require auth and are namespace-bound to the caller's tenant; unscoped cross-namespace reads are denied.
- **NEXT FALSIFICATION:** unauthenticated `POST /knowledge/nodes`; 200 fails this.

### sec-fail-closed-verified
- **DOMAIN:** SECURITY | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** The controls that are already sound must be named so refactors do not silently break them. Fail-closed is the architectural posture everything else assumes.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` NEGATIVE FINDINGS: "Auth middleware fail-closed (audited): missing/invalid key → 401; PG outage → in-memory fallback still denies unknown keys. No fail-open found."; "Event governance, capability authority, orchestration writes all fail closed (audited, sound)."; "Degraded-mode route gating fails closed (N-B): PG-unavailable → canonical routes return 503, never silent success."
- **DEPENDENCIES:** none (guardrail).
- **ACCEPTANCE:** every auth/governance refactor ships with a fail-closed regression test; a fail-open is a release-blocking defect.
- **NEXT FALSIFICATION:** negative-test the auth middleware with missing/invalid keys and a simulated PG outage; any non-denial fails this.

### sec-integration-fake-green
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Integrations report "healthy" with no credentials configured and zero events ever sent. "Healthy" means enabled, not credentialed. Operators cannot distinguish a working integration from an unconfigured one.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-001 (posthog/email/sms report `status:"healthy"` with `"apiKey":"not configured"` etc., `eventCount:0`, `sent:0`; `posthog_integration.js:28-31`: `status: this._enabled ? 'healthy' : 'disabled'`; the status vocabulary has no "unconfigured" state).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** health vocabulary includes an "unconfigured"/"disabled" state; no integration reports "healthy" without credentials and at least one successful send.
- **NEXT FALSIFICATION:** scratch-env status matrix (with/without credentials); "healthy" without credentials fails this.

### sec-health-empty-checks
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** `getHealth()` starts at `status: 'healthy'` and iterates zero registered checks, returning healthy with nothing proven. Absence of evidence is presented as evidence of health.
- **EVIDENCE:** `~/workspace/health-truth-audit-2026-09-20.md` Finding 1 (`gateway/health_authority.js`; zero checks → `{status: 'healthy', components: {}}`). Minimal fix proposed in the audit: if `this._healthChecks.size === 0`, return `status: 'unknown'`/`'unproven'`. Also `~/workspace/ORACLE_CRITICAL_PATH_2026-09-20.md` DEFER #4 ("/health 200 when authority absent").
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** zero registered checks → `status: 'unknown'` (or `unproven`) with an explicit note; never `healthy`.
- **NEXT FALSIFICATION:** instantiate the authority with no checks; any `healthy` fails this.

### sec-health-component-honesty
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Component checks hardcode `status:'healthy'` (ignoring their own `stats.failed`), and the `/health` fallback returns hardcoded 200-healthy when the health authority is missing. Defense-in-depth defaults must be 503/unknown, never 200-healthy.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-002 (`gateway_runtime.js:852-869`; `event_runtime`, `canonicalization`, `embedding` hardcode healthy; contrast `event_governance` which gates on `stats.rejected === 0`) and OBS-004 (fallback returns hardcoded 200-healthy when the health authority is missing; latent).
- **DEPENDENCIES:** sec-health-empty-checks.
- **ACCEPTANCE:** every component check derives its status from its own stats (mirror the `event_governance` pattern); the missing-authority fallback is 503/unknown.
- **NEXT FALSIFICATION:** inject a failed event into stats; any `healthy` from that component fails this.

### sec-503-misattribution
- **DOMAIN:** SECURITY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** `_pgRoute` returns 503 `{error:'Postgres unavailable', degraded:true}` even when Postgres is reachable and the migration is what's failing. Operators chase the database instead of the migration/trigger policy. This is the same failure-semantics collapse as PING law 11.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-007 and REC-002 (`_startPgRecoveryLoop` distinguishes only NOT_READY/READY; one catch wraps both `SELECT 1` and `_initializeSpineOnce`; logs only `attempt === 1 || attempt % 10 === 0`; no attempt ceiling, no error classification, no terminal state; the reason string mislabels migration/trigger failure as Postgres unavailability).
- **DEPENDENCIES:** db-trigger-owner (the mislabeled failure class).
- **ACCEPTANCE:** connectivity probe is separated from spine-init; consecutive identical failures are counted and surfaced as `{phase, consecutiveFailures, lastError}`; deterministic failures reach a terminal state instead of infinite sparse-logged retry.
- **NEXT FALSIFICATION:** unit-test the recovery loop against a fake pool throwing trigger-violation on the migration step; no terminal state, or attempts 2-9 logging nothing, fails this.

---

## DOMAIN: TENANCY

### ten-agent-tenant-binding
- **DOMAIN:** TENANCY | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** There is no agent↔tenant binding anywhere. Tenant is caller-asserted at every layer; any authenticated agent can emit into `tenant::hpp` or any invented tenant. "Namespace = privacy boundary" is a comment, not an enforcement. This is the G4 grill question and it gates the second tenant.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-001 (`/ingest` `authorizeNamespace` = "explicit request > per-source map > default" with only regex validation; `/events` POST validates tenant existence, not caller ownership; `GET /events` with no namespace returns all namespaces; `/knowledge/search` namespace caller-supplied; Qdrant single shared collection `knowledge` with namespace as payload field; nothing constrains a worker to its namespace; grepped for agent↔tenant mappings: zero hits; `tenant_registry` has no tenant owners/agents). Runtime state: single tenant (`hpp`; `ping_events`: 177 `tenant::hpp` / 1018 `core::system` / 10 `core::owner`). Memory `memory://md:memory/2026-09-14.md:433` (2026-09-14 production trace: "tenant isolation on `ping_events` was not enforced"). The audit's candidate grill G4 names the options: credential-scoped tenants, tenant registry owning principals, or explicit single-tenant-until-redesign.
- **DEPENDENCIES:** none (root decision; blocks ten-second-tenant-boundary, ten-dual-registries, ten-principal-propagation).
- **ACCEPTANCE:** a named authority model is decided and enforced: every emit/read is bound to the caller's tenant, and a cross-tenant attempt is denied, not merely unvalidated.
- **NEXT FALSIFICATION:** the audit's experiment 5 (authorized, non-destructive): authenticated `POST /ingest` with `namespace:"tenant::someone-else"` from the Level-1 key, then read back from a different credential. Success proves the gap is live.

### ten-dual-registries
- **DOMAIN:** TENANCY | **STATUS:** DECISION | **PRIORITY:** 2
- **WHY:** Two tenant registries exist and are disconnected: `tenant_registry` (public CRUD via `/tenants`) vs `tenants` (ingestion boundary for `/events`, seed-only `hpp`). Registering via the API does not authorize ingestion; ingestion tenants cannot be added via any API. Tenant onboarding is incoherent.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-002 ("no join"; folds into TEN-001's decision).
- **DEPENDENCIES:** ten-agent-tenant-binding (folds into the G4 decision).
- **ACCEPTANCE:** one registry owns tenant identity; API registration and ingestion authorization read the same source of truth.
- **NEXT FALSIFICATION:** create a tenant via `/tenants`, then attempt ingestion as that tenant; any divergence between registry and ingestion behavior fails this.

### ten-principal-propagation
- **DOMAIN:** TENANCY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** `req.authenticatedAgent` is attached by middleware but consumed by almost nothing (7 hits, all in routes, none in runtime/workers/evidence/replay). `/ingest` never records the agent; event→mission→worker carries only namespace and free-text `source`. Replay and evidence attest to asserted sources.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-003. The audit's recommended next step: bind the principal into event metadata at the authenticated routes. Memory `memory://md:memory/2026-09-13.md:645` (Nolan's minimum trace chain starts with WHO → ... → AUTHORIZED BY).
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** every canonical event carries the authenticated principal in its metadata; evidence/replay attest to the bound principal, not the asserted `source` string.
- **NEXT FALSIFICATION:** emit via an authenticated route and read back the event metadata; absent principal fails this.

### ten-scoped-replay-evidence
- **DOMAIN:** TENANCY | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Replay, projection, and evidence paths carry no tenant scoping or caller authorization. A second tenant's history and evidence would be replayable by the first tenant's credentials.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-004 (`replay_verifier.js`, `materialized_views.js` contain zero `tenant` references; `evidence_authority.js` checks namespace consistency but never requester entitlement). Latent: one tenant today.
- **DEPENDENCIES:** ten-agent-tenant-binding.
- **ACCEPTANCE:** replay, projection rebuilds, and evidence reads enforce the caller's tenant; cross-tenant replay is denied.
- **NEXT FALSIFICATION:** grep `replay_verifier.js` and `materialized_views.js` for `tenant`; zero hits fails this.

### ten-second-tenant-boundary
- **DOMAIN:** TENANCY | **STATUS:** BLOCKED | **PRIORITY:** 1
- **WHY:** The second real tenant must not arrive on an imaginary privacy boundary. Today the boundary is a comment; onboarding tenant #2 before G4 lands would make cross-tenant reads/writes possible on day one.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` EXP-006 ("BLOCKED on tenant isolation being proven first: TEN-001 shows namespace isolation is unenforced, so a second tenant's SOPs would be readable/writable by any credentialed agent on day one. Do not build until the TEN-001 decision lands."); memory `memory://md:memory/2026-09-14.md:433` (single-tenant substrate with real exterior-agent authority boundaries but no tenant isolation).
- **DEPENDENCIES:** ten-agent-tenant-binding (G4 decision) — hard block.
- **ACCEPTANCE:** no second tenant is onboarded until the authority model is decided and the cross-principal bleed proof (experiment 5) fails closed.
- **NEXT FALSIFICATION:** attempt the cross-tenant emit/read; success means the boundary is still imaginary.

### ten-never-two-writers
- **DOMAIN:** TENANCY | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** Both Oracle gateways (`ping-gateway` :8080 and `ping-gateway-candidate` :8081) run the identical image `ping-gateway:candidate-3c5d280dd` with identical env against the same database. `canonical_events` is 0 rows today, so no active writes, but the never-two-writers invariant is currently violated in posture. This is Nolan's open question from the 2026-09-22 status.
- **EVIDENCE:** `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("both `ping-gateway` (:8080) and `ping-gateway-candidate` (:8081) run `ping-gateway:candidate-3c5d280dd` (sha256:4aa9d7f6…), started 2026-09-21T12:03–12:05Z, restarts=0, healthy 26h+. ... Both gateways have identical env → both point at the same DB (latent two-writer concern; `canonical_events` is currently 0 rows, so no active writes)"). Recommended default in the report: accept 3c5d280dd as the new live baseline and stop :8081 after Nolan's confirm.
- **DEPENDENCIES:** dep-provenance-gap (same decision point).
- **ACCEPTANCE:** exactly one writer to the canonical database; :8081 stopped or re-scoped, and the invariant is recorded as a standing deployment rule.
- **NEXT FALSIFICATION:** list running gateway containers and their DB targets; two writers to one canonical DB fails this.

---

## DOMAIN: DATABASE/MIGRATIONS

### db-trigger-owner
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** Oracle's `ping_events` is guarded by an append-only trigger that exists in no repository, names no owner, documents no exception path, and rejects the certified migration's UPDATE on every boot attempt, forever. No one can authorize a fix because no one is named. This is the G1 grill question: the single highest-consequence unanswered question in the 2026-09-19 audit.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-007 (proven by exhaustive absence across all three trees; `ping-oracle-deploy/infrastructure/oracle/schema.sql:127-170` defines `prevent_update()` triggers only for other tables) and REC-004 (no policy file, comment, or doc names an owner or defines a migration-exception procedure). Lane A's fixture record (`~/workspace/laneC/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md`): triggers captured byte-verbatim via `pg_get_triggerdef`: `trg_ping_events_append_only` (BEFORE DELETE OR UPDATE ON ping_events FOR EACH ROW) and `trg_ping_events_append_only_truncate` (BEFORE TRUNCATE); function `public.ping_events_no_mutation()` raises unconditionally; NO maintenance exception path; "installed out-of-band on Oracle; preserved per standing law. The migration is the side that changes." G1 options: (a) trigger absolute, migrations must be trigger-compatible; (b) a named owner can authorize explicit exceptions; (c) policy moves into version control with an exception procedure.
- **DEPENDENCIES:** none (root decision; gates db-migration-trigger-gate).
- **ACCEPTANCE:** the trigger policy has a named owner and a documented migration-exception path, or the absolute-trigger doctrine is recorded as law and every migration is trigger-compatible by construction.
- **NEXT FALSIFICATION:** SELECT-only `pg_get_triggerdef()` + `pg_shdepend` dump on Oracle; any trigger without a named owner fails this.

### db-migration-nonatomic
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** IN_PROGRESS | **PRIORITY:** 1
- **WHY:** The sequence migration applied as 4 separate non-transactional statements with no version record and no reconciler; on Oracle, step 2 committed, step 3 threw on the trigger, step 4 never ran, and every boot replays the exact partial failure. Half-applied state was the normal outcome of any failure.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` REC-001 (no BEGIN/COMMIT, no savepoints; `migration_engine.js` versions 1-11 covers `repository_*` tables only); `~/workspace/laneC/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md` ("Fixed by the events lane in 8e2496b14: the backfill UPDATE is removed (option B: sequence for new events only; legacy rows keep explicit unknown-ordering semantics), NOT NULL is conditional on zero NULL rows"). Gate 6's execution portion is BLOCKED (exit 3) pending Lane A's fixture result.
- **DEPENDENCIES:** db-trigger-owner (the policy side), db-migration-trigger-gate (the proof side).
- **ACCEPTANCE:** the corrected migration runs against both fixture variants (A: pre-sequence Oracle state; B: Oracle's actual half-applied state) and passes all 8 gate assertions, including "historical semantic content UNCHANGED" and "enforcement intact."
- **NEXT FALSIFICATION:** run the Lane A gate on a scratch Postgres; any violated assertion fails this.

### db-migration-trigger-gate
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** BLOCKED | **PRIORITY:** 1
- **WHY:** This is the pre-promotion gate that would have prevented the failed Oracle deploy: run the startup migration against a trigger-enforcing scratch fixture. The fixture exists; the execution evidence is unevaluated. A BLOCKED gate blocks promotion exactly like a FAIL.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` (gate 6: "migration/trigger | migration-trigger-gate.js | FL-20260919-ORACLE-008: startup UPDATE vs append-only trigger. Fixture execution BLOCKED until Lane A lands"); `~/workspace/laneC/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md` (fixtures: `oracle-append-only-fixture.sql` variant A, `variant_b.sql` variant B = Oracle's actual current state: nullable sequence column + nextval default, no unique index, no NOT NULL, triggers installed; "Connection via PGHOST/PGPORT/PGUSER/PGPASSWORD env (never printed); needs a scratch Postgres"); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-005/OBS-006 (smoke stops before the DB spine; "CERTIFIED 189/189" covers module membership only; the doctrine's migration/schema-compatibility field is populated by nothing).
- **DEPENDENCIES:** db-trigger-owner (policy), db-migration-nonatomic (the fix under test).
- **ACCEPTANCE:** every release candidate's startup migration block executes against the trigger-enforcing fixture and the result is recorded in the certification artifact's migration/schema-compatibility field.
- **NEXT FALSIFICATION:** promote any image whose gate-6 execution evidence is missing or BLOCKED; the promotion itself fails this.

### db-versioned-migrations
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** `gateway/migration_engine.js` (versions 1-11) covers `repository_*` tables only; `repository_store_migrations` has 11 rows, all repository versions. The sequence migration lived outside the versioned system, which is why it had no version record and no reconciler.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` REC-001 ("searched for any migration ledger/reconciler for the sequence migration; only idempotent DDL re-execution").
- **DEPENDENCIES:** db-migration-trigger-gate.
- **ACCEPTANCE:** every canonical-store schema change runs through a versioned, recorded migration; no schema change lives only in a boot-time `initialize()` block.
- **NEXT FALSIFICATION:** inventory every DDL/DML statement in `UnifiedEventRuntime.initialize()`; any statement without a migration version fails this.

### db-nullable-sequence
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Oracle's `ping_events` currently sits in the documented half-applied state: nullable sequence column + nextval default, no unique index, no NOT NULL, triggers installed. The state is honest and recorded, but convergence to the final schema (unique index; NOT NULL only when zero NULL rows, per the 8e2496b14 fix) has not been verified on Oracle.
- **EVIDENCE:** `~/workspace/laneC/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md` (variant B = "Oracle's ACTUAL current state after the failed deploy"); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` REC-001 (the stable half-applied state).
- **DEPENDENCIES:** db-migration-nonatomic, db-migration-trigger-gate.
- **ACCEPTANCE:** Oracle's `ping_events` reaches the gate-asserted post-migration schema (sequence BIGINT nullable with nextval default, sequence owned by the column, unique index present, legacy rows keep NULL) with the trigger still enforcing.
- **NEXT FALSIFICATION:** diff `information_schema` on Oracle against the gate's expected post-migration schema; any divergence fails this.

### db-silent-drop
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** `CanonicalEventEnvelope` silently drops events on sequence collision with a success return, in both trees. Two concurrent same-tenant emits compute the same `MAX(sequence)+1`; the loser's `INSERT ... ON CONFLICT (tenant_id, sequence) DO NOTHING` no-ops; `executeEmitEvent` returns the event object unconditionally with no rowCount check. Accepted business events (customer reviews via `review.received` for `tenant::hpp`) can vanish while the producer believes they were stored — the exact "reliable capture" failure PING promises customers it fixes.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-013 (code-proven in both trees: `canonical_event_envelope.js:100-108`, `:174-178`, `:187`; conflict target is `(tenant_id, sequence)`, not `event_id`; bonus: event_id = UUID-v5 over `tenantId:eventType:timestamp:sequence`, so timestamp in the preimage makes retries mint different IDs) and PERS-003 (second lane, same mechanism).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** concurrent same-tenant emits never lose a row silently; the INSERT rowCount is checked and a zero-row insert throws (fail-loud).
- **NEXT FALSIFICATION:** the audit's experiment 2: scratch-DB concurrency repro, two parallel `executeEmitEvent` calls, same tenant; assert both rows exist. One missing fails this.

### db-unprocessed-write-never
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 3
- **WHY:** `ping_events.processed` is write-never but read-live: the sole `UPDATE ping_events` in the codebase is the sequence backfill, so `GET /events/unprocessed` and mission-control's `query({unprocessed:true})` return ALL events on every call, forever. A future consumer built on this cursor would reprocess the full table every poll.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` PERS-002 (column defined, indexed, queried; no writers; EventBridge marks `processed` only on `canonical_events`, never `ping_events`).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the `unprocessed` option is either wired to a real writer or deleted; no endpoint returns the whole table under an "unprocessed" label.
- **NEXT FALSIFICATION:** the audit's experiment 4: `GET /events/unprocessed?limit=5` twice; identical full-table semantics fails this.

### db-canonical-identity-bytes
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** HARVEST | **PRIORITY:** 2
- **WHY:** Event identity is Node-`JSON.stringify`-bound (insertion key order, no whitespace, no Unicode escaping, `1.0`→`"1"`); no non-Node producer can reproduce it byte-for-byte. Meanwhile `canonical_authority.js:7` declares "There shall be only one canonical serializer," but the UER identity path bypasses it with raw `JSON.stringify`. The harvest target is the existing canonical authority, extended to the identity path.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` RTC-001 (`event_id` = `sha256(JSON.stringify({eventType, source, namespace?, logical_id|payload}))`, worktree and Pig identical; Python uses `observation_sha256` over raw UTF-8 observation text linked only via sidecar files; the HTTP ingestion path never accepts `logical_id`, so every Python-emitted event hashes over the full payload including the Python-generated timestamp).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** canonical event-identity bytes are defined once (sorted-keys JSON, explicit float/Unicode rules); a JS implementation and a Python reference implementation produce identical sha256 on a fixture corpus. No live-hash change until proven.
- **NEXT FALSIFICATION:** the audit's experiment 6: cross-implementation fixture corpus; any digest mismatch fails this.

### db-era-cutover
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** The identity-era cutover re-mints every event ID (live: naked 64-hex `SHA-256(JSON.stringify(...))` camelCase insertion-order; certified: `event_<16hex>` via IdentityAuthority with RFC-8785 canonicalization and `core::system` namespace default). Same logical event gets different IDs across the cutover; `ON CONFLICT (event_id)` dedup cannot match; lineage links break; witness roots are incomparable; Qdrant projections keyed by event_id double-land. No cross-era dedup plan exists. Difficult to reverse once rows accumulate.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-011/F1 (code + era census `evidence/f7-freeze-2026-09-18/02-era-census-and-bridge.md`: 739 Era-H rows, 0 V1 rows). Grill G2 options: (a) accept double-landing with an era marker column and documented semantics; (b) define a cross-era dedup key over logical identity material before cutover; (c) defer cutover until (b) exists.
- **DEPENDENCIES:** none (root decision).
- **ACCEPTANCE:** Nolan decides G2; the chosen semantics are recorded and enforced before any cutover traffic.
- **NEXT FALSIFICATION:** the audit's experiment 3: SELECT-only era census on the canonical DB (count 64-hex vs `event_` IDs); an unmarked mixed-era journal fails this.

### db-redelivery-semantics
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 3
- **WHY:** Redelivery flips at-most-once to at-least-once (live UER early-returns on duplicate; certified UER re-runs handlers unconditionally after the duplicate re-read). Both live subscribers are idempotent today, but the semantic change is undocumented — any future non-idempotent subscriber post-cutover will double-fire with no warning.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-012/F2 (live `UER:168-172` vs certified `UER:280-294`; EventToMissionBridge idempotent via `mission_id` + ON CONFLICT DO NOTHING; EmbeddingService upserts by event_id).
- **DEPENDENCIES:** db-era-cutover (same cutover hazard list).
- **ACCEPTANCE:** the redelivery semantic is documented in the cutover hazard list; every subscriber declares its idempotency assumption.
- **NEXT FALSIFICATION:** audit the subscriber registry; any subscriber without a stated idempotency assumption fails this.

### db-projection-classification
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** Canonical vs projection classification must be honest. Qdrant and Redis are configured but unreachable from the deployed gateway (wrong network, no published ports), so every "hybrid/semantic search" claim is PG-only keyword search wearing a hybrid label, and the "DERIVED, regenerable" projection claim is false in practice because the EmbeddingService subscription can never connect.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` PERS-001 (gateway on default `bridge` network only; `ping-qdrant:6333` TIMEOUT, `host.docker.internal:6333` socket hang up; Redis 6379 accepts TCP but never answers PING; `ping-qdrant` `(unhealthy)` observed by two lanes; ERA-R wraps embedding init in try/catch → null, so availability is preserved but the projection is silently dead).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** every projection store is classified canonical or derived with a live reachability proof; no "hybrid search" claim stands on a dead Qdrant.
- **NEXT FALSIFICATION:** connect from inside the gateway container to the configured Qdrant/Redis addresses; any failure fails this.

### db-no-direct-canonical-mutation
- **DOMAIN:** DATABASE/MIGRATIONS | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** The standing law says no direct canonical mutation without authority, and the append-only trigger enforces it physically on Oracle. But the record shows two cracks: the certified migration itself was a second writer to `ping_events` (AUTH-008, contradicting C-R3's "zero UPDATEs repo-wide" premise — since fixed by removing the backfill UPDATE), and `canonical_events` is mutable with the EventBridge as an additional unnamed writer (AUTH-004).
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-008 (worktree `ping-runtime/events/unified_event_runtime.js:92-99` ran `UPDATE ping_events`; N1 writer census: sole non-test INSERT is `UER.emit`, sole UPDATE the backfill, zero DELETEs) and AUTH-004 (`UPDATE canonical_events` at `canonical_event_envelope.js:308,324`; `event_bridge.js:300` an unnamed second mutator).
- **DEPENDENCIES:** db-trigger-owner.
- **ACCEPTANCE:** the writer census is re-run per release (sole INSERT `UER.emit`, zero UPDATE/DELETE on `ping_events` outside the trigger-compatible migration); every `canonical_events` mutator is named in the authority record.
- **NEXT FALSIFICATION:** re-run the writer census; any unnamed writer fails this.

---

## DOMAIN: RELEASE/CERTIFICATION

### rel-one-sequence
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** IN_PROGRESS | **PRIORITY:** 1
- **WHY:** Nolan's doctrine (2026-09-19): "A release is not the set of files changed since the previous release. A release is a complete, certified closure of the runtime represented by a specific source revision." There is exactly one release-certification sequence; gates are not added, reordered, or skipped per-deploy. Timestamp is provenance only, never release identity. The doctrine exists and is machine-executable; enforcement is what needs proving.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` (gates 0-7 pre-promotion via `release-certify.js` against the exact distribution snapshot; gates 8-17 deployment phase; "Any FAIL blocks promotion. Any BLOCKED blocks promotion pending the named dependency").
- **DEPENDENCIES:** none (root doctrine).
- **ACCEPTANCE:** every promotion runs the full sequence in fixed order with no skipped gates; the two artifacts (pre-promotion + deployment phase, same schema) exist per release.
- **NEXT FALSIFICATION:** promote any candidate with a skipped gate; the promotion record itself fails this.

### rel-smoke-vs-db
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** The smoke test certifies module composition, not gateway boot. Its declared safe boundary ("composition wired; no listen(), no DB connect") structurally excludes every Postgres-gated path, including the startup migration that killed the deploy. This is the exact mechanism by which a broken image earned SMOKE PASS yet could never reach READY. SMOKE != DB compatibility.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-005 (`tools/distribution/gateway-smoke.js` header; `tools/distribution/README.md:44-56`; the skipped spine `gateway/bootstrap/composition/core_event_spine.js:31-70` includes `UnifiedEventRuntime.initialize()`, which runs the migration; "checked whether the smoke or any gate executes the migration SQL against a trigger-enforcing fixture; no such fixture or step exists").
- **DEPENDENCIES:** db-migration-trigger-gate (the fixture that closes this).
- **ACCEPTANCE:** a pre-promotion step runs the UER `initialize()` migration block against a scratch Postgres carrying Oracle's append-only trigger definition, and records PASS/FAIL.
- **NEXT FALSIFICATION:** run the current smoke against a fixture image carrying the old backfill UPDATE; SMOKE PASS fails this.

### rel-certified-vs-deployable
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** OPEN | **PRIORITY:** 1
- **WHY:** "CERTIFIED 189/189" covers module membership only: the closure certifier is a static require/import membership checker whose failure modes are `REQUIRED_NOT_DISTRIBUTED`, `RUNTIME_DEPENDS_ON_NONDISTRIBUTED`, `UNKNOWN_CLASSIFICATION`. It never opens a DB connection, and the doctrine's "migration/schema compatibility" field is populated by nothing. CERTIFIED module membership != deployability. The premature 84486f056 certification (14 open gaps, declared ORACLE_RUNTIME_PROVEN anyway) is the epistemic twin of this defect.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` OBS-006 (report shape `:283-296` has no migration/schema/trigger/environment/DB-policy field; "no release-certification artifact was ever assembled for the deploy; 'CERTIFIED' and 'SMOKE PASS' exist only as stdout"); `~/workspace/FAILURE_LEDGER.md` lines 1205-1216 (FL-20260920-023: premature certification, 14 gaps enumerated, document corrected in place to PREMATURE/SUPERSEDED, "Do not delete this entry or the corrected document").
- **DEPENDENCIES:** db-migration-trigger-gate (populates the missing field), rel-one-sequence.
- **ACCEPTANCE:** no "CERTIFIED" claim is made without the migration/schema-compatibility field populated by the fixture gate; certification artifacts exist as files, not stdout.
- **NEXT FALSIFICATION:** inspect any certification artifact for the migration-compatibility field; absent or unpopulated fails this.

### rel-immutable-identity
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** Every release needs a new immutable identity; a certified candidate image is never mutated or reused for another build. This is what makes rollback anchors trustworthy.
- **EVIDENCE:** memory `memory://md:memory/2026-09-21.md:1392` (Nolan: "Oracle is a PROVEN environment. Every future Oracle mutation needs a reason... the proven baseline stays frozen, candidate-84486f056 is not reused for another build, the image is not mutated, and future releases get new immutable identities"); `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("ping-gateway:candidate-84486f056: the accepted proven baseline image. Explicit do-not-touch"; "The 84486f056 image is preserved in docker (rollback intact)"; `oracle-gateway:rollback-20260919`, `:certified-20260919` retained per deliberate retention policy).
- **DEPENDENCIES:** none (standing law).
- **ACCEPTANCE:** every release carries a new immutable image identity; no tag is ever re-pointed to different bytes; protected images remain untouched.
- **NEXT FALSIFICATION:** `docker images --digests`; any reused tag with changed digest fails this.

### rel-rollback-before-swap
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** The rollback image must be retagged and verified healthy BEFORE the candidate swap — rollback is proven before it is needed, not after. The digest is recorded in the pre-promotion artifact's deployment phase before the swap.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` (gate 17; "The rollback image digest is recorded in the pre-promotion artifact's deploymentPhase BEFORE the swap (gate 17 ordering)"); `~/workspace/FAILURE_LEDGER.md` lines 427-428 (FL-20260919-ORACLE-006: rollback via `sudo docker tag oracle-gateway:certified-20260919 oracle-gateway:latest`, verified image 8400deecf2a9 running healthy, /health 200, pre-deploy event intact).
- **DEPENDENCIES:** rel-one-sequence.
- **ACCEPTANCE:** every promotion records the rollback digest before the swap and proves the rollback image healthy first.
- **NEXT FALSIFICATION:** inspect any promotion record; swap preceding rollback proof fails this.

### rel-artifact-lifecycle
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** DONE_VERIFIED | **PRIORITY:** 2
- **WHY:** Two artifacts (pre-promotion + deployment phase), same schema, referencing each other by manifest digest. Both immutable once written; a correction is a new artifact, never an edit. This is what stopped the premature-certification failure mode from being silently papered over.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` ("release-certify.js emits release-certification.json (schema v1: release-artifact.schema.json)... Both artifacts are immutable once written; a correction is a new artifact, never an edit"); schema at `~/workspace/laneC/release-artifact.schema.json`; precedent: FL-20260920-023's document was corrected in place with a strikethrough header and preserved, not deleted.
- **DEPENDENCIES:** rel-one-sequence.
- **ACCEPTANCE:** schema v1 exists and both artifacts are emitted per release; no certification document is ever edited after issue.
- **NEXT FALSIFICATION:** diff any two versions of a certification document; an in-place edit fails this.

### rel-canonical-spine
- **DOMAIN:** RELEASE/CERTIFICATION | **STATUS:** IN_PROGRESS | **PRIORITY:** 1
- **WHY:** Deployment gates 11-16 are the certification target Nolan authorized for ping-core-01: request → authenticated identity → canonical event → durable PostgreSQL → mission → scheduler → worker → result/evidence → canonical event → RESTART → same event/mission/evidence recoverable → processing resumes. The P1 side-port battery proved this for 3c5d280dd on :8081, but the live :8080 promotion that followed has no such record.
- **EVIDENCE:** `~/workspace/laneC/RELEASE-SEQUENCE.md` (gates 11-16); `~/workspace/FAILURE_LEDGER.md` lines ~1830+ (FL-20260921-P1: candidate `ping-gateway:candidate-3c5d280dd` `sha256:4aa9d7f6...` passed the full P1 battery on 127.0.0.1:8081: /health 200, identity reads 200, valid signed event 200, invalid signature 400 INVALID_SIGNATURE, BFF knowledge envelope 200, projection digest deterministic across two governed rebuilds; "Caveats: three clearly-labeled synthetic P1-proof journal events plus projections now exist on the live DB"); memory `memory://md:memory/2026-09-21.md:1392` (actual-evidence certification: "SOURCE GREEN IS NOT DISTRIBUTION GREEN IS NOT RUNTIME GREEN IS NOT RESTART GREEN").
- **DEPENDENCIES:** dep-provenance-gap (the unrecorded promotion).
- **ACCEPTANCE:** gates 11-16 are proven and recorded for whatever image is live on :8080, on the live database, not only on a side port.
- **NEXT FALSIFICATION:** re-run the P1 battery against :8080; any gate failure fails this.

---

## DOMAIN: CAPABILITIES

### cap-one-authority
- **DOMAIN:** CAPABILITIES | **STATUS:** DONE_VERIFIED | **PRIORITY:** 1
- **WHY:** Nolan's constitutional rule: anything whose disagreement could cause PING to make the wrong decision must have one provable authority. The Capability registry is one of the twelve named areas. There must never be a CapabilityAuthority #2.
- **EVIDENCE:** memory `memory://md:memory/2026-09-13.md:645` (constitutional authority rule; twelve areas: Identity, Namespace, Canonical bytes, Hash, Event creation, Event schema, Evidence, Verification/promotion, Capability registry, Authorization, Execution/run state, Canonical state/projection semantics; the minimum trace chain: WHO → WHAT → NAMESPACE → CAPABILITY → AUTHORIZED BY → RUN → CANONICAL RESULT → EVIDENCE → PROMOTED BY); memory `memory://md:memory/2026-09-16.md:1068` ("a real fail-closed implementation is live/preserved, though absent from the current branch tree"); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` NEGATIVE FINDINGS ("Event governance, capability authority, orchestration writes all fail closed (audited, sound)").
- **DEPENDENCIES:** none (constitutional).
- **ACCEPTANCE:** exactly one capability authority exists; any new capability check routes through it; the WHO→…→PROMOTED BY chain is attestable.
- **NEXT FALSIFICATION:** census all capability-check call sites; any check that bypasses the single authority fails this.

### cap-harvest-inventory
- **DOMAIN:** CAPABILITIES | **STATUS:** HARVEST | **PRIORITY:** 2
- **WHY:** The task brief requires harvesting existing PING capability machinery (actor, resource/object, action, constraints, expiration, delegation, provider capability, owner capability, approval requirement, deny semantics, audit evidence) — not building a second authority. The machinery exists across the Pig-era hardening artifacts and the certified worktree.
- **EVIDENCE:** `~/workspace/gateway-hardening/orig-capability_registry.js` (312 lines) + `~/workspace/gateway-hardening/orig-exterior_auth_middleware.js` (251 lines) + `new-engine.js` wiring `CapabilityRegistry` into the execution engine (2026-09-13 phase4-eventauth8 Pig hardening); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-003 (certified worktree closes the forgeable `_skipGovernance` bypass: UER requires the capability object, `UER:160-166`); audit NEGATIVE FINDINGS (capability authority fail-closed, audited sound); memory `memory://md:memory/2026-09-19.md:1104` (provider-specific actions behind separate capabilities, e.g. Follow/Like as PING-native semantics with counters as rebuildable projections).
- **DEPENDENCIES:** cap-one-authority.
- **ACCEPTANCE:** a single inventory document maps the existing machinery to the brief's checklist (actor, resource/object, action, constraints, expiration, delegation, provider/owner capability, approval requirement, deny semantics, audit evidence) with file:line citations, and names what is missing rather than building it.
- **NEXT FALSIFICATION:** for each checklist term, produce the file:line; any term with no implementation and no "missing" record fails this.

### cap-delegation-model
- **DOMAIN:** CAPABILITIES | **STATUS:** HARVEST | **PRIORITY:** 2
- **WHY:** The semantics around the authority need harvesting too: deny semantics (event_governance fails closed — audited), approval requirement (the approval→KnowledgePromoter→ranking path is wired but has received zero approvals: LOOP-002), owner capability (tenant owner as default human decision authority, CG-001, already recorded), provider capability (the provider-binding decision that unlocks EXP-001/002/003/004/007 sits with no named decider), expiration (credentials never expire — SEC-007).
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` (LOOP-002: "All 68 knowledge nodes remain `candidate`"; expansion section: "the provider-binding decision that would unlock five expansion opportunities sits with no named decider"; "empirically investigable first, then a genuine decision"; P5 cross-domain pattern: "Enforcement without owners").
- **DEPENDENCIES:** cap-harvest-inventory.
- **ACCEPTANCE:** deny, approval, owner, provider, expiration, and delegation semantics are each documented as implemented / missing / decision-needed, with the provider-binding decision empirically investigated before it is asked.
- **NEXT FALSIFICATION:** the audit's experiment 10 (Quo vs Twilio/SMTP capability investigation); asking for the decision before the evidence fails this.

### cap-viewer-can
- **DOMAIN:** CAPABILITIES | **STATUS:** HARVEST | **PRIORITY:** 2
- **WHY:** FYD Social's authorization shape is already decided: components use `can(viewer, ...)` — never `if(demoMode)`. DEMO OWNER MODE produces the same ViewerContext/capability shape as real auth. This is the capability pattern the product harvests from the platform.
- **EVIDENCE:** memory `memory://md:memory/2026-09-21.md:1404` (Website Builder Authority Decisions 2026-09-21: "Owner: explicit DEMO OWNER MODE marked DEMO_AUTH NOT_PRODUCTION_AUTH producing the same ViewerContext/capability shape as real auth; components use can(viewer, ...) never if(demoMode)").
- **DEPENDENCIES:** cap-one-authority.
- **ACCEPTANCE:** every FYD component authorizes through `can(viewer, ...)`; no demo-mode conditional exists anywhere in a component.
- **NEXT FALSIFICATION:** grep FYD components for `demoMode` conditionals; any hit fails this.

### cap-eventbridge-bypass-closed
- **DOMAIN:** CAPABILITIES | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** EventBridge is a live, armed governance bypass in the running era: it re-emits `canonical_events` rows into UER with `_skipGovernance: true` and no namespace, so `tenant::hpp` rows land in `ping_events` as `core::system`, skipping event_registry validation and tenant namespace enforcement. The certified worktree closes the forgeable bypass (requires the capability object). The running system still has it.
- **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` AUTH-003 (live `gateway/bootstrap/gateway_runtime.js:542-550` instantiates EventBridge unconditionally, 5s poll; `ping-runtime/events/event_bridge.js:278-294`; certified worktree `UER:160-166` requires the capability object, ignoring bare `_skipGovernance`; era census: zero bridged rows as of the 2026-09-18 freeze — armed but idle).
- **DEPENDENCIES:** cap-one-authority.
- **ACCEPTANCE:** the bypass is closed on every running gateway (capability object required), or the bridge is removed; the firing check is recorded.
- **NEXT FALSIFICATION:** the audit's experiment 9: SELECT-only count of `ping_events` rows with `source='canonical_events'` since the 09-18 freeze; any row proves the armed bypass has fired.

---

## DOMAIN: ORACLE / DEPLOYMENT

### dep-provenance-gap
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** DECISION | **PRIORITY:** 1
- **WHY:** On 2026-09-21 ~12:05 UTC the live gateway moved from the accepted baseline image (candidate-84486f056) to candidate-3c5d280dd with no promotion record, and a second identical candidate container was left running on :8081 against the same database. The deployment registry in Postgres is empty (0 rows). The build/test provenance of 3c5d280dd exists (FL-20260921-P1: fix commit `3c5d280dd3735ceb2deb4433384902d07552d372` added the additive `tsc` step; P1 battery passed on :8081), but the promotion to :8080 is undocumented. Record honestly, reconcile single-writer.
- **EVIDENCE:** `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` (baseline vs live reality section; open question quoted verbatim); `~/workspace/FAILURE_LEDGER.md` FL-20260921-P1 (candidate build/test provenance); memory `memory://md:memory/2026-09-21.md:1392` (provenance manifest mandatory; Oracle ladder extended through BUSINESS_PATH_PROVEN).
- **DEPENDENCIES:** ten-never-two-writers (same Nolan decision).
- **ACCEPTANCE:** Nolan decides: 3c5d280dd accepted as the new live baseline (provenance record updated) or not; :8081 stopped to restore single-writer; the decision and its evidence are recorded in the deployment registry (which is currently empty and must start being written).
- **NEXT FALSIFICATION:** query `deployment_registry`; still 0 rows after the decision fails this.

### dep-capacity
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** Disk was the recurring critical resource (80% on 2026-09-22, 83% on 09-20, and the 09-19 Pig C: crisis). The 2026-09-22 reclamation (80% → 56%, ~11 GB) bought headroom, but several items were deliberately left for later calls.
- **EVIDENCE:** `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` (reclamation table: /tmp image tarballs ~1.73 GB, journal vacuum ~3.2 GB, btmp 437 MB, builder prune 2.42 GB, dangling images 443 MB, postgres:15-alpine 408 MB, oci-cli 1.33 GB; deliberately NOT touched: ollama/ollama:latest 6.99 GB — gateway code requires `OllamaProvider` as default AI provider and `OLLAMA_BASE_URL=http://host.docker.internal:11434` is set, below the confidence bar for removal; candidate-84486f056 do-not-touch; superseded gateway images ~8 GB — rebuildability unverified, flagged for a later call; `/opt/ping/releases` 2.7 G + snapshot tar 1.1 G legitimate backups; `p18-oracle-staging` 218 M Sep-19 leftover).
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the flagged follow-ups each get a decision: ollama retention (prove the runtime dependency or remove), the ~8 GB superseded images (verify rebuildability, then prune), `p18-oracle-staging` (remove or justify).
- **NEXT FALSIFICATION:** disk crosses 80% again with no standing reclamation runbook; that fails this.

### dep-runtime-distribution-v1
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** IN_PROGRESS | **PRIORITY:** 2
- **WHY:** The Runtime Distribution v1 milestone is gated by its own sequencing: no Git repos on Oracle, no `runtime-manifest.json`. The 2026-09-22 keep-off inventory (read-only) confirmed compliance; no stripping was performed, correctly per the hard gate.
- **EVIDENCE:** `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("Keep-off inventory (read-only) completed: no git repos on Oracle; source trees total ~10M; audit artifacts in /opt/ping/releases (2.7G); p18-oracle-staging (218M, Sep-19 leftover); no runtime-manifest.json exists yet. Milestone remains GATED per its own sequencing").
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the milestone's sequencing completes (forensics → reachability/persistence/closure verification) and `runtime-manifest.json` exists, or the gate stays explicitly recorded as GATED.
- **NEXT FALSIFICATION:** a git repo appears on Oracle, or stripping is performed before the gate clears; either fails this.

### dep-side-by-side
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** DONE_VERIFIED | **PRIORITY:** 2
- **WHY:** Side-by-side, minimum-change deployment is the proven discipline: the 3c5d280dd candidate was built and battery-tested on the side port (127.0.0.1:8081) with the live :8080 gateway untouched and protected images untouched. This is the procedure to keep.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-P1 ("On Oracle at 127.0.0.1:8081... Live 8080 gateway untouched (/health 200 after the run). Protected images (oracle-gateway:certified-20260919, :latest, :rollback-20260919, 8400deecf2a9) untouched"; "Blast radius: none").
- **DEPENDENCIES:** rel-one-sequence (gates 8-17 are this procedure formalized).
- **ACCEPTANCE:** every candidate is proven on a side port with the live gateway and protected images untouched before any swap is considered.
- **NEXT FALSIFICATION:** any candidate swap without a prior side-port battery; that fails this.

### dep-docker-config-persistence
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** The Pig Docker credential-manager defect was worked around with an isolated Docker config at `/tmp/docker-isolated/config.json` (empty `{}`, anonymous public pulls) — and Nolan ordered that mechanism preserved. But `/tmp` is wiped without warning in this environment. A release-path mechanism that lives in `/tmp` is one wipe away from rediscovery.
- **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` lines 1122-1126, 1142 (FL-20260920-014 UPDATE: "Created isolated Docker config at /tmp/docker-isolated/config.json with empty {} (no credential helpers)... Workaround is sustainable: isolated config for public pulls"); memory `memory://md:memory/2026-09-21.md:1392` ("Nolan ordered preserving that mechanism and encoding the smallest sustainable release path"); `~/AGENTS.md` ("/tmp is wiped without warning (2026-09-22)... Irreplaceable work must live under ~/workspace/, never /tmp").
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the isolated Docker config lives at a persistent path (e.g. under `~/workspace/`), is documented as part of the release path, and a rebuild works from that path alone.
- **NEXT FALSIFICATION:** wipe `/tmp` (or simulate) and attempt the release-path pull; failure fails this.

### dep-unidentified-stop
- **DOMAIN:** ORACLE / DEPLOYMENT | **STATUS:** OPEN | **PRIORITY:** 2
- **WHY:** On 2026-09-20T01:03:15Z, ping-gateway AND ping-postgres simultaneously stopped and detached from `oracle_ping_internal` by an unknown actor (docker events showed ephemeral containers + kill/stop API sequence; no compose/cron/SSH source found; possibly a delayed effect of an earlier killed compose call — unproven). An unexplained dual-container stop is a standing P0-class mystery on the production host.
- **EVIDENCE:** memory `memory://md:memory/2026-09-19.md:1620` ("UNIDENTIFIED STOP INCIDENT 2026-09-20T01:03:15Z... Recovered."); `~/workspace/FAILURE_LEDGER.md` lines 439-440 (FL-20260919-ORACLE-006/007 rules: "treat any future unexplained dual-container stop as P0 and check `docker events` immediately").
- **DEPENDENCIES:** none.
- **ACCEPTANCE:** the actor is identified, or continuous `docker events` capture is in place so the next occurrence is attributable.
- **NEXT FALSIFICATION:** another unexplained dual-container stop with no captured actor fails this.

---

## SOURCES REVIEWED
1. `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` (full)
2. `~/workspace/ORACLE_CRITICAL_PATH_2026-09-20.md` (full)
3. `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` (full, 322 lines)
4. `~/workspace/health-truth-audit-2026-09-20.md` (full)
5. `~/workspace/FAILURE_LEDGER.md` (targeted: FL-20260919-ORACLE-003/004/005/006, FL-20260919-AUDIT-001, FL-20260919-P08-LANE3-001, FL-20260920-014/017/018/019/022/023, FL-20260921-001/002/003/P1; rotation record lines 1755-1799)
6. `~/workspace/gateway-rotation/rotate-gateway-keys.ps1` (header + rotation/rollback design)
7. `~/workspace/gateway-hardening/` (smoke-test.ps1, followup.ps1, probe2.js headers; orig-capability_registry.js / orig-exterior_auth_middleware.js / new-engine.js capability wiring)
8. `~/workspace/laneC/` (RELEASE-SEQUENCE.md, MIGRATION-TRIGGER-FIXTURE-INTERFACE.md, security-negatives.js header/design)
9. `~/workspace/tools/redact-secrets.py` + `~/workspace/tools/test-redact-secrets.py` (headers + case list)
10. `~/workspace/AGENTS.md` (Oracle SSH rule; /tmp wipe rule)
11. Memory: `muse.memory_search` ×2 (7 queries total: oracle provenance gap, secret hygiene/password incident, tenancy cross-tenant, capability authority/delegation, degraded-mode key leak) + `muse.memory_get` on `memory/2026-09-21.md#L1392` (60 lines). Key hits: MEMORY.md#L162, memory/2026-09-21.md#L311/#L1392/#L1404, memory/2026-09-20.md#L371/#L1020/#L1104, memory/2026-09-19.md#L97/#L1001/#L1068/#L1620/#L1688, memory/2026-09-16.md#L1068, memory/2026-09-17.md#L423, memory/2026-09-14.md#L299/#L433, memory/2026-09-13.md#L645.

## SOURCES UNAVAILABLE
- `/home/nolan/projects/ping` — deliberately not touched per task hard rule (so the git `-S` secret-history check from the rotation record remains unrun; also blocks verifying source-tree claims firsthand).
- `~/workspace/BACKLOG_NOLAN.md` — strictly off-limits per task.
- Live Oracle/Pig systems — no live access from this sandbox; all runtime claims are cited from the dated records above, era-qualified where the audit requires it (most security/tenancy findings are ERA-R/Pig-era; the 09-22 Oracle status shows both Oracle gateways now run candidate-3c5d280dd, which post-dates the audit's own era discipline). Per Nolan's evidence-precedence rule (live DB reality > current branch source > old audit docs), every OPEN security/tenancy item's NEXT FALSIFICATION re-probes the live surface rather than trusting the 09-19 record.

## CONTRADICTIONS FOUND
1. **FL-20260920-022 status.** The ledger (lines 1196, 1755-1799) + `MEMORY.md#L162` + `memory/2026-09-21.md#L1392` record a full-incident rotation on 2026-09-21 with proofs (old credential rejected over the real network path, four historical credentials dead, exposure sweep clean). But `memory/2026-09-20.md#L1020` claims the password allegation was unsupported, treats "the entry and rotation request as unverified and requiring correction," and states "No rotation was performed." Timeline: the correction note is dated 09-20, the rotation 09-21 — so the correction may have been superseded by the full incident response (the rotation record itself "corrects the incident's assumption" about which value was live). The two records were never reconciled in one place. **Recommendation:** append a reconciliation note to FL-20260920-022 citing both, so the next reader does not re-litigate it.
2. **3c5d280dd provenance.** The 2026-09-22 Oracle status says "no record in my context of the 3c5d280dd promotion" — but `FL-20260921-P1` documents the candidate's build provenance (commit `3c5d280dd3735ceb2deb4433384902d07552d372`, P1 battery on :8081). What is undocumented is the *promotion to :8080*, not the build. The item dep-provenance-gap is scoped accordingly.
3. **Era qualification.** The big audit's security/tenancy findings describe the Pig-era gateway; the convergence worktree and the now-live 3c5d280dd image may differ. Per the audit's own era discipline and Nolan's evidence-precedence rule (live DB reality > current branch source > old audit docs), every OPEN security/tenancy item's NEXT FALSIFICATION re-probes the live surface rather than trusting the 09-19 record.
