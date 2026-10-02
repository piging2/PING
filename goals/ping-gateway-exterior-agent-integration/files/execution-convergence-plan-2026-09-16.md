# PING Execution Convergence Plan

Date: 2026-09-16
Branch: `constitutional-convergence-v2` @ `d0ad44e28` (repo `/home/nolan/ping`)
Status: design complete, implementation not started. `.HOLD` stays.
New commits: 0. Nothing in this plan touches the dirty primary convergence index.

This plan converts the execution-architecture deep audit (2026-09-16) into an
implementation-ready sequence. Every claim below was re-verified against live
source on 2026-09-16 by four independent read-only verification passes. Where
live evidence contradicted the audit, the live evidence wins and the
contradiction is called out explicitly.

## 1. Verdict: what exists, what is duplicated, what needs wiring

**Exists and is live today:**
- Mission queue: JS `MissionRuntime`/`MissionScheduler` writing `ping_missions`
  on `brain-postgres`/`ping_runtime` (170 rows, writes as of 2026-09-16 06:52 MDT).
- Event log: `UnifiedEventRuntime` writing `ping_events` (872 rows today,
  content-addressed `event_id` PK, no sequence column).
- OS execution: Python `ExecutionAuthority` (72 lines) with the
  `ExecutionAdapter` injection seam. The only implementation that performs real
  OS-level execution.
- Isolated agent container: `ping-agent-base:0.1`, 38/38 contract tests green,
  fail-closed on commits, worktree manifest lifecycle proven.
- Model access: `AIRuntime` provider map with exactly one live provider
  (Ollama). LiteLLM is design-only: the compose service is commented out and
  profile-gated, `litellm-gateway.ts` is unwired reference code, and no
  OmniRoute model router exists in code (`omni_router.js` routes authority
  invocations, not model calls).

**Duplicated (must converge, not multiply):**
- Orca `ExecutionEngine` vs the JS mission spine: Orca builds prompts and
  returns them; it executes nothing. Its autonomous loop fabricates findings
  with hardcoded confidence 0.85 (`engine.js:614-622`). It is boot-disabled by
  explicit contract (`gateway_runtime.js:323-337`, KEEP-DISABLED).
- Two event stores with sequence semantics: `canonical_events` (per-tenant
  `sequence`, live authority callers, broken allocator) and
  `constitutional_events` (global `sequence_number`, broken allocator plus a
  catch block that manufactures duplicates by returning 1).
- Implemented but unwired: `gateway/advisory_lock.js` (266 lines, zero external
  callers) and `gateway/event_outbox.js` (296 lines, zero requires anywhere).

**Needs wiring (no new systems):**
- The advisory lock into the sequence allocator (the fix below).
- Execution identity and events: the Python authority's executions are
  anonymous and in-memory. They need `execution_id`/`run_id`, correlation to
  missions, and start/complete/fail events on the PG spine.
- The container as an `ExecutionAdapter` (one new adapter class implementing
  the existing protocol, not a new authority).
- The 6 Python call sites off direct `ExecutionAuthority()` instantiation onto
  an injected singleton.

## 2. Where the audit was wrong (live evidence wins)

1. **"Gateway command.run/test.run/build.run are NOT_IMPLEMENTED stubs."**
   No tool by those names exists anywhere in the repo (repo-wide grep, zero
   hits). What exists: `gateway/tool_authority.js` registers exactly four
   tools (`file-read`, `file-write`, `code-search`, `artifact-query`), none of
   which executes OS commands. Correct current state: the gateway has no
   OS-command tool at all. Do not carry the stub claim forward.

2. **"Production has only six empty constitutional tables and no mission-queue
   schema."** True only of the `ping-postgres` cluster (port 5433,
   `crx_runtime`: 6 tables, empty except 2 seed rows in `system_metadata`).
   Against the live environment it is contradicted:
   `brain-postgres`/`ping_runtime` has 32 tables including a deployed,
   populated, today-active mission queue (`ping_missions`, 170 rows, latest
   2026-09-16 12:52:44 UTC) and event log (`ping_events`, 872 rows, latest
   today). `ping_missions` has the `lease_until` column: the PG lease design
   the audit called "unverified in prod" is deployed and live.
   Inferred, not observed: which stack component connects to which database.
   P0 verifies gateway targets.

## 3. Authority resolutions

For each: existing implementation, callers, competitors, canonical candidate,
migration path, forbidden new authority.

### 3.1 Mission authority
- Existing: JS `MissionRuntime`/`MissionScheduler`
  (`ping-runtime/orchestration/mission_scheduler.js`: 5s poll, maxConcurrent 3)
  over `ping_missions` with atomic lease claims, renewal/reaping, retries.
  Live today on `brain-postgres`/`ping_runtime`.
- Competitor: Orca `ExecutionEngine` (in-memory `_missions` array, lost on
  restart, boot-disabled by contract).
- Canonical candidate: the JS mission spine. No migration of data needed
  (Orca missions were never durable).
- Forbidden: any new mission store, scheduler, or queue table.

### 3.2 Event authority
- Existing: `UnifiedEventRuntime` over `ping_events` (content-addressed
  `event_id` PK, idempotent inserts, 872 rows today). DDL at
  `ping-runtime/events/unified_event_runtime.js:44-58`. No sequence column.
- Competitors: `canonical_events` (per-tenant sequence, live callers in 6
  authority files, broken allocator) and `constitutional_events` (global
  sequence, broken allocator). Both are repaired, not expanded (P0), and a
  consolidation decision is scheduled for P2.
- Canonical candidate: `UnifiedEventRuntime`/`ping_events`.
- Forbidden: a new event system, bus, or store.

### 3.3 Execution authority
- Existing: Python `ExecutionAuthority` (`runtime/authorities/execution_authority.py`,
  72 lines) with `ExecutionRequest`/`ExecutionAdapter`/`SubprocessExecutionAdapter`.
  The only real OS executor. Six live callers, all through the authority.
- Competitors: none that execute. Orca dispatches prompts, not processes.
  The JS gateway has no OS tool. Dead `gateway/execution_authority.js` and
  `EventRoutingAuthority` are removal candidates (P2, after re-verified
  deadness).
- Canonical candidate: the Python `ExecutionAuthority`.
- Migration: callers move from direct instantiation to an injected singleton
  (P1); the container becomes a `ContainerExecutionAdapter` implementing the
  existing protocol (P1).
- Forbidden: a new execution authority, policy engine, or parallel spine.

### 3.4 Identity authority
- Existing: content-addressed event IDs (`ping_events.event_id` PK),
  deterministic UUID v5 in `CanonicalEventEnvelope` (`:70-94`), `RuntimeID`
  provenance, canonical hashing (audit-identified reusable primitives).
- Canonical candidate: these existing schemes, reused for `run_id` and
  `execution_id` (section 4). No ad hoc UUIDs.
- Forbidden: a new identity service or ID scheme.
- P0 must confirm the exact module path of the canonical-hash/RuntimeID
  implementation before P1 codes against it.

### 3.5 Worktree authority
- Existing: the per-`(agent_id, run_id)` worktree + manifest lifecycle proven
  by the container workstream (manifests at
  `/home/nolan/ping-agents/manifests/`, `create-run.sh`, `RUN_PROCEDURE.md`).
  Ownership currently lives outside the repo.
- Canonical candidate: that existing lifecycle. P2 adds an in-repo pointer
  document; the lifecycle itself does not move or get rewritten.
- Forbidden: a new worktree manager.

### 3.6 Artifact authority
- Existing: Orca's `artifactStore` (prompt artifacts) and the OCI round trip
  verified 2026-09-16 (`ROUND_TRIP_OK`).
- Canonical candidate: the existing artifact store; P1 wires execution
  outputs to it with content hashes.
- Forbidden: a new artifact system.

### 3.7 Model-routing authority
- Existing: `AIRuntime` provider map; exactly one provider registered live
  (`gateway_runtime.js:230`, Ollama at `localhost:11434`).
- Non-existent: LiteLLM deployment (commented out, profile-gated),
  `litellm-gateway.ts` (unwired), OmniRoute model router (does not exist in
  code). `OMNIROUTE_RUNTIME_READINESS.md` verdict: UNVERIFIED.
- Canonical candidate: `AIRuntime`. Do not adopt LiteLLM until a second
  provider is actually needed. Model route (provider + model id) is recorded
  in execution provenance; routing is infrastructure, not a constitutional
  authority.
- Forbidden: a new routing layer or authority.

### 3.8 Evidence / witness authority
- Existing: replay/witness implementations per the audit; caller and
  sovereignty verification was not completed live.
- Canonical candidate: the existing implementations, pending P0 verification
  of who calls them and whether any path bypasses them.
- Forbidden: a new witness or evidence system.

### 3.9 Projection authority
- Existing: projection workers per the audit (`simple_projection_worker.py`
  is test-only; the deployed projection path needs the same P0 caller check).
- Canonical candidate: the existing projection path, pending P0 verification.
- Forbidden: a new projection system.

## 4. The auditable execution unit

Three distinct identities, no new ID authority:

- **Mission**: the durable business/work objective. Identity: existing
  `ping_missions` primary key (`mission_id`).
- **Run**: one isolated agent/container/worktree attempt for a mission.
  Identity: `run_id` = deterministic UUID v5 over
  `(mission_id, agent_id, attempt_no)`, reusing the UUID-v5 scheme already in
  `canonical_event_envelope.js:70-94`. One run maps to one container lifetime
  and one worktree manifest (whose hash is recorded).
- **Execution**: one capability/tool invocation inside a run, i.e. one
  `ExecutionAuthority.execute()` call. Identity: `execution_id` = UUID v5 over
  `(run_id, per-run sequence, canonical request hash)`.

Every execution emits start/complete/fail events to `ping_events` carrying
the full provenance contract:

`execution_id`, `run_id`, `mission_id`, `agent_id`, worktree manifest hash,
container image digest (`ping-agent-base:0.1`), git ref + commit
(host-recorded, section 6), execution host, capability/adapter name, model
route (provider + model), policy version, `correlation_id`/`causation_id`,
`started_at`/`completed_at`/`emitted_at`, input hash, output hash, artifact
hashes.

Run/execution records persist to the existing `mission_executions` table
(deployed, 0 rows) rather than any new table.

## 5. Event-sequence race: the fix

Two live instances, one design. No new sequencing authority: the fix wires
the existing, implemented, unwired `gateway/advisory_lock.js` into the two
allocators.

### 5.1 `canonical_events` (per-tenant sequence)
File: `gateway/canonical_event_envelope.js`.
- Allocator `:100-107` does unlocked `SELECT COALESCE(MAX(sequence),0)+1`
  per tenant. Insert `:172-186` uses `ON CONFLICT (tenant_id, sequence)
  DO NOTHING` with no `rowCount` check and returns the event as if persisted.
  The deterministic UUID v5 (`:70-94`) means the loser's distinct payload is
  irrecoverably discarded. Live callers: `routes/canonical_events.js:29`,
  `review_authority.js:78`, `project_authority.js` (x3),
  `customer_authority.js:541`, `ai_workspace_authority.js:88`,
  `business_profile.js` (x2).
- Fix inside `executeEmitEvent`: open one transaction; acquire the existing
  advisory lock keyed by tenant (`pg_advisory_xact_lock(hashtext(
  'canonical_events:' || tenant_id))`, via `AdvisoryLock`/`LockManager` from
  `gateway/advisory_lock.js`, falling back to raw SQL only if its API does
  not fit a transaction client); allocate `MAX(sequence)+1` inside the same
  transaction; `INSERT`; assert `rowCount === 1`; on zero rows or conflict,
  throw a typed `SequenceConflictError` (retryable), never return success.
  Keep `ON CONFLICT DO NOTHING` only as a backstop that feeds the typed
  error, never as the silent path.

### 5.2 `constitutional_events` (global sequence)
File: `gateway/constitutional_event_sourcing.js:141-152`.
- Same unlocked `MAX(sequence_number)+1`, and the catch block returns `1`,
  actively manufacturing duplicates.
- Fix: same advisory-lock treatment with a global lock key; delete the
  catch-returns-1 path (failure to allocate is a typed error, never
  sequence 1).

## 6. Git commit/ref authority: decision

Options evaluated on provenance, rollback, isolation, replay, autonomy,
failure recovery, and implementation complexity:

1. **Container mutates the worktree; host authority performs all commit/ref
   operations.** Provenance is clean (the host signs with its identity);
   rollback is a host worktree reset; the container keeps its proven
   no-credential posture (committing needs identity material the boundary
   currently denies); replay records manifest hash + commit as canonical
   events; failure recovery never strands a half-committed ref inside a
   disposable container; implementation complexity is zero (nothing changes
   in the container).
2. Tightly scoped ref-write capability in the container: violates the proven
   boundary, needs credential/identity injection, complicates teardown.
3. No existing in-repo model owns Git mutation; the lifecycle lives outside
   the repo (`/home/nolan/ping-agents`).

**Decision: option 1.** The container's commit denial stays exactly as
proven. The host performs commit/ref operations and emits canonical commit
events. No new Git authority is created. P1 ratifies this in the run
procedure; P2 adds the in-repo pointer doc.

## 7. Direct OS paths: classification (31 sites, live-verified)

- **Must migrate behind the ExecutionAuthority: 2.**
  `ping-runtime/orchestration/intelligence_graph.js:294`
  (`execSync('git log ...')`) and `merge_gate.js:114`
  (`execSync('git diff --name-only HEAD')`). Both fire only from Orca's
  `engine.initialize()`, which is disabled by the KEEP-DISABLED contract, so
  they are contained today. P1 deletes or gates them with the Orca executor
  path; if Orca is ever re-enabled they go through the authority.
- **Intentionally exempt infrastructure: 4.** The sanctioned WSL
  execution-boundary transport: `tools/wsl_launcher.py:74,83`,
  `tools/execution/client.py:88,102`, `tools/execution/runner.py:127`
  (the runner's `Popen` is the endpoint itself), plus `gateway/start_bg.js`
  (human-run dev-ops launcher). These are the transport, not bypasses.
- **Dead/legacy: 2+.** `tools/project_resolver.py`,
  `context_pack_builder.py`, `archive/`, unrequired
  `gateway/best_in_class_integration.js`. P2 removal after re-verified
  deadness.
- **Test-only: 23.** Including all 6 `shell=True` sites; none reachable from
  production entry points.
- **Authority hygiene (live):** no Python caller passes `env=` or `cwd=`;
  `SubprocessExecutionAdapter` receives `env=None`, so every child inherits
  the full parent environment (secrets included). P1 sets an explicit env
  policy (recommendation: sanitized explicit env). `projection_replay.py:86`
  runs an unbounded `docker exec psql` with no timeout (P0). `supervisor.py:29`
  calls the authority with no try/except; a timeout crashes the caller (P0).

## 8. Target-shape mapping

Nolan's target shape, annotated:

- Desktop Agent: exists (entry point). No change.
- Orca: exists as prompt-builder. Convergence: coordination/API facade, never
  execution authority. KEEP-DISABLED stays; fabricated loop removed (P1).
- PING Mission/Event spine: exists and live (`ping_missions` +
  `ping_events` on `brain-postgres`/`ping_runtime`). Needs the P0 sequence
  fixes and P1 execution events.
- Execution Authority: exists (Python, 72 lines). Needs identity, events,
  singleton injection, env policy.
- Isolated agent container/worktree: exists and proven. Needs the
  `ContainerExecutionAdapter` (P1).
- Model access: `AIRuntime` + Ollama exists. LiteLLM/OmniRoute do not exist
  as deployed infrastructure; no new layer.
- Result/artifact: needs P1 wiring to the existing artifact store.
- Canonical evidence/event: `ping_events` exists; needs execution event
  emission (P1).
- Witness: exists; P0 verifies callers.
- Projection: exists; P0 verifies callers.

## 9. Implementation sequence

### P0: correctness, no behavior migration
1. `gateway/canonical_event_envelope.js`: advisory-lock sequence allocation
   + `rowCount === 1` assertion + typed `SequenceConflictError` (section 5.1).
2. `gateway/constitutional_event_sourcing.js:141-152`: same treatment;
   delete catch-returns-1 (section 5.2).
3. `projection_replay.py:86`: add a timeout to the unbounded `docker exec`.
4. `runtime/supervisor.py:26-29`: typed try/except around the authority call
   (timeout becomes a typed failure event, not a crash).
5. Read-only verification: witness/projection callers + sovereignty; confirm
   the canonical-hash/RuntimeID module path; confirm which components target
   which database (gateway PG targets).
6. Tests: concurrent-emitter sequence test (N parallel same-tenant emitters
   give N rows, strictly increasing sequences, zero drops); conflict-injection
   test asserting a typed error and never a silent success; existing suite
   from the clean smoke worktree.

### P1: convergence wiring
7. New `ContainerExecutionAdapter` implementing the existing
   `ExecutionAdapter` protocol: spawns `ping-agent-base:0.1` with the
   worktree manifest, enforces the proven boundary (no commits, teardown),
   returns outputs + hashes. Registered as the adapter for agent-run
   executions. No new authority.
8. `execution_id`/`run_id` issuance (section 4); every
   `ExecutionAuthority.execute()` emits start/complete/fail events to
   `ping_events` with the provenance contract; records persist to the
   existing `mission_executions` table.
9. Singleton injection: module-level `get_execution_authority()`; migrate
   the 6 Python call sites off direct `ExecutionAuthority()`; direct
   instantiation deprecated.
10. Env policy: sanitized explicit env as the adapter default (recommendation);
    documented, tested.
11. Orca: remove the fabricated-output loop (`engine.js:614-622`); keep
    prompt-building; KEEP-DISABLED contract stays until an explicit
    convergence decision. Gate or remove the two `execSync` paths (section 7).
12. Wire execution outputs to the existing artifact store with content hashes;
    ratify host-owned git commits in the run procedure (section 6).
13. Tests: adapter contract tests reusing the 38/38 container suite;
    singleton test; event-chain query test
    (mission -> run -> execution -> result via `correlation_id`); env
    policy test; provenance completeness test.

### P2: consolidation
14. `canonical_events` vs `ping_events` consolidation decision
    (recommendation: deprecate `canonical_events` into namespaced
    `ping_events`; migrate the 6 authority callers). Needs Nolan's word.
15. Dead-code removal after re-verified deadness: `gateway/execution_authority.js`,
    `EventRoutingAuthority`, `best_in_class_integration.js`,
    `context_pack_builder.py`, `project_resolver.py`.
16. Second model provider on `AIRuntime` only when a real need appears;
    LiteLLM stays design-only.
17. In-repo pointer doc for the worktree lifecycle; open question whether the
    `ping-postgres` 6-table cluster has any future role or is legacy.

## 11. Grill session: open questions (2026-09-16)

Binding decisions are recorded above. These questions must be answered before
or during implementation; they are blockers, contradictions, or gaps found
by grilling the decisions and this plan.

### Blockers (close before P1)
1. JS to Python call boundary is unspecified. Options: localhost HTTP sidecar
   with bearer auth (recommended), NATS, stdio bridge, or promoting the
   tools/execution scp+ssh transport (not recommended: bakes an operator
   bypass into the architecture). The authority currently has zero
   authentication; the chosen channel must define the trust boundary.
2. Identify the current writer of ping_missions/ping_events (writes today
   06:52 MDT, source mission-runtime) before building on the spine. If it is
   a legacy loop, the "live spine" may be legacy traffic.
3. Capability policy has no source. Locate PolicyEngine/require_capability
   (file:line; the plan cited it without one), and define who authors policy,
   where it is stored, and how it is versioned.

### Per-decision questions
4. attempt_no must be allocated atomically inside the lease-claim transaction,
   or two runs collide on one deterministic run_id and silently merge
   provenance.
5. Retry semantics: new Run with incremented attempt_no (recommended) or
   resumed Run? Clean worktree or copy-on-retry for the new Run?
6. Per-execution terminal states when one execution's persistence fails;
   Run rolls up to UNKNOWN (recommended).
7. The no-bypass rule vs tools/execution/client.py CLI: explicit operator
   exception or gate the CLI?
8. 5s poll / maxConcurrent 3 for interactive desktop-agent use: full ceremony
   with 5s dispatch latency, or a synchronous submit path?
9. Lease duration vs multi-hour runs; scheduler restart mid-run must not
   produce a duplicate run.
10. Worktree GC: retention policy and reaper needed in P1, or disk fills.
11. Worktree lifecycle lives outside the repo, unversioned. Move in-repo or
    vendor and pin it.
12. Reconciler for UNKNOWN runs is not in the plan. Recommended: wire the
    unwired EventOutbox as the persistence buffer; the relay drains it and
    undrained entries are the UNKNOWN set. Also need heartbeat/TTL to
    distinguish still-running from persistence-failed.
13. Container to AIRuntime channel: per-run network capability or host-proxied
    model calls (recommended: proxied; keys never enter the container)?
    Resolve the localhost:11434 scoping question through this answer.
14. Provider key storage for provider #2: host-side secret store referenced
    by capability grant; never in mission spec or container.
15. Mission-spec schema change to declare required network capabilities
    up front.
16. Egress proxy for domain-allowlist enforcement (docker --network none
    cannot enforce domains; proxy must do DNS itself). In scope for P1?
17. Keep the ExecutionAdapter interface cloud-agnostic now (no Docker-isms
    in ExecutionRequest) so the future Fly adapter does not inherit them.
18. Verify Pig GPU hardware + NVIDIA runtime in P0 (is A2000 real?);
    resource-aware scheduling note for GPU contention in P1.
19. State explicitly: replay is a fold over the event log, never
    re-execution. Add a P1 replay verification test (rebuild projection
    from ping_events, compare hashes).
20. Name the capability-gate trust boundary (where untrusted agent input
    crosses into the authority). Note event-volume implication of a recorded
    policy decision per execution.
21. Classify the 6 canonical_events callers (live vs legacy) in P0 before
    the P2 migration.
22. Sanitized env: define the legitimate secret path (capability-scoped
    secret injection, P1) and audit per-caller env requirements so
    sanitizing does not break tool_router's tools.
23. Check what connects to the ping-postgres 6-table cluster today.

### Contradictions to resolve
24. No-bypass rule vs WSL transport CLI (see 7).
25. Default-deny network vs container to AIRuntime arrow (see 13).
26. Clarify: Orca submits missions through the mission API (single entry
    point regardless of caller); it is not in the execution path.
27. State explicitly: adapter implementations are in the trusted computing
    base. An adapter can ignore capability context and the authority cannot
    verify it; the invariant "adapters may multiply" holds only under review.

### Plan gaps (confessed)
28. No reconciler component for UNKNOWN (see 12).
29. No Python to PG event-emission path defined.
30. mission_executions reuse assumes schema fit; verify in P0.
31. No authentication on the authority invocation boundary (see 1).
32. .HOLD removal needs an explicit acceptance gate (recommended: 38/38
    container tests + adapter tests + concurrency test + boundary tests
    green, then Nolan removes .HOLD).
