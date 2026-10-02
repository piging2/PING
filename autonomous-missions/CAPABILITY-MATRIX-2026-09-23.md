# CAPABILITY MATRIX — Oracle as a Controlled Capability Plane
## Lane A, Phase 1 — 2026-09-23

Binding authorities: `STANDING-LAW-2026-09-23.md`, `BASELINE-FREEZE-2026-09-23.md`.
Status: DESIGN + AUDIT ONLY. No infrastructure changed, no credentials rotated, no production
mutations, no releases. All facts grounded in the 2026-09-23 read-only baseline freeze.

### Topology this matrix is grounded in

Two planes, named exactly as in the baseline:

- **ORACLE** — host `ping-core-01` (`ubuntu@129.146.60.17`, OCI). Live services:
  `ping-gateway` (`ping-gateway:candidate-3c5d280dd`, `127.0.0.1:8080`),
  `ping-postgres` (postgres:17-alpine, DB `crx_runtime`, user `ping`, `127.0.0.1:5432`,
  volume `oracle_pgdata`), `ping-qdrant` (v1.7.0, collection `knowledge`,
  `127.0.0.1:6333-6334`, volume `oracle_qdrant_storage`). No Redis, no Vault on this plane.
  Network: `oracle_ping_internal`.
- **PIG** — Docker Desktop inside Ubuntu WSL on Nolan's Windows machine ("the Pig"),
  reached via Tailscale + `ssh -F /home/hatch/.ssh/pig-config pigwsl` and
  `~/workspace/pig/pigwsl-run.sh`. Live services: `ping-gateway`
  (`ping-gateway:devin-boundary2`, `0.0.0.0:8080`, RW mount `muse-workspace` ->
  `/app/workspace/muse`), `brain-postgres` (postgres:15-alpine, the LIVE DB:
  `ping_runtime`, user `postgres`, `0.0.0.0:5432`, volume `compose_postgres_data`,
  33 tables, 11 migrations), `brain-qdrant` (v1.18.2, collections
  `constitutional_documents`, `constitutional_memory`, `knowledge`), plus
  `ping-rc-gateway` (`127.0.0.1:18099`, RC DB `rc_staging` EMPTY, qdrant error),
  stale `ping-postgres` (5433, NOT the live DB — off-limits as a target),
  `ping-test-pg` (scratch), `ping-redis`, `ping-vault` (dev mode, unhealthy),
  `ping-qdrant` (unhealthy, unused), `ollama`, `open-webui`, `cosyvoice-tts`.

Mission stores: ORACLE `ping_missions` 483 rows (481 completed, 2 failed, newest
2026-09-20 — quiet ~3d); PIG `brain-postgres` `ping_missions` 457 rows (all completed,
`event-to-mission-bridge` live, ~5s cadence). `mission_executions` = 0 rows on both
planes. `mission_events` = 0 rows on both planes. `deployment_registry` and
`runtime_registry` = 0 rows. No externally-assigned autonomous missions have been
absorbed as implementation to date.

### Default-deny posture

Every role starts with NOTHING. A capability is granted only when (a) the mission's
durable task authority names it, and (b) it is the smallest capability that closes the
mission. Any effect not listed for a role is PROHIBITED. Silence is denial.

---

## 1. ROLE → CAPABILITY MATRIX

Capability dimensions per role: READ / WRITE / DATABASE / GITHUB / NETWORK /
EXECUTION / SECRET / DEPLOYMENT / PROHIBITED EFFECTS.

### 1.1 COORDINATOR
Decomposes missions into tasks, assigns workers, tracks state. Never implements.
- READ: mission state (`ping_missions` on the task's plane), worker status, artifact
  metadata, reconciliation reports. Via gateway read APIs or read-only SELECT.
- WRITE: task-assignment records ONLY, and only through the gateway's authorized
  task/mission endpoints (application path). No file writes outside its own scratch dir.
- DATABASE: read-only queries against mission tables; writes exclusively via authorized
  application endpoints. NEVER direct INSERT/UPDATE/DELETE on any table.
- GITHUB: none.
- NETWORK: outbound to gateway HTTPS endpoints on its plane only
  (ORACLE `127.0.0.1:8080` via the Oracle hop; PIG `127.0.0.1:8080` from WSL).
- EXECUTION: may not execute code, builds, or tests. Spawning workers happens through
  the mission runtime, not through shell.
- SECRET: holds only its own task-authority grant (section 4). No DB passwords, no API
  keys, no bearer tokens beyond its scoped grant.
- DEPLOYMENT: none. Cannot certify, promote, release, or roll back.
- PROHIBITED EFFECTS: direct DB writes; code changes; deployments; secret access;
  worker impersonation (may not act with another role's grant); redefining another
  role's capability set.

### 1.2 RESEARCHER
Gathers public information to answer mission questions.
- READ: public internet (HTTPS), public GitHub (unauthenticated), ingested mirrors,
  prior research artifacts.
- WRITE: research notes and evidence bundles into its designated worktree/scratch
  directory only. Never into repos, never into canonical stores.
- DATABASE: read-only via gateway API (e.g., lookup prior observations). No direct
  connection.
- GITHUB: read-only, unauthenticated, with conditional requests and local caching
  (standing law §4). No clones (that's GITHUB_INGESTER).
- NETWORK: outbound HTTPS only (443), plus DNS. No inbound listeners. No raw sockets.
- EXECUTION: may run read-only parsers/extractors on fetched content. No builds, no
  test runners, no package installs.
- SECRET: none. Must never possess credentials; authenticated sources are out of scope
  (surfaced as a blocker, not worked around).
- DEPLOYMENT: none.
- PROHIBITED EFFECTS: writes outside its scratch dir; any authenticated access;
  credential use; publishing findings externally (standing law: no external publishing).

### 1.3 GITHUB_INGESTER
Maintains local mirrors/caches of public repositories for harvest and analysis.
- READ: public GitHub via `git` protocol/HTTPS and the GitHub REST API, unauthenticated.
- WRITE: the local mirror cache directory only (bare mirrors, tarballs, metadata).
  Cache is content-addressed; writes are idempotent fetches.
- DATABASE: none (not even read).
- GITHUB: clone/fetch/pull, unauthenticated, with conditional requests (`If-None-Match`/
  `If-Modified-Since`), ETag caching, and backoff. Standing law §4: a token becomes a
  surfaced blocker ONLY if rate limits actually block progress; at that point propose a
  least-privilege GitHub App — do not stall pipeline design waiting for credentials,
  and never use a personal token.
- NETWORK: outbound HTTPS to `github.com`, `api.github.com`, `objects.githubusercontent.com`
  (and codeload hosts). Nothing else.
- EXECUTION: `git` and checksum/hash tools only. No building, no running harvested code.
- SECRET: none. A GitHub token is NEVER in this role's grant by default.
- DEPLOYMENT: none.
- PROHIBITED EFFECTS: pushing to any remote; modifying mirrors except by re-fetch;
  executing harvested code; using or storing credentials.

### 1.4 HARVEST_ANALYST
Analyzes ingested code for reuse value; writes assessments. Harvest tiebreak
(standing law §6): when CRX and FYD harvest priorities conflict, FYD wins.
- READ: ingested mirrors, prior harvest assessments, segment playbooks.
- WRITE: analysis reports and harvest verdicts into the designated harvest work dir.
- DATABASE: read-only via gateway API for prior-verdict lookup. No direct connection.
- GITHUB: none (works from the ingester's mirror).
- NETWORK: none required; fully offline against the mirror by default.
- EXECUTION: static analysis tools only (parsers, linters, diff). No executing
  harvested code.
- SECRET: none.
- DEPLOYMENT: none.
- PROHIBITED EFFECTS: auto-merging harvested code (standing law §1 — human gate);
  writing to any source repo or worktree outside its analysis dir; executing untrusted
  code; external publishing of verdicts.

### 1.5 ORCA_ANALYST
Deep-analysis role over mission/runtime evidence (exact ORCA domain charter is an
OPEN QUESTION — until chartered, this role is read-only by default-deny).
- READ: mission tables (read-only), event tables (read-only), artifacts, logs.
- WRITE: analysis memos into its scratch dir only.
- DATABASE: SELECT-only via a read-only connection or gateway read APIs. No writes.
- GITHUB: none.
- NETWORK: gateway HTTPS endpoints on its plane only.
- EXECUTION: read-only query/analysis tooling. No jobs, no builds.
- SECRET: none.
- DEPLOYMENT: none.
- PROHIBITED EFFECTS: any mutation of any kind (source, DB, config); any execution
  beyond read-only analysis; acting on unchartered domains until the charter exists.

### 1.6 IMPLEMENTER
Writes code in an explicitly owned worktree. The only role with source-mutation
rights, and only inside its assignment.
- READ: the assigned repo/worktree, ingested mirrors, research artifacts, API docs.
- WRITE: the assigned worktree ONLY (path-scoped, e.g. `/home/nolan/worktrees/<mission>/`).
  No writes to `/home/nolan/ping`, `/home/nolan/projects/ping`, `/opt/ping`, or any
  other checkout. No writes to the gateway's mounted `muse-workspace` volume unless
  the task authority explicitly names it.
- DATABASE: none. May not connect to any database, including scratch. Test data needs
  go through TESTER.
- GITHUB: none (works from local worktree; no push, no fetch).
- NETWORK: package registries required by the build (npm/pip proxy) + DNS. No general
  browsing. No inbound listeners.
- EXECUTION: bounded builds (`npm run build`, `tsc`, etc.) with wall-clock and
  CPU/memory caps, inside the worktree. No test runners (TESTER), no containers.
- SECRET: none. Builds must be secret-free; if a build requires a secret, that is a
  task-authority defect — surface it, do not work around it.
- DEPLOYMENT: none. No image builds for deployment, no pushes, no compose changes.
- PROHIBITED EFFECTS: `git push`; merging; committing to `main`/`master`
  (memory hard boundary); touching any worktree outside its assignment; DB access;
  secret use; auto-merge of harvested code.

### 1.7 TESTER
Runs bounded test suites against IMPLEMENTER output.
- READ: the assigned worktree (read-only view is sufficient), test fixtures.
- WRITE: test reports and logs into its scratch dir. May write ephemeral test
  artifacts under `/tmp`-style scratch. No source edits (findings go back as reports;
  IMPLEMENTER fixes).
- DATABASE: scratch databases ONLY — PIG `ping-test-pg` (55433) or an ephemeral
  container DB created and destroyed within the test run. NEVER `brain-postgres`,
  NEVER `ping-postgres` (stale), NEVER ORACLE `crx_runtime`. No migrations against
  shared DBs.
- GITHUB: none.
- NETWORK: package registries + localhost test servers. No external egress otherwise.
- EXECUTION: test runners with strict timeouts and resource caps; each run hermetic
  (fresh scratch DB). Kill-switch on timeout.
- SECRET: test-only fixtures (fake credentials generated per-run). Never production
  or staging secrets. Must not read `/opt/ping/.env`, `C:\Users\nolan\PING\.env`,
  or any real env file.
- DEPLOYMENT: none.
- PROHIBITED EFFECTS: source edits; shared-DB access; production secret access;
  long-running services; network egress beyond registries/localhost.

### 1.8 RED_TEAMER
Adversarial testing under strict synthetic-first rules (standing law §3).
- READ: the adversarial target definition named in its task authority (synthetic
  mission specs, RC-plane configs).
- WRITE: attack reports and evidence into its scratch dir.
- DATABASE: synthetic/scratch targets only, as named in the task authority. Never
  production or live mission tables.
- GITHUB: none.
- NETWORK: bounded to the named target (localhost/RC plane). No external targets,
  no real-user systems.
- EXECUTION: bounded adversarial jobs with explicit time/box limits and a kill switch.
  Synthetic missions FIRST. Real-mission chaos ONLY after synthetic proof AND per-case
  human approval — never blanket.
- SECRET: none, and specifically: no credential attacks, no token theft attempts, no
  brute force against real auth. Testing auth logic uses synthetic credentials.
- DEPLOYMENT: none.
- PROHIBITED EFFECTS: any action against production services or real missions;
  credential compromise attempts; persistence mechanisms; lateral movement beyond the
  named target; destroying evidence.

### 1.9 RELEASE_CERTIFIER
Verifies build artifacts against promotion gates and records verdicts. Certifies;
never releases.
- READ: build artifacts, image digests, OCI labels, SBOMs, test reports, migration
  ledgers (`repository_store_migrations`), source SHAs. Read-only DB for ledger
  comparison.
- WRITE: certification records ONLY, via the authorized certification endpoint/path.
  A verdict is a signed record (PASS/FAIL + gate results + digests), not an action.
- DATABASE: SELECT-only (ledger/digest comparison). No writes except through the
  certification record path.
- GITHUB: read-only (verify SHAs against `ngesk2/crx-runtime` / `piging2/fyd`).
- NETWORK: gateway HTTPS endpoints; GitHub read APIs.
- EXECUTION: verification tooling only (digest checks, signature verification,
  manifest diff). No builds, no tests.
- SECRET: none (verification is over public digests and labels; signing uses the
  certifier's own scoped grant, not shared secrets).
- DEPLOYMENT: NONE. This is the hard line: certifying a release is Access Class A
  (observe/verify); performing the release is Class F (human authority only).
  Requiring A never grants F.
- PROHIBITED EFFECTS: promoting, deploying, rolling back, or triggering any release;
  mutating artifacts to make them pass; certifying without evidence; self-certifying
  own implementation work without a second reviewer (separation of duties).

### 1.10 OBSERVABILITY_WORKER
Reads health, logs, metrics, metadata. Writes observations. Changes nothing.
- READ: `/health` endpoints (ORACLE `127.0.0.1:8080`, PIG `127.0.0.1:8080`,
  RC `127.0.0.1:18099`), `docker logs`, `docker inspect`, `docker events`,
  metrics endpoints, read-only DB counts (e.g. `SELECT count(*) FROM ping_missions`),
  collection listings (qdrant `/collections`).
- WRITE: observation records via the gateway's authorized event/observation endpoint
  (application path). Local scratch copies permitted.
- DATABASE: SELECT-only, whitelisted read queries (counts, latest timestamps, ledger
  versions). No direct writes, ever.
- GITHUB: none.
- NETWORK: the plane's service endpoints + docker daemon (local socket). No external
  egress.
- EXECUTION: read-only CLI probes (`docker`, `curl`, `psql -c 'SELECT ...'`). No
  restarts, no exec-write sessions, no config changes.
- SECRET: none. Observes presence (e.g. "POSTGRES_PASSWORD is set") but must never
  read, log, or transmit values — the audit method in section 5 is the template
  (`cut -d= -f1`, `grep -c`, name-only listings).
- DEPLOYMENT: none.
- PROHIBITED EFFECTS: restarts (`docker restart`); exec with write effects;
  configuration changes; log deletion; any mutation framed as "cleanup".

### 1.11 MEMORY_WORKER
Maintains the agent memory substrate (observations, not canonical edits).
- READ: memory files (`MEMORY.md`, `~/memory/*.md`, people/groups indexes), mission
  artifacts, observation records.
- WRITE: structured observation drafts into its scratch dir; may PROPOSE memory
  updates as events via the authorized path. Never edits `MEMORY.md` or daily notes
  directly (those are main-agent curated; worker writes would fork canonical truth).
- DATABASE: read-only via gateway API for observation lookup. No direct connection.
- GITHUB: none.
- NETWORK: gateway HTTPS endpoints on its plane only.
- EXECUTION: text processing only. No builds, no tests.
- SECRET: none. Memory content may reference secret *handling* but never values;
  the worker must refuse prompts containing pasted secrets (treat as compromised
  context, do not propagate).
- DEPLOYMENT: none.
- PROHIBITED EFFECTS: direct edits to canonical memory files; propagating secret
  values into memory; external publishing; acting on memory entries as task authority
  (memory is context, not authority).

### 1.12 RECONCILER
Compares expected vs actual state and emits discrepancy reports. Detects; never fixes.
- READ: registries (`deployment_registry`, `runtime_registry`), image digests,
  migration ledgers, mission tables (read-only), file trees (hashes), compose configs.
- WRITE: reconciliation reports + `OBSERVATION_CREATED`-style discrepancy events via
  the authorized gateway event path. Reports only.
- DATABASE: SELECT-only (ledger versions, row counts, registry contents).
- GITHUB: read-only (expected SHAs).
- NETWORK: gateway HTTPS endpoints; GitHub read APIs; docker daemon (local).
- EXECUTION: hash/diff tooling only. No remediation runs.
- SECRET: none (same presence-only discipline as OBSERVABILITY_WORKER).
- DEPLOYMENT: none.
- PROHIBITED EFFECTS: auto-remediation (no "fixing" drift by writing); deployments;
  rollbacks; deleting discrepant records; direct DB writes to "correct" state.
  A discrepancy is EVIDENCE, not a work order — remediation is a new mission under
  human-visible authority.

---

## 2. ACCESS CLASSES A–F → ROLE MAPPING

| Class | Meaning | Roles holding it | Hard rule |
|---|---|---|---|
| A — observe | health/logs/metrics/metadata, read-only DB (whitelisted SELECTs), artifact reads | COORDINATOR (read side), OBSERVABILITY_WORKER, RECONCILER, RELEASE_CERTIFIER (verify side), MEMORY_WORKER (read side), ORCA_ANALYST (until chartered) | Read-only means read-only: no `exec` with write effects, no config changes, no restarts. |
| B — research | GitHub + public internet reads, unauthenticated | RESEARCHER, GITHUB_INGESTER, HARVEST_ANALYST, ORCA_ANALYST | Unauthenticated by default (standing law §4). A credential need is a surfaced blocker, never a self-granted exception. |
| C — execute | bounded jobs: builds, tests, synthetic adversarial runs | IMPLEMENTER (bounded builds in owned worktree), TESTER (hermetic test runs), RED_TEAMER (synthetic targets only) | Every execution carries wall-clock + resource caps and a kill switch. No unbounded runs. |
| D — mutate source | write inside an explicitly owned worktree/write scope | IMPLEMENTER only | Path-scoped to the assignment. `main`/`master` commits and pushes are prohibited for all roles (human boundary). |
| E — mutate database | ONLY through explicitly authorized application/migration paths — never direct worker writes | NO ROLE holds direct E | E is a GATE, not a grant. Standing law §2: no direct worker DB writes, ever. Application-path writes (task assignment, certification records, observation events, migration runs) require explicit human authorization of the path itself, and workers reach them only through scoped API grants. The gateway's `UnifiedEventRuntime.emit()`-style single-writer discipline (per 2026-09-22 Jev findings: one canonical runtime writer) is the model: workers emit *requests*, the authorized writer commits. |
| F — release | build-for-release / certify / deploy / rollback | NO ROLE holds F | Standing law §1: releases/rollbacks require human authority. RELEASE_CERTIFIER verifies (Class A) but cannot release. **Requiring A never grants F**: the fact that a role can observe and verify a release candidate confers zero authority to promote it. Certification output is a verdict record, not a deployment trigger. |

Notes:
- Classes compose upward only by explicit grant: holding A+B does not imply C. Each class
  is independently gated by the task authority.
- The two planes are separate scopes: a grant names its plane (ORACLE or PIG). A PIG-plane
  Class C grant confers nothing on ORACLE.
- The stale `ping-postgres` (PIG, 5433) and the empty `rc_staging` DB are never valid
  targets; TESTER scratch uses `ping-test-pg` or ephemeral DBs.

---

## 3. ATTRIBUTION — every meaningful action answers eight questions

WHICH MISSION / TASK / ATTEMPT / AGENT ROLE / CAPABILITY / TARGET / AUTHORITY / RESULT.

### 3.1 Receipt format

Every meaningful action (any Class B–F effect, and any Class A access to a production
plane) emits a receipt. Fields:

| Field | Meaning | Example |
|---|---|---|
| `receipt_id` | unique, e.g. `rcpt-<plane>-<unix_ts>-<rand6>` | `rcpt-pig-1727100000-a3f9c1` |
| `mission_id` | durable mission identifier | `m-2026-09-23-014` |
| `task_id` | task within the mission | `t-014-implement-authz` |
| `attempt_id` | attempt counter for the task (idempotency) | `3` |
| `agent_role` | one of the 12 roles | `IMPLEMENTER` |
| `capability` | access class + specific capability used | `C:bounded-build`, `D:worktree-write` |
| `target` | fully qualified target: plane/service/resource/path | `PIG/brain-postgres(ping_runtime):SELECT count(*)` or `PIG/worktrees/m-014/src/auth.ts` |
| `authority` | reference to the durable task authority grant (section 4) + any human gate | `grant g-9f2e… (task authority)` / `human: release-approval-2026-09-23` |
| `effect` | what was done, in verbs | `wrote 3 files`, `ran jest (142 tests)`, `SELECT` |
| `result` | `success` / `failure` / `blocked`, plus evidence pointer | `success; report sha256:<…>` / `blocked: rate-limit (surfaced, no token used)` |
| `ts` | UTC timestamp of completion | `2026-09-23T18:05:11Z` |
| `idempotency_key` | `mission_id:task_id:attempt_id:capability:target-hash` — replays dedupe on this | `m-014:t-014-implement-authz:3:C:9f2c…` |

### 3.2 Where receipts are stored

1. PRIMARY: emitted as events through the gateway's authorized event path into the
   plane's live mission/event store (PIG: `brain-postgres`/`ping_runtime`;
   ORACLE: `crx_runtime`) — the same substrate the `event-to-mission-bridge` already
   writes to. A receipt is an event; it is never a direct table write by the worker.
2. SECONDARY (worker-local): append-only JSONL per role at
   `<workdir>/receipts/<role>-<date>.jsonl`, hash-chained (each line includes the
   sha256 of the previous line) so tampering is detectable.
3. RECONCILER (section 1.12) cross-checks worker-local chains against gateway events;
   a receipt present locally but absent from the gateway (or vice versa) is a
   discrepancy report, not a silent fix.

Read-only actions on production planes (Class A) also emit receipts — "observed"
is an action with a target. Purely local scratch reads need no receipt.

---

## 4. REPLACEMENT SURVIVAL — authority is durable, identity is not

Principle: access derives from the DURABLE TASK AUTHORITY (a stored, scoped,
expiring grant), never from conversational identity, session continuity, or "the
previous worker said so." A replacement worker is a stranger holding a valid grant.

### 4.1 What a replacement worker RECEIVES (and only this)

1. A fresh task-authority grant: `{grant_id, mission_id, task_id, agent_role,
   capability_set (classes + specific capabilities), target_allowlist (plane-qualified),
   not_before, expires_at, max_attempts, issuer, issuer_signature}`. Short-lived
   (hours, not days); single-task scoped.
2. The role's capability definition (section 1) as data — what it may do, not how
   the predecessor did it.
3. The target allowlist (exact planes, services, paths, endpoints).
4. The receipt endpoint and its own `attempt_id` (attempts are numbered; a
   replacement continues the attempt sequence, never reuses an attempt id).
5. Pointer to prior receipts for the task (read-only, for context) — history as
   evidence, not as authority.

### 4.2 What a replacement worker must NOT inherit

- Arbitrary shell state: no inherited shell history, env, cwd assumptions, aliases,
  or background jobs from the predecessor.
- Old secrets in prompts: any credential-looking string in inherited context is
  treated as COMPROMISED — do not use, do not propagate, do not log; request a
  fresh grant if a secret is genuinely required (which, per this matrix, it never
  is for worker roles — secret needs are surfaced blockers).
- Unbounded credentials: no SSH agent forwarding state, no long-lived tokens, no
  "the last worker had access so I do too."
- Another worker's environment: no reused containers/sessions, no shared temp dirs,
  no predecessor's scratch (reads prior RECEIPTS, not prior /tmp).
- Standing sessions: no inherited SSH multiplexing, no persistent docker exec
  sessions, no browser profiles.
- Conversational authority: "keep going," "as discussed," or any chat continuity
  confers zero capability. Only the grant confers capability.

### 4.3 Re-issuance rules

- Grants are issued by the mission runtime under the task authority, never
  worker-to-worker. A worker cannot delegate its grant.
- On suspected compromise (secret seen in logs, unexpected FATAL auth probes like
  the 13 observed against ORACLE `ping-postgres` 2026-09-22), the grant is revoked
  and re-issued; the replacement starts at the next `attempt_id` with no inherited
  state.
- Expiry is enforced by the runtime, not by worker honesty.

---

## 5. SECRET HYGIENE AUDIT (read-only, both planes)

Method (this is the redaction proof): every inspection printed NAMES, flags, counts,
permissions, sizes, or mtimes — never values.
- Container env: `docker exec <c> sh -c 'env' | cut -d= -f1` (values discarded at
  source); secret-ish names flagged by pattern only. Creation-time env via
  `docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}'` likewise
  projected to names.
- Compose/config files: printed only `KEY :: INTERPOLATED|LITERAL-VALUE-IN-FILE`
  (interpolation references like `${POSTGRES_PASSWORD}` are variable names, not
  values). Two pipeline redactions occurred in transit (compose values rendered as
  `<redacted>`); both were treated as redaction events, not data, and re-verified
  with value-free flag classification. A `sed` context dump of the compose
  `postgres` service replaced every value with `[VALUE-REDACTED]` before display.
- Vault logs: `grep -c` counts of `root token` / `unseal key` lines (32/24) — presence
  counts only, values never displayed.
- `.env` files: `cut -d= -f1` key names only; `stat` for perms/mtime; `ls` for
  presence. No `.env` file was `cat`ed.
- `Cmd`/`Entrypoint` inspected for inline secrets (clean on ORACLE gateway).
- One incidental exception, disclosed: `docker inspect ping-vault` prints the
  container's own declared env, which showed `VAULT_DEV_ROOT_TOKEN_ID` set to a
  trivial static dev-mode placeholder. This is not a production secret (dev-mode
  Vault holds nothing real and prints its token in logs by design); it is recorded
  here only to classify the finding honestly.
- What was redacted and how: ALL production values, at the point of collection, by
  projecting to key names before any output; literal-vs-interpolated classification
  without printing the literal; counts instead of matches. No production secret value
  was viewed, stored, copied, or transmitted at any point in this audit.

### 5.1 How secrets currently enter execution

- ORACLE: `/opt/ping/.env` (600, ubuntu-owned, rotated 2026-09-21 11:24Z at deploy)
  supplies `POSTGRES_PASSWORD` (+ non-secret config) into containers at start;
  compose files interpolate (`${POSTGRES_PASSWORD}`) — no literal secrets in compose.
  Gateway started manually with env from the file; containers carry no mounts.
- PIG: containers carry env at creation (no compose labels on `ping-gateway`;
  started manually). `POSTGRES_PASSWORD`, `MUSE_LEVEL_1_KEY`, `MUSE_LEVEL_2_KEY`
  present in gateway env (names only). `ping-vault` runs `-dev` with
  `VAULT_DEV_ROOT_TOKEN_ID` set. `C:\Users\nolan\PING\.env` exists (777).
- SSH access: key auth via `~/.ssh/pig-config` (BatchMode); `oracle-ssh.sh` runs
  scripts on stdin and documents "never pass secrets as arguments." Tailscale
  service RUNNING on the Windows side.

### 5.2 Classification

| Secret / credential | Plane | Classification | Notes |
|---|---|---|---|
| `POSTGRES_PASSWORD` (ORACLE `crx_runtime`, user `ping`) | ORACLE | NEEDED | In 600 `.env`, interpolated into compose, resolved from in-container env at runtime. Handling is sound. |
| `POSTGRES_PASSWORD` (PIG `brain-postgres`/`ping_runtime`, user `postgres`) | PIG | NEEDED | Same pattern. The live DB credential; no evidence of leakage. |
| `POSTGRES_PASSWORD` (PIG stale `ping-postgres`, `ping-test-pg`) | PIG | LEGACY / UNUSED? | Stale copy's DB is not the live DB; test-pg is scratch. Keep scoped; do not reuse these passwords as if they were the live credential. Open question on stale-DB purpose (baseline). |
| `MUSE_LEVEL_1_KEY`, `MUSE_LEVEL_2_KEY` (PIG gateways) | PIG | NEEDED / UNKNOWN_OWNER | Names only in container env. No `BEARER`/`TOKEN` env var exists on either plane's gateway, and `/home/nolan/ping-gateway-src/gateway/.env.muse` (755) holds ACTIVE assignments of exactly these two keys — combined with mission rows showing `originator=api:muse-level-2`, the "ping-gateway Bearer token" referenced in operating notes is very likely `MUSE_LEVEL_2_KEY` used as API auth. Semantics still undocumented: needs an owner, purpose, and rotation story. |
| API auth on ORACLE gateway | ORACLE | UNKNOWN_OWNER | No bearer/token env var found in runtime env or `/opt/ping/.env` key names. Either auth is disabled/open on `127.0.0.1:8080`, or the credential lives inside the image config. Must be determined before any worker touches the ORACLE plane. |
| LITERAL `POSTGRES_PASSWORD` in `/mnt/c/Users/nolan/PING/docker-compose.yml` line 40 (`postgres` service) | PIG | OVERPRIVILEGED | **Strongest concrete hygiene finding.** A hardcoded credential value in a compose file on the Windows filesystem (flag-verified as `LITERAL-VALUE-IN-FILE`; the value itself was redacted in transit and never viewed). Appears to belong to the compose project's postgres (likely the stale `ping-postgres` container on 5433). Fix: move to env-file + `${...}` interpolation like the ORACLE plane does. |
| `/opt/ping/infrastructure/oracle/.env` (identical 10-key set to `/opt/ping/.env`) | ORACLE | DUPLICATED | Same keys, same file role. One canonical env file; the other is drift bait. |
| `/opt/ping/.env.bak-20260921-p0rotate`, `.env.bak-20260917` (600) | ORACLE | LEGACY | Rotation backups; expected to exist briefly, but names don't match mtimes (bak-20260921 dated 2026-09-17; bak-20260917 dated 2026-09-15). Rename-or-remove on a schedule; stale password copies should not accumulate. |
| `/opt/ping/gateway/root_private_key.pem` (664, 122 bytes) | ORACLE | OVERPRIVILEGED | Group/other-readable private key material. Should be 600. (122 bytes suggests a stub, but perms are perms.) |
| `VAULT_DEV_ROOT_TOKEN_ID` + dev-mode root token & unseal key in `ping-vault` logs (32/24 occurrences) | PIG | OVERPRIVILEGED / UNUSED-as-vault | Dev-mode Vault is not a secret store: unsealed by definition, prints its root token at startup, and the root token ID is a trivial static value. Nothing real may be stored in it. Either promote to a real Vault or remove it from the trust story. |
| `C:\Users\nolan\PING\.env` (777) | PIG | OVERPRIVILEGED | World-writable env file. Key-name projection showed only commented template keys (no active assignments), but perms are perms: anything on the box can rewrite it into a live credential file later. Should be 600. |
| `/home/nolan/ping-gateway-src/gateway/.env.muse` (755) | PIG | NEEDED / OVERPRIVILEGED-perms | ACTIVE assignments of `MUSE_LEVEL_1_KEY`, `MUSE_LEVEL_2_KEY` — likely the source of the gateway API auth keys (see above). World-readable/executable perms on a live credential file. Should be 600 and owned by the service user. |
| Broad secret-ish env on `ping-qdrant` (unhealthy, unused): `GITHUB_APP_WEBHOOK_SECRET`, `GOOGLE_TOKEN`, `HF_TOKEN`, `HUGGINGFACE_HUB_TOKEN`, `QDRANT_API_KEY`, `QDRANT__SERVICE__API_KEY`, `GITHUB_APP_PRIVATE_KEY_PATH` | PIG | OVERPRIVILEGED (dormant) | A qdrant container has no use for GitHub webhook secrets or HF tokens — evidence of a shared/broad env injection across the compose `ping` project. Dormant today (container unhealthy, unused), but the pattern means a compromise of any one container's env exposes all of them. Scope env per service. |
| `/home/nolan/worktrees/ping-oracle-deploy/.env`, `.env.local` | PIG | LEGACY | Real `.env` filenames but key-name projection showed template comments only — harmless, but noise that invites real secrets later. Remove or gitignore-acknowledge. |
| `OPENAI_API_KEY`, `WEBUI_SECRET_KEY` (open-webui) | PIG | NEEDED | Auxiliary service (open-webui), scoped to that container. Not in the mission path. |
| Qdrant API keys | both | UNUSED | `brain-qdrant` (live): none configured. ORACLE qdrant: none in env. `ping-qdrant` (unhealthy, unused): 2 key-ish env names — irrelevant until that container matters. No auth on the live vector DBs; acceptable only because both bind loopback (`127.0.0.1`) / internal networks. |
| Unknown prober (13 `FATAL: database "ping" does not exist` / `role "postgres" does not exist`, ORACLE, 2026-09-22 14:02–16:55 UTC) | ORACLE | UNKNOWN_OWNER | Something is probing PG with wrong db/role. Gateway unaffected. Source unknown — worth one OBSERVABILITY_WORKER look, no action beyond that. |

### 5.3 Verdict: REUSE — with the findings above fixed, not a new platform

The current handling (600 `.env` files owned by the service user, `${...}`
interpolation in compose, credentials resolved from in-container env at runtime,
never passed as CLI args, never printed) is sufficient for the worker plane as
designed — because this matrix grants worker roles NO secrets at all (section 1:
every role's SECRET line is "none" except scoped task-authority grants). There is
concrete evidence FOR reuse and no concrete evidence of an active leak:

- No literal secret values in container Cmd/Entrypoint or the ORACLE compose file.
  One literal credential was found in the PIG compose file
  (`/mnt/c/Users/nolan/PING/docker-compose.yml` line 40) — a single-point hygiene
  fix (move to env-file interpolation), not an architectural failure.
- Env files are 600 on ORACLE (the plane that matters most); rotation happened at
  the last deploy (2026-09-21 11:24Z).
- The baseline freeze itself was conducted without recording any value.
- The gaps found (literal password in PIG compose, 664 key, 777 env, dev-mode vault,
  broad env scoping, duplicated env files, unknown bearer semantics) are hygiene and
  ownership problems, not architectural failures — a new secrets platform would add
  machinery without closing any of them, and would itself need the same
  perms/ownership discipline.

Do NOT build a new secrets platform. Instead: move the literal `POSTGRES_PASSWORD`
out of `/mnt/c/Users/nolan/PING/docker-compose.yml` into env-file interpolation,
fix perms (`root_private_key.pem`→600, `PING/.env`→600, `.env.muse`→600), scope env
per service, remove dev-mode Vault from the trust story or promote it, deduplicate
to one canonical `.env` per plane, reconcile backup naming, and document the
bearer-token semantics (open question 1). Credential changes are human-authority
gates (standing law §1) — propose, don't execute.

---

## 6. WHAT THIS PHASE DOES NOT DO (human-authority gates, standing law §1)

No agent under this matrix may: mutate a production database outside
application/migration paths; change any credential; release or roll back;
auto-merge harvested code; spend money; publish externally. Those are Nolan's
calls. This phase also does not: open the ORACLE plane to workers until the API
auth question (open question 1) is answered; grant Class E to any role; or grant
Class F to any role.

---

## 7. OPEN QUESTIONS (could not be determined read-only)

1. **ORACLE gateway API auth semantics.** No bearer/token env var exists in the
   gateway's runtime env or `/opt/ping/.env`. Is `127.0.0.1:8080` on ORACLE
   unauthenticated, or is the credential baked into the image? Workers must not be
   granted ORACLE-plane capabilities until this is answered.
2. **`MUSE_LEVEL_1_KEY` / `MUSE_LEVEL_2_KEY` semantics.** Strong indication
   `MUSE_LEVEL_2_KEY` is the gateway API auth token (`originator=api:muse-level-2`
   in mission rows; no `BEARER` var anywhere; both keys actively assigned in
   `/home/nolan/ping-gateway-src/gateway/.env.muse`). Needs a documented owner,
   purpose, and rotation story.
3. **Literal credential in PIG compose file.** `/mnt/c/Users/nolan/PING/docker-compose.yml`
   line 40 hardcodes `POSTGRES_PASSWORD` for its `postgres` service (presumed to be
   the stale `ping-postgres` container, unconfirmed). Migrate to env-file +
   interpolation; confirm which DB it belongs to.
4. **ORCA_ANALYST charter.** The role's exact domain is undefined; until chartered it
   is read-only (section 1.5). Needs a one-paragraph charter or removal from the
   roster.
5. **Unknown PG prober on ORACLE.** 13 failed-auth log lines 2026-09-22 14:02–16:55
   UTC, wrong db/role. Source unidentified; likely benign misconfiguration, but
   unattributed access attempts against the production DB deserve one look.
6. **Stale PIG `ping-postgres` purpose.** 739 events / 144 missions, not the live DB,
   purpose UNKNOWN (baseline). Until classified, it is not a valid target for any
   role — and its credential must not be confused with the live one.
7. **`/home/nolan/ping-gateway-src/gateway/.env.muse` ownership.** Now known to hold
   the live `MUSE_LEVEL_1/2_KEY` assignments (755 perms). Needs an owner, 600 perms,
   and a documented rotation story; worktree `.env*` files are template-only
   (harmless noise — remove or acknowledge).
8. **RC plane readiness.** `ping-rc-gateway` is unhealthy (qdrant error, empty
   `rc_staging`). RED_TEAMER's synthetic-first rule needs a healthy synthetic
   target — RC is not it today.
9. **No verified backup of live PIG `brain-postgres`/`ping_runtime`.** (Baseline
   §7.) Observability/reconciliation can proceed; any mission that risks the live
   DB needs a backup first — which is itself a human-gated action.
