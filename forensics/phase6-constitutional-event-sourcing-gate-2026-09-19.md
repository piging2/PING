# PHASE 6: ConstitutionalEventSourcing Gate Investigation
Date: 2026-09-19. Investigator: read-only forensic subagent. No source edits, commits, DB writes, restarts, config changes, or secret reads performed.

## 1. DEFINITION (SOURCE_VERIFIED)

Class: `ConstitutionalEventSourcing`
File: `/home/nolan/worktrees/constitutional-convergence/gateway/constitutional_event_sourcing.js` (511 lines, sha256 47c1b70403ff067ea6f3d6cd445c9a24f4511cde556a33a156161af867c40102)
Header: "Ω.95.9 — Event Source Every State Change. Kernel state is reconstructed exclusively from events."
Domain events: MissionCreated, MissionQueued, MissionSelected, ExecutionPlanned, NodeExecuted, ReplayVerified, WitnessVerified, PolicyApproved, CommitCreated, ArtifactStored, MissionArchived.

### Tables written
- `constitutional_events` (columns: event_id, event_data, sequence_number, aggregate_id, event_type, occurred_at). Written by `_persistEvent()` (constitutional_event_sourcing.js ~line 440) with `INSERT ... ON CONFLICT (event_id) DO UPDATE`. Read by `_loadEvents()`, `_getNextSequenceNumber()`, `_getEventsForAggregate()`, `_getLatestEventForAggregate()`.
- `constitutional_snapshots` (columns: aggregate_id, snapshot_data, sequence_number, created_at). Written by `_persistSnapshot()` (~line 460) with `INSERT ... ON CONFLICT (aggregate_id) DO UPDATE`. Read by `_loadSnapshots()`.
- Schema artifacts: NO .sql migration or CREATE TABLE for either table exists anywhere in the worktree (grep across *.sql: zero hits; only JS reference is the class itself). The 1.4MB `pg_dump.sql` (2026-09-18) contains zero mentions of `constitutional_events`, `constitutional_snapshots`, or `bootstrap_manifests`. Corroborated by PHASE_22_ARCHITECTURE_REVIEW.md:757: "ConstitutionalEventSourcing (511 lines) writes to nonexistent table."

### ID minter
`identityAuthority.generateId('event', { type, aggregate_id, timestamp })` (constitutional_event_sourcing.js ~line 108). Resolves through the shim at `ping-runtime/authorities/identity_authority.js` to kernel `runtime/kernel/authorities/identity_authority.js:73` `generateId(type, identityData)`, which serializes `{type:'event', version:'2.0.0', identity_version:'2.0.0', ...identityData}` via CanonicalBytes and returns `event_<16hex>` (first 16 hex chars of the canonical hash). Note: the preimage includes `constitutionalTimeAuthority.now()` (a wall-clock timestamp), so IDs are NOT deterministic across runs.

### Sequence allocator
`_getNextSequenceNumber()` (~line 150): `SELECT COALESCE(MAX(sequence_number), 0) ... FROM constitutional_events`, returns max+1; on ANY DB error it catches, logs, and returns 1. Not atomic (read-then-insert race), no advisory lock.

### In-memory store
Constructor (~line 28): `this._eventStore = new Map()` (event_id -> event) and `this._snapshots = new Map()` (aggregate_id -> snapshot). `emitEvent` writes the Map BEFORE the DB persist, so an emit "succeeds" in memory even when the DB insert fails (the failure is only console.error-logged, never thrown).

## 2. CONFIGURATION (SOURCE_VERIFIED)

- Flag: `enable_event_sourcing`, a key under `bootstrapManifest.runtime_config`.
- DEFAULT: `true`, hardcoded at `gateway/constitutional_bootstrap.js:153` in `_getDefaultBootstrapManifest()` (alongside `enable_capability_graph: true`, `enable_reflection: true`).
- Override mechanism: `_loadBootstrapManifest()` (constitutional_bootstrap.js ~line 104) reads `SELECT manifest_data FROM bootstrap_manifests WHERE active = true LIMIT 1`; a DB row replaces the whole manifest. That table has no schema artifact either (zero hits in pg_dump.sql). There is NO environment variable override: zero `process.env` references in constitutional_bootstrap.js, and no EVENT_SOURCING/CONSTITUTIONAL_EVENT env-style name anywhere in gateway/ or ping-runtime/ JS.
- Runtime evaluation: exactly one site, `gateway/constitutional_bootstrap.js:307`: `if (this._bootstrapManifest.runtime_config.enable_event_sourcing) {` inside `_initializeRuntime()`. The gated block (lines 308-315) constructs the instance, awaits `initialize()`, and records only stats into a local `runtimeComponents` object. The instance is a LOCAL variable: it is never stored on the class, never returned, never exported, never passed anywhere.

### Values per environment
| Environment | Source default | Env override | Evaluated value |
|---|---|---|---|
| Convergence worktree (`/home/nolan/worktrees/constitutional-convergence`) | `true` (:153) | none exists | unreachable (see section 3) |
| `/home/nolan/ping` (feature/approval-effect-identity @ 88c9651be) | `true` (:153), files byte-identical to worktree (diff exit 0) | none | unreachable |
| Pig live container `ping-gateway` (image ping-gateway:devin-boundary2) | `true` (:153 of /app copy; file differs in hash from repo copies but the two gate lines are identical) | env NAMES only: HOME, HOSTNAME, LOG_LEVEL, MUSE_LEVEL_1_KEY, MUSE_LEVEL_2_KEY, NODE_ENV, NODE_VERSION, PATH, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER, QDRANT_HOST, QDRANT_PORT, QDRANT_URL, YARN_VERSION (no event-sourcing var) | unreachable |
| Oracle live stack (compose project "oracle", release bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot) | `true` (:153) | gateway env NAMES: POSTGRES_HOST/PORT/DB/USER/PASSWORD, QDRANT_HOST/PORT/URL, OLLAMA_BASE_URL, LOG_LEVEL, NODE_ENV, HOME, HOSTNAME, NODE_VERSION, PATH, YARN_VERSION (no event-sourcing var) | unreachable |

All env/config values LIVE_VERIFIED (read compose file and live container env names; values never read).

## 3. CALL SITES (REACHABILITY_VERIFIED)

Live entry point in every environment: `gateway/server.js` -> `gateway/bootstrap/gateway_runtime.js` (container entrypoint verified: `[docker-entrypoint.sh] [node gateway/server.js]`).

Method-level call-site inventory for ConstitutionalEventSourcing:

| Method | Call site(s) | Classification |
|---|---|---|
| `new ConstitutionalEventSourcing(...)` | `gateway/constitutional_bootstrap.js:309` (inside the flag branch) | UNREACHABLE: `ConstitutionalBootstrap` is referenced by no other file (string occurs only in its own file plus JSON orchestration indexes; no require chain from server.js). Static require-closure walk from `gateway/server.js` (Node module resolution, 183 JS files) contains zero of: constitutional_event_sourcing.js, constitutional_bootstrap.js, constitutional_automatic_pipeline.js. Same confirmed inside the live Pig container via recursive grep of /app: only constitutional_bootstrap.js itself (plus .md/.json docs) mentions the module; only its own file mentions ConstitutionalBootstrap. Only dynamic require in the gateway tree is `tree-sitter-${language}` (document chunker, unrelated). |
| `.initialize()` | `gateway/constitutional_bootstrap.js:310` | UNREACHABLE (same reason) |
| `.getStatistics()` | `gateway/constitutional_bootstrap.js:313` | UNREACHABLE |
| `.emitEvent(...)` | `gateway/constitutional_automatic_pipeline.js:78` ('MissionSelected') and `:100` ('ExecutionPlanned'); `this._eventSourcing` injected via constructor arg 5 | UNREACHABLE: nothing requires constitutional_automatic_pipeline.js (zero referencing files); the only would-be wiring (passing a live instance) does not exist anywhere |
| `.createSnapshot()`, `.reconstructState()`, `.getEvent()`, `.getEventsForAggregate()` | none | NO CALLERS |
| Other similar-looking `_emitEvent` methods (`runtime/execution_runtime.js:415`, `ping-runtime/business/customer_authority.js:540`, `gateway/reflection_pass.js:201`) and `emitEvent` from `gateway/event_emitter` (used by `gateway/github_ingestion.js`) | separate classes/modules, not ConstitutionalEventSourcing | NOT THIS CLASS |

Net: from the live require closure there are ZERO reachable call sites of any ConstitutionalEventSourcing method in the worktree, the Pig container, or the Oracle snapshot.

## 4. TESTS (SOURCE_VERIFIED)

Zero tests. Grep for `ConstitutionalEventSourcing`, `constitutional_event_sourcing`, `enable_event_sourcing`, `constitutional_events`, and `EventSourcing` across `test/`, `tests/`, and `evals/` returns no files. There is no test asserting enabled behavior, disabled behavior, or the flag default.

## 5. SEMANTICS: the five questions

### IS IT ENABLED?
Nominally YES by source default in every environment (worktree, /home/nolan/ping, Pig container, Oracle snapshot all hardcode `enable_event_sourcing: true`, no env override exists anywhere). Effectively NO everywhere: the only evaluator of the flag (`ConstitutionalBootstrap._initializeRuntime`) is unreachable from every live entry point, verified by static closure walk (REACHABILITY_VERIFIED) and by in-container / in-snapshot greps (LIVE_VERIFIED). No process running today can ever evaluate it. Evidence state: SOURCE_VERIFIED (default) + REACHABILITY_VERIFIED + LIVE_VERIFIED (unreachable).

### WHAT DOES ENABLED CHANGE?
If `ConstitutionalBootstrap.bootstrap()` were invoked with the flag true, `_initializeRuntime()` would: construct one `ConstitutionalEventSourcing` bound to the postgres pool; call `initialize()`, which attempts to load `constitutional_events`/`constitutional_snapshots` into the two in-memory Maps (both tables appear nonexistent, so each load would catch-log an error and continue with empty Maps); record `{initialized: true, event_count}` into a local `runtimeComponents` object. The instance is then DISCARDED (local variable, never stored/exported). No route to `emitEvent` is ever created. Net DB effect of "enabled": none reachable; hypothetically, failed INSERT attempts that are caught and logged, never thrown.

### WHAT DOES DISABLED CHANGE?
The branch is skipped: no instantiation, no initialize(), no stats entry. Given the class is unreachable, enabled and disabled are observationally identical in every running environment: nothing is constructed, nothing is written, no table is touched.

### WHICH EVENT PATH DOES EACH STATE ACTIVATE?
NEITHER state activates any event path. "Enabled" does NOT route canonical events through `constitutional_events` instead of or in addition to `ping_events`: the class has no connection to the live ingestion path. The live gateway path (verified in `gateway/bootstrap/wiring.js:32` and `gateway_runtime.js`) uses `CanonicalEventEnvelope` -> `canonical_events` routes; `UnifiedEventRuntime` -> `ping_events` is the other proven authority. `constitutional_events` is a THIRD, dead journal schema: defined in code, referenced by no live caller, with no table in any schema artifact.

### CAN BOTH PATHS BECOME ACTIVE?
Under current code: NO. There is no configuration (env var, config file, CLI flag) that can make `constitutional_events` receive writes, because (a) the flag lives in a manifest key with no env override, (b) the manifest override requires a `bootstrap_manifests` DB row in a table with no schema artifact, and (c) even with the flag true, no live code path instantiates the class or wires an instance to the pipeline. Hypothetically, if a future change instantiated `ConstitutionalBootstrap` AND wired a `ConstitutionalEventSourcing` instance into `ConstitutionalAutomaticPipeline`, then yes: `constitutional_events` would become a third competing journal alongside `ping_events` and `canonical_events` (with its own racy MAX()+1 sequence allocator and in-memory-first write semantics). That wiring does not exist today.

## BLOCKED / UNKNOWN
- Whether `constitutional_events`, `constitutional_snapshots`, or `bootstrap_manifests` tables exist in any LIVE database: BLOCKED. Answering requires a credential-authenticated DB read; secret values were out of scope. Indirect evidence (pg_dump.sql 2026-09-18 has zero mentions; PHASE_22 review line 757 says the class "writes to nonexistent table"; no CREATE TABLE in any .sql) points to nonexistent, but the live-DB state itself is UNKNOWN.

## Verdict for the convergence program
The ConstitutionalEventSourcing gate is a dead switch. It defaults to true but sits behind an unreachable bootstrap class, has zero tests, targets tables with no schema artifact, and its instance is discarded even on the unreachable path where it is constructed. It is NOT a plausible explanation for the coexistence of the two proven event authorities (UnifiedEventRuntime -> ping_events vs CanonicalEventEnvelope -> canonical_events). Per Nolan's convergence law (one authority per decision, additive/reversible only, no deletion of historical implementations), the correct disposition is to classify it (e.g., PRESERVED_INACTIVE / UNKNOWN pending operator decision) and keep it out of the convergence path. It must not be wired in to "fix" anything, and it must not be deleted without Nolan's word.
